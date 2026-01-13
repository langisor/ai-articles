# TanStack Query Architecture Guide for Next.js 14+ App Router

I'll provide a comprehensive, production-ready architecture for TanStack Query in Next.js App Router applications.

## Table of Contents

1. [Project Structure](#project-structure)
2. [Query Client Setup & Provider](#query-client-setup)
3. [Query Key Factory Pattern](#query-key-factory)
4. [Server-Side Prefetching & Hydration](#hydration-pattern)
5. [Custom Hook Architecture](#custom-hooks)
6. [Optimistic UI with Mutations](#optimistic-ui)
7. [Infinite Scrolling](#infinite-scrolling)
8. [Prefetched Pagination](#prefetched-pagination)
9. [Error Handling & Resilience](#error-handling)
10. [Cache Management & Logout](#cache-management)

---

## 1. Project Structure

```
src/
├── app/
│   ├── providers.tsx              # Client-side providers
│   ├── layout.tsx                 # Root layout with providers
│   ├── error.tsx                  # Global error boundary
│   └── dashboard/
│       ├── page.tsx               # Server component (prefetch here)
│       └── error.tsx              # Route-specific error boundary
├── lib/
│   ├── query-client.ts            # Query client configuration
│   └── api.ts                     # API client (fetch wrapper)
├── hooks/
│   ├── queries/
│   │   ├── use-posts.ts           # Post-related queries
│   │   └── use-users.ts           # User-related queries
│   ├── mutations/
│   │   ├── use-create-post.ts     # Post mutations
│   │   └── use-update-user.ts     # User mutations
│   └── query-keys.ts              # Query key factory
└── components/
    └── ui/                        # Shadcn components
```

---

## 2. Query Client Setup & Provider

### Why This Approach?

- **Singleton Pattern**: We create the query client once to avoid state duplication
- **Server-Safe**: Uses `isServer` check to prevent memory leaks in SSR
- **Optimized Defaults**: Pre-configured for resilience (staleTime, retries, refetchOnWindowFocus)

```typescript
// src/lib/query-client.ts
import { QueryClient, defaultShouldDehydrateQuery } from '@tanstack/react-query'

const isServer = typeof window === 'undefined'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000, // 5 minutes (previously cacheTime)
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 1,
      },
      dehydrate: {
        // Include pending queries in dehydration (for server prefetching)
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === 'pending',
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined = undefined

export function getQueryClient() {
  if (isServer) {
    // Server: always make a new query client
    return makeQueryClient()
  } else {
    // Browser: make a new query client if we don't already have one
    // This is very important, so we don't re-make a new client if React
    // suspends during the initial render
    if (!browserQueryClient) browserQueryClient = makeQueryClient()
    return browserQueryClient
  }
}
```

### Why These Defaults?

- **staleTime: 60s**: Prevents immediate refetch on mount (reduces server load)
- **gcTime: 5min**: Keeps unused data in memory longer for back-button navigation
- **Exponential Backoff**: `retryDelay` prevents hammering failed endpoints
- **dehydrate config**: Ensures server-prefetched data transfers to client

---

### Provider Setup

```typescript
// src/app/providers.tsx
'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { getQueryClient } from '@/lib/query-client'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  // We use useState to ensure the client is created once per component mount
  // This prevents client recreation on re-renders
  const [queryClient] = useState(() => getQueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}
```

```typescript
// src/app/layout.tsx
import { Providers } from './providers'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

### Why useState for QueryClient?

- Prevents recreation on hot-reload in development
- Ensures stable client reference across re-renders
- Critical for maintaining cache integrity

---

## 3. Query Key Factory Pattern

### Why Query Keys Matter

- **Cache Invalidation**: Hierarchical keys enable fuzzy matching (`['posts']` invalidates all post queries)
- **Type Safety**: Centralized keys prevent typos
- **Predictable Debugging**: See all keys in DevTools

```typescript
// src/hooks/query-keys.ts
export const queryKeys = {
  // Posts
  posts: {
    all: ['posts'] as const,
    lists: () => [...queryKeys.posts.all, 'list'] as const,
    list: (filters: string) => [...queryKeys.posts.lists(), { filters }] as const,
    details: () => [...queryKeys.posts.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.posts.details(), id] as const,
  },

  // Users
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters: string) => [...queryKeys.users.lists(), { filters }] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
  },

  // Infinite queries
  infinite: {
    posts: (filters?: string) => [...queryKeys.posts.lists(), 'infinite', filters] as const,
  },
} as const

// Type helpers
export type QueryKeys = typeof queryKeys
```

### Key Hierarchy Example

```
['posts']                          // Invalidates ALL post queries
['posts', 'list']                  // Invalidates all post lists
['posts', 'list', { filters }]     // Invalidates specific filtered list
['posts', 'detail', '123']         // Invalidates only post 123
```

---

## 4. Server-Side Prefetching & Hydration

### Why This Pattern?

- **Zero Waterfalls**: Data fetches in parallel on server
- **Instant UI**: Client sees data immediately (no spinners)
- **SEO-Friendly**: HTML contains actual data

```typescript
// src/app/dashboard/page.tsx (Server Component)
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { getQueryClient } from '@/lib/query-client'
import { queryKeys } from '@/hooks/query-keys'
import { PostsList } from './posts-list'

async function getPosts() {
  const res = await fetch('https://api.example.com/posts', {
    // Next.js specific caching
    next: { revalidate: 60 },
  })
  if (!res.ok) throw new Error('Failed to fetch posts')
  return res.json()
}

export default async function DashboardPage() {
  const queryClient = getQueryClient()

  // Prefetch multiple queries in parallel
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.posts.lists(),
      queryFn: getPosts,
    }),
    // Add more prefetches here
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PostsList />
    </HydrationBoundary>
  )
}
```

### Why HydrationBoundary?

- **Serializes Cache**: Transfers server cache → client
- **Prevents Double-Fetch**: Client reuses server data
- **Granular Hydration**: Can wrap specific parts of tree

---

## 5. Custom Hook Architecture

### Why Custom Hooks?

- **Reusability**: DRY principle for queries
- **Co-location**: Business logic stays with data needs
- **Type Safety**: Generic return types

```typescript
// src/hooks/queries/use-posts.ts
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { queryKeys } from '../query-keys'

interface Post {
  id: string
  title: string
  body: string
  userId: string
}

async function fetchPosts(): Promise<Post[]> {
  const res = await fetch('https://api.example.com/posts')
  if (!res.ok) throw new Error('Failed to fetch posts')
  return res.json()
}

async function fetchPost(id: string): Promise<Post> {
  const res = await fetch(`https://api.example.com/posts/${id}`)
  if (!res.ok) throw new Error('Failed to fetch post')
  return res.json()
}

// List hook with options
export function usePosts(filters?: string) {
  return useQuery({
    queryKey: queryKeys.posts.list(filters || ''),
    queryFn: () => fetchPosts(),
    // Override defaults if needed
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Detail hook with Suspense support
export function usePost(id: string, options?: { suspense?: boolean }) {
  const queryFn = () => fetchPost(id)
  const queryKey = queryKeys.posts.detail(id)

  if (options?.suspense) {
    return useSuspenseQuery({ queryKey, queryFn })
  }

  return useQuery({
    queryKey,
    queryFn,
    enabled: !!id, // Don't run if no ID
  })
}
```

### Client Component Usage

```typescript
// src/app/dashboard/posts-list.tsx
'use client'

import { usePosts } from '@/hooks/queries/use-posts'

export function PostsList() {
  const { data, isLoading, error } = usePosts()

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <ul className="space-y-4">
      {data?.map((post) => (
        <li key={post.id} className="border p-4 rounded-lg">
          <h3 className="font-bold">{post.title}</h3>
          <p className="text-gray-600">{post.body}</p>
        </li>
      ))}
    </ul>
  )
}
```

---

## 6. Optimistic UI with Mutations

### Why Optimistic Updates?

- **Perceived Performance**: UI responds instantly
- **Better UX**: No waiting for server roundtrip
- **Automatic Rollback**: TanStack Query handles errors

```typescript
// src/hooks/mutations/use-create-post.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../query-keys'

interface CreatePostData {
  title: string
  body: string
  userId: string
}

interface Post extends CreatePostData {
  id: string
}

async function createPost(data: CreatePostData): Promise<Post> {
  const res = await fetch('https://api.example.com/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create post')
  return res.json()
}

export function useCreatePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createPost,

    // Optimistic update BEFORE server responds
    onMutate: async (newPost) => {
      // Cancel outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: queryKeys.posts.lists() })

      // Snapshot the previous value
      const previousPosts = queryClient.getQueryData<Post[]>(queryKeys.posts.lists())

      // Optimistically update to the new value
      queryClient.setQueryData<Post[]>(queryKeys.posts.lists(), (old = []) => [
        { ...newPost, id: 'temp-id-' + Date.now() }, // Temporary ID
        ...old,
      ])

      // Return context object with the snapshotted value
      return { previousPosts }
    },

    // If mutation fails, use the context returned from onMutate to roll back
    onError: (err, newPost, context) => {
      queryClient.setQueryData(queryKeys.posts.lists(), context?.previousPosts)
      console.error('Mutation error:', err)
    },

    // Always refetch after error or success (background sync)
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.lists() })
    },
  })
}
```

### Usage in Component

```typescript
// src/components/create-post-form.tsx
'use client'

import { useCreatePost } from '@/hooks/mutations/use-create-post'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

export function CreatePostForm() {
  const createPost = useCreatePost()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    createPost.mutate(
      {
        title: formData.get('title') as string,
        body: formData.get('body') as string,
        userId: '1',
      },
      {
        onSuccess: () => {
          toast.success('Post created!')
          e.currentTarget.reset()
        },
        onError: (error) => {
          toast.error(error.message)
        },
      }
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input name="title" placeholder="Post title" required />
      <Textarea name="body" placeholder="Post content" required />
      <Button type="submit" disabled={createPost.isPending}>
        {createPost.isPending ? 'Creating...' : 'Create Post'}
      </Button>
    </form>
  )
}
```

### Why onMutate/onError/onSettled?

- **onMutate**: Update UI immediately, return rollback context
- **onError**: Restore previous state if server rejects
- **onSettled**: Sync with server truth regardless of outcome

---

## 7. Infinite Scrolling

### Why useInfiniteQuery?

- **Automatic Pagination**: Tracks pages internally
- **Smart Caching**: Each page cached separately
- **Bi-directional**: Can load previous pages too

```typescript
// src/hooks/queries/use-infinite-posts.ts
import { useInfiniteQuery } from '@tanstack/react-query'
import { queryKeys } from '../query-keys'

interface PostsResponse {
  posts: Post[]
  nextCursor?: string
  hasMore: boolean
}

async function fetchInfinitePosts({ pageParam }: { pageParam?: string }): Promise<PostsResponse> {
  const url = new URL('https://api.example.com/posts')
  if (pageParam) url.searchParams.set('cursor', pageParam)

  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch posts')
  return res.json()
}

export function useInfinitePosts(filters?: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.infinite.posts(filters),
    queryFn: fetchInfinitePosts,
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    getPreviousPageParam: (firstPage) => undefined, // If you support backward pagination
  })
}
```

### Component with IntersectionObserver

```typescript
// src/components/infinite-posts-list.tsx
'use client'

import { useInfinitePosts } from '@/hooks/queries/use-infinite-posts'
import { useInView } from 'react-intersection-observer'
import { useEffect } from 'react'

export function InfinitePostsList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfinitePosts()

  const { ref, inView } = useInView({
    threshold: 0,
    triggerOnce: false,
  })

  // Auto-fetch when sentinel comes into view
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  if (isLoading) return <div>Loading initial posts...</div>

  return (
    <div className="space-y-4">
      {data?.pages.map((page, pageIndex) => (
        <div key={pageIndex}>
          {page.posts.map((post) => (
            <article key={post.id} className="border p-4 rounded-lg mb-4">
              <h3 className="font-bold">{post.title}</h3>
              <p className="text-gray-600">{post.body}</p>
            </article>
          ))}
        </div>
      ))}

      {/* Intersection observer sentinel */}
      <div ref={ref} className="h-20 flex items-center justify-center">
        {isFetchingNextPage && <span>Loading more...</span>}
        {!hasNextPage && <span className="text-gray-400">No more posts</span>}
      </div>
    </div>
  )
}
```

### Why IntersectionObserver?

- **Performance**: Native browser API (no scroll listeners)
- **Battery-Friendly**: Only checks when element visible
- **Configurable**: `threshold` controls trigger point

---

## 8. Prefetched Pagination

### Why Prefetch?

- **Zero Spinner**: Next page already in cache
- **Hover Intent**: User sees instant navigation

```typescript
// src/hooks/queries/use-paginated-posts.ts
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../query-keys'

interface PaginatedResponse {
  posts: Post[]
  total: number
  page: number
  pageSize: number
}

async function fetchPaginatedPosts(page: number): Promise<PaginatedResponse> {
  const res = await fetch(`https://api.example.com/posts?page=${page}&limit=10`)
  if (!res.ok) throw new Error('Failed to fetch posts')
  return res.json()
}

export function usePaginatedPosts(page: number) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: [...queryKeys.posts.lists(), 'paginated', page],
    queryFn: () => fetchPaginatedPosts(page),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Prefetch next page
  const prefetchNextPage = () => {
    queryClient.prefetchQuery({
      queryKey: [...queryKeys.posts.lists(), 'paginated', page + 1],
      queryFn: () => fetchPaginatedPosts(page + 1),
    })
  }

  return {
    ...query,
    prefetchNextPage,
  }
}
```

### Component Implementation

```typescript
// src/components/paginated-posts.tsx
'use client'

import { usePaginatedPosts } from '@/hooks/queries/use-paginated-posts'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

export function PaginatedPosts() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isPlaceholderData, prefetchNextPage } = usePaginatedPosts(page)

  const hasMore = data ? page * data.pageSize < data.total : false

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <>
          <div className="grid gap-4">
            {data?.posts.map((post) => (
              <article key={post.id} className="border p-4 rounded-lg">
                <h3 className="font-bold">{post.title}</h3>
                <p className="text-gray-600">{post.body}</p>
              </article>
            ))}
          </div>

          <div className="flex gap-2 justify-between items-center">
            <Button
              onClick={() => setPage((old) => Math.max(old - 1, 1))}
              disabled={page === 1}
            >
              Previous
            </Button>

            <span className="text-sm text-gray-600">
              Page {page} of {Math.ceil((data?.total || 0) / (data?.pageSize || 1))}
            </span>

            <Button
              onClick={() => {
                if (!isPlaceholderData && hasMore) {
                  setPage((old) => old + 1)
                }
              }}
              onMouseEnter={prefetchNextPage} // Prefetch on hover!
              disabled={isPlaceholderData || !hasMore}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
```

### Why isPlaceholderData?

- Prevents rapid clicking while fetching
- Shows old data until new data arrives
- Smooth transition between pages

---

## 9. Error Handling & Resilience

### Global Error Boundary

```typescript
// src/app/error.tsx
'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to error reporting service (Sentry, etc.)
    console.error('Global error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">Something went wrong!</h2>
        <p className="text-gray-600">{error.message}</p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  )
}
```

### Query-Level Error Handling

```typescript
// src/hooks/queries/use-posts.ts (Enhanced)
export function usePosts(filters?: string) {
  return useQuery({
    queryKey: queryKeys.posts.list(filters || ''),
    queryFn: fetchPosts,
    retry: (failureCount, error) => {
      // Don't retry on 404s
      if (error instanceof Error && error.message.includes('404')) {
        return false
      }
      return failureCount < 3
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    throwOnError: false, // Prevent error from bubbling to Error Boundary
  })
}
```

### Why Separate Error Strategies?

- **Error Boundaries**: Catch catastrophic failures (network down, 500s)
- **Query-Level**: Handle expected failures (404, validation errors)
- **Retry Logic**: Distinguish transient vs permanent failures

---

## 10. Cache Management & Logout

### Why Clear Cache on Logout?

- **Security**: Remove user-specific data
- **Privacy**: Don't leak data to next user
- **Clean State**: Prevent auth errors

```typescript
// src/hooks/use-logout.ts
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'

export function useLogout() {
  const queryClient = useQueryClient()
  const router = useRouter()

  const logout = async () => {
    try {
      // Call logout endpoint
      await fetch('/api/auth/logout', { method: 'POST' })

      // Clear ALL cached queries
      queryClient.clear()

      // Or selectively clear user-specific data
      // queryClient.removeQueries({ queryKey: ['user'] })
      // queryClient.removeQueries({ queryKey: ['posts'] })

      // Reset to default state
      queryClient.setQueryDefaults(queryKeys.users.all, {
        staleTime: Infinity,
      })

      // Redirect to login
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return { logout }
}
```

### Selective Cache Clearing

```typescript
// Clear specific patterns
queryClient.removeQueries({ queryKey: ['user'] }) // All user queries
queryClient.removeQueries({ queryKey: queryKeys.posts.lists() }) // All post lists
queryClient.removeQueries({ predicate: (query) => query.isStale() }) // Only stale queries

// Invalidate without removing (triggers refetch)
queryClient.invalidateQueries({ queryKey: ['posts'] })
```

### Why queryClient.clear() vs removeQueries()?

- **clear()**: Nuclear option, wipes everything (use on logout)
- **removeQueries()**: Surgical, keeps unrelated data (use on role change)

---

## Advanced Patterns

### 1. Dependent Queries

```typescript
export function usePostWithAuthor(postId: string) {
  const postQuery = usePost(postId)

  const authorQuery = useQuery({
    queryKey: queryKeys.users.detail(postQuery.data?.userId || ''),
    queryFn: () => fetchUser(postQuery.data!.userId),
    enabled: !!postQuery.data?.userId, // Only run when post loads
  })

  return {
    post: postQuery.data,
    author: authorQuery.data,
    isLoading: postQuery.isLoading || authorQuery.isLoading,
  }
}
```

### 2. Query Cancellation

```typescript
async function fetchPostsWithAbort(signal: AbortSignal): Promise<Post[]> {
  const res = await fetch('https://api.example.com/posts', { signal })
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

export function usePosts() {
  return useQuery({
    queryKey: queryKeys.posts.lists(),
    queryFn: ({ signal }) => fetchPostsWithAbort(signal),
  })
}
```

### 3. Parallel Queries

```typescript
export function useDashboardData() {
  const posts = usePosts()
  const users = useUsers()
  const analytics = useAnalytics()

  return {
    isLoading: posts.isLoading || users.isLoading || analytics.isLoading,
    data: {
      posts: posts.data,
      users: users.data,
      analytics: analytics.data,
    },
  }
}

// Or with Promise.all in Server Component
await Promise.all([
  queryClient.prefetchQuery({ queryKey: queryKeys.posts.lists(), queryFn: fetchPosts }),
  queryClient.prefetchQuery({ queryKey: queryKeys.users.lists(), queryFn: fetchUsers }),
])
```

---

## Performance Tips

1. **Use Suspense for Critical Routes**

   ```typescript
   export function PostDetail({ id }: { id: string }) {
     const { data } = usePost(id, { suspense: true })
     return <div>{data.title}</div> // No loading state needed!
   }
   ```

2. **Implement Request Deduplication**

   - TanStack Query automatically dedupes identical requests
   - Multiple components can call `usePosts()` → only 1 network request

3. **Optimize Refetch Strategies**

   ```typescript
   // Don't refetch on every window focus for static data
   useQuery({
     queryKey: ['static-config'],
     queryFn: fetchConfig,
     staleTime: Infinity,
     refetchOnWindowFocus: false,
   })
   ```

4. **Use `select` for Derived Data**
   ```typescript
   const publishedPosts = usePosts({
     select: (data) => data.filter(post => post.published),
   })
   ```

---

## Debugging Checklist

1. **DevTools**: Always have React Query DevTools open in dev
2. **Query Key Mismatches**: Ensure server/client keys identical
3. **Hydration Errors**: Check `dehydrate()` includes your query
4. **Stale Data**: Verify `staleTime` vs `gcTime` settings
5. **Missing Invalidations**: Search for `invalidateQueries` after mutations

---

This architecture provides:

- ✅ Type-safe, centralized query management
- ✅ Optimized server/client data flow
- ✅ Resilient error handling
- ✅ Production-ready UX patterns
- ✅ Clear separation of concerns

Each pattern is battle-tested for Next.js App Router's unique constraints (Server Components, streaming, Suspense). Adjust `staleTime` and retry strategies based on your API's characteristics!

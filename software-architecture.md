# Next.js App Router — Software Architecture Guide

> A comprehensive reference for designing, structuring, and scaling Next.js 16+ applications using the App Router paradigm. Each section includes a layered diagram, data flow examples, rules, and benefits modeled after production-grade architecture.

---

## 1. Overall System Architecture

### Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        NEXT.JS 16+ APP                          │
│                    (App Router Architecture)                     │
├───────────────┬──────────────────┬──────────────────────────────┤
│   RENDERING   │    APPLICATION   │         INFRASTRUCTURE       │
│    LAYER      │      LAYER       │            LAYER             │
│               │                  │                              │
│  RSC / RCC    │  Routes/Layouts  │  CDN / Edge / Origin         │
│  Streaming    │  Server Actions  │  DB / Cache / Storage        │
│  Suspense     │  Middleware      │  Auth / Queue / Email        │
└───────────────┴──────────────────┴──────────────────────────────┘
```

### Full Request Lifecycle

| Stage | Component | Responsibility |
|---|---|---|
| **1. DNS / CDN** | Vercel Edge Network | Route to nearest edge node |
| **2. Middleware** | `middleware.ts` | Auth checks, redirects, rewrites |
| **3. Route Handler** | `app/**/route.ts` | REST-like API endpoints |
| **4. RSC Render** | `app/**/page.tsx` | Server-side HTML generation |
| **5. Streaming** | `<Suspense>` | Progressive hydration |
| **6. Client Shell** | `"use client"` components | Interactivity, state, effects |
| **7. Server Actions** | `"use server"` functions | Mutations, form handling |
| **8. Data Layer** | Services → Repository | Business logic + persistence |

### ✓ Benefits

- **Zero-config SSR/SSG/ISR** — Per-route rendering strategy
- **Edge-first** — Middleware runs before origin
- **Colocation** — Routes, layouts, and loading states in one folder
- **Composable** — Mix Server and Client Components freely

### ⚠ Rules

- **Never import Server Components into Client Components** ✗
- **Pass Server data down as props** → Client ✓
- **Keep `"use client"` boundary as deep as possible**
- **Middleware must stay lightweight** — No DB calls

---

## 2. Folder Structure Layer

### Overview

```
app/
├── layout.tsx              ← Root layout (RSC)
├── page.tsx                ← Home route
├── loading.tsx             ← Streaming fallback
├── error.tsx               ← Error boundary
├── not-found.tsx           ← 404 handler
│
├── (auth)/                 ← Route group (no URL segment)
│   ├── login/page.tsx
│   └── register/page.tsx
│
├── dashboard/
│   ├── layout.tsx          ← Nested layout
│   ├── page.tsx
│   └── [id]/
│       ├── page.tsx        ← Dynamic segment
│       └── edit/page.tsx
│
├── api/                    ← Route Handlers (REST)
│   └── users/
│       └── route.ts
│
src/
├── components/             ← Shared UI components
│   ├── ui/                 ← Primitives (Button, Input)
│   └── shared/             ← Domain-agnostic composites
├── lib/                    ← Utilities, helpers
├── services/               ← Business logic
├── repositories/           ← Data access
├── types/                  ← TypeScript types & DTOs
└── middleware.ts            ← Edge middleware
```

### Example File Conventions

| File | Purpose |
|---|---|
| `layout.tsx` | Persistent UI wrapper (nav, sidebar) |
| `page.tsx` | Unique route UI, SEO metadata |
| `loading.tsx` | Automatic Suspense boundary |
| `error.tsx` | React Error Boundary wrapper |
| `not-found.tsx` | `notFound()` trigger handler |
| `route.ts` | HTTP method handlers (GET, POST…) |
| `template.tsx` | Re-mounts on navigation (animations) |
| `default.tsx` | Parallel route fallback |

### ✓ Benefits

- **Convention over configuration** — Next.js infers routing from FS
- **Colocation** — Tests, stories, styles live next to components
- **Route groups** — Organize without affecting URLs
- **Parallel routes** — Multiple slots in one layout

### ⚠ Rules

- **Never put business logic in `page.tsx`** — Delegate to services
- **`route.ts` and `page.tsx` cannot coexist** in the same segment ✗
- **Avoid deep nesting** beyond 4 levels — Extract shared layouts
- **Group routes with `(folder)`** to avoid URL pollution

---

## 3. Rendering Layer

### Overview

```
┌──────────────────────────────────────────────────────────┐
│                    RENDERING STRATEGIES                   │
├──────────────┬───────────────┬──────────────┬────────────┤
│     SSG      │      ISR      │     SSR      │   CSR      │
│  Build Time  │  Revalidate   │  Per Request │  Browser   │
│              │               │              │            │
│ generateSta- │ revalidate:   │ no-store /   │ "use       │
│ ticParams()  │ 60 (seconds)  │ dynamic      │  client"   │
│              │               │              │            │
│  Fastest     │  Fresh+Fast   │  Always      │  Interactive│
│  Static HTML │  Cached HTML  │  Fresh HTML  │  JS Bundle │
└──────────────┴───────────────┴──────────────┴────────────┘
```

### Component Decision Tree

```
Is the component interactive? (onClick, useState, useEffect)
├── YES → "use client" (Client Component)
└── NO  → Default: Server Component (RSC)
          ├── Needs to fetch data?      → async component + fetch/db
          ├── Needs streaming?          → <Suspense> + async children
          └── Needs static generation? → generateStaticParams()
```

### Data Flow: Streaming SSR with Suspense

| Layer | Code | Behavior |
|---|---|---|
| **Page (RSC)** | `export default async function Page()` | Starts render immediately |
| **Suspense** | `<Suspense fallback={<Skeleton/>}>` | Streams shell instantly |
| **Async Child** | `async function UserCard({ id })` | Awaits data independently |
| **Client Shell** | `"use client"` with `useOptimistic` | Handles interaction post-hydration |

### Cache Hierarchy

```
fetch('...', { next: { revalidate: 60 } })
     │
     ▼
┌─────────────────────────────────────┐
│           NEXT.JS CACHE             │
│  1. Memory Cache  (request-level)   │
│  2. Data Cache    (persistent)      │
│  3. Full Route Cache (static HTML)  │
│  4. Router Cache  (client-side)     │
└─────────────────────────────────────┘
```

### ✓ Benefits

- **Partial Prerendering (PPR)** — Static shell + dynamic holes
- **Streaming** — Users see content before all data loads
- **Per-fetch caching** — Granular revalidation control
- **React 19 integration** — `use()`, `useActionState`, optimistic UI

### ⚠ Rules

- **Never use `useEffect` for data fetching in RSC** — It doesn't run ✗
- **`"use client"` marks a boundary**, not a single component
- **Opt out of caching explicitly** with `{ cache: 'no-store' }`
- **Avoid rendering client components at the root** — Push them deep

---

## 4. Routing Layer

### Overview

```
URL: /dashboard/orders/42/edit?status=pending

app/
└── dashboard/
    └── orders/
        └── [id]/          ← Dynamic Segment  → params.id = "42"
            └── edit/
                └── page.tsx ← searchParams.status = "pending"
```

### Route Types

| Pattern | Folder | Example URL |
|---|---|---|
| Static | `app/about/` | `/about` |
| Dynamic | `app/blog/[slug]/` | `/blog/hello-world` |
| Catch-all | `app/docs/[...path]/` | `/docs/a/b/c` |
| Optional catch-all | `app/[[...path]]/` | `/` or `/a/b` |
| Route Group | `app/(marketing)/` | No URL change |
| Parallel | `app/@modal/` | Rendered in slot |
| Intercepting | `app/(.)photo/[id]/` | Modal overlay |

### Example Data Flow: Dynamic Route Render

| Stage | Action |
|---|---|
| **Browser** | Navigates to `/dashboard/orders/42` |
| **Router Cache** | Check client-side cache → Miss → Fetch RSC payload |
| **Middleware** | `middleware.ts` → validate session token |
| **Layout** | `dashboard/layout.tsx` → renders nav, checks role |
| **Page (RSC)** | `orders/[id]/page.tsx` → `params.id = "42"` |
| **Service** | `orderService.getById("42")` → validate ownership |
| **Repository** | `orderRepo.findById("42")` → query DB |
| **Response** | Streamed RSC payload → hydrated in browser |

### Parallel & Intercepting Routes

```
app/
├── layout.tsx
├── @modal/           ← Parallel slot
│   └── (.)photo/
│       └── [id]/
│           └── page.tsx   ← Intercepted modal
└── photo/
    └── [id]/
        └── page.tsx       ← Full page on direct visit
```

### ✓ Benefits

- **Nested layouts** — Shared UI persists across child routes
- **Parallel routes** — Multiple views in one layout simultaneously
- **Intercepting** — Show modals without losing background context
- **Soft navigation** — Client-side transitions with RSC prefetching

### ⚠ Rules

- **Never use `router.push` for mutations** — Use Server Actions ✓
- **`searchParams` are not cached** — Always dynamic
- **`params` are available in page, layout, and route handlers**
- **Avoid deeply nested dynamic segments** — Flatten with route groups

---

## 5. API Layer (Route Handlers)

### Overview

```
app/api/
├── users/
│   └── route.ts          → GET /api/users, POST /api/users
├── users/
│   └── [id]/
│       └── route.ts      → GET /api/users/:id, PUT, DELETE
└── auth/
    └── [...nextauth]/
        └── route.ts      → NextAuth.js handler
```

### Route Handler Anatomy

```typescript
// app/api/users/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { userService } from '@/services/userService'
import { validateSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await validateSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const query = Object.fromEntries(searchParams) as UserQueryParams

  const users = await userService.getAll(query)
  return NextResponse.json({ success: true, data: users })
}

export async function POST(req: NextRequest) {
  const dto: CreateUserDTO = await req.json()
  const user = await userService.create(dto)
  return NextResponse.json({ success: true, data: user }, { status: 201 })
}
```

### Example Data Flow: POST /api/users

| Layer | Action |
|---|---|
| **Client** | `fetch('/api/users', { method: 'POST', body: JSON.stringify(dto) })` |
| **Middleware** | Rate limit check, CORS headers |
| **Route Handler** | `POST /api/users/route.ts → userService.create(dto)` |
| **Service** | `UserService.create()` → Validate → Check duplicates → Hash password |
| **Repository** | `UserRepository.create(user)` → Insert to DB |
| **Response** | `NextResponse.json({ success: true, data: user }, { status: 201 })` |
| **Client** | Update UI optimistically or refetch |

### HTTP Method Mapping

| Method | Use Case | Idempotent |
|---|---|---|
| `GET` | Read resource(s) | ✓ |
| `POST` | Create resource | ✗ |
| `PUT` | Replace resource | ✓ |
| `PATCH` | Partial update | ✗ |
| `DELETE` | Remove resource | ✓ |

### ✓ Benefits

- **Web Standards** — Built on `Request`/`Response` API
- **Edge-compatible** — Deploy handlers to edge runtime
- **Typed** — `NextRequest` / `NextResponse` wrappers
- **Colocated** — Lives inside the `app/` directory

### ⚠ Rules

- **Validate all inputs** before passing to service ✗
- **Never call repositories directly from route handlers** — Use services ✓
- **Always return structured errors** with status codes
- **Use `export const runtime = 'edge'`** for latency-sensitive endpoints

---

## 6. Server Actions Layer

### Overview

```
"use server"  ←  Can be declared in a file or inline in component

┌─────────────────────────────────────────────────────┐
│                  SERVER ACTIONS                      │
│                                                      │
│  Form Mutations  │  Data Mutations  │  Revalidation  │
│  <form action>   │  Direct invoke   │  revalidatePath│
│  useActionState  │  from client     │  revalidateTag  │
└─────────────────────────────────────────────────────┘
```

### Server Action Anatomy

```typescript
// src/actions/userActions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { userService } from '@/services/userService'
import { createUserSchema } from '@/types/schemas'

export async function createUserAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const raw = Object.fromEntries(formData)
  const parsed = createUserSchema.safeParse(raw)

  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten() }
  }

  await userService.create(parsed.data)
  revalidatePath('/dashboard/users')
  redirect('/dashboard/users')
}
```

### Example Data Flow: Form Submission

| Layer | Action |
|---|---|
| **Client** | `<form action={createUserAction}>` |
| **React 19** | Serializes FormData → POST to `/action` endpoint |
| **Server Action** | Validates with Zod → calls `userService.create(dto)` |
| **Service** | Business logic → calls `userRepository.create(user)` |
| **Cache** | `revalidatePath('/dashboard/users')` — purge stale cache |
| **Navigation** | `redirect('/dashboard/users')` |
| **Client** | Router cache cleared → fresh RSC payload streamed |

### useActionState Pattern

```typescript
'use client'
import { useActionState } from 'react'
import { createUserAction } from '@/actions/userActions'

export function CreateUserForm() {
  const [state, action, isPending] = useActionState(createUserAction, null)

  return (
    <form action={action}>
      <input name="email" />
      {state?.errors?.email && <p>{state.errors.email}</p>}
      <button disabled={isPending}>
        {isPending ? 'Creating...' : 'Create User'}
      </button>
    </form>
  )
}
```

### ✓ Benefits

- **Progressive enhancement** — Forms work without JS
- **No API route needed** — Direct server function call
- **Automatic CSRF protection** — Built into Next.js
- **Optimistic UI** — `useOptimistic` + action state

### ⚠ Rules

- **Always validate inputs** in the action — Never trust client data ✗
- **Never expose sensitive data** in action return values
- **Use `revalidatePath`/`revalidateTag`** after mutations ✓
- **Actions are POST requests** — Never use for reads ✗

---

## 7. Middleware Layer

### Overview

```
Request
   │
   ▼
┌──────────────────────────────────────────────┐
│                middleware.ts                  │
│           (Runs on EVERY request)             │
│                                               │
│  1. Auth Check      → redirect /login        │
│  2. Role Guard      → redirect /unauthorized │
│  3. Geo Redirect    → /en /fr /ar            │
│  4. A/B Testing     → set cookie variant     │
│  5. Rate Limiting   → 429 response           │
│  6. Request Logging → append headers         │
└──────────────────────────────────────────────┘
   │
   ▼
Route Handler / RSC Page
```

### Middleware Anatomy

```typescript
// middleware.ts (root of project)
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  const token = await getToken({ req })
  const { pathname } = req.nextUrl

  // Auth guard
  if (pathname.startsWith('/dashboard') && !token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Role guard
  if (pathname.startsWith('/admin') && token?.role !== 'admin') {
    return NextResponse.redirect(new URL('/unauthorized', req.url))
  }

  // Locale detection
  const locale = req.headers.get('accept-language')?.split(',')[0] ?? 'en'
  const res = NextResponse.next()
  res.headers.set('x-locale', locale)
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

### Example Data Flow: Protected Dashboard Route

| Stage | Action |
|---|---|
| **Browser** | `GET /dashboard/orders` |
| **Edge** | Middleware intercepts before origin |
| **Token Check** | `getToken()` → reads `next-auth.session-token` cookie |
| **Guard** | No token → `redirect('/login?callbackUrl=/dashboard/orders')` |
| **With Token** | Pass through → RSC page renders |
| **Role Check** | `token.role !== 'admin'` → `redirect('/unauthorized')` |

### ✓ Benefits

- **Runs at the Edge** — Zero cold start, global latency
- **Before origin** — Saves server compute on rejected requests
- **Request/Response mutation** — Add headers, cookies inline
- **Pattern matching** — `matcher` config for precise targeting

### ⚠ Rules

- **Never call databases in middleware** — Edge runtime restrictions ✗
- **Keep middleware under 1MB** — Edge bundle size limit
- **Use `matcher`** to exclude static assets from middleware
- **Always chain `NextResponse.next()`** to continue the request

---

## 8. Service Layer

### Overview

```
┌─────────────────────────────────────────────────────┐
│                   SERVICE LAYER                      │
│           (Business Logic & Orchestration)           │
│                                                      │
│  ┌───────────┐  ┌───────────┐  ┌───────────────┐   │
│  │UserService│  │OrderService│  │ProductService │   │
│  │           │  │           │  │               │   │
│  │ create()  │  │ place()   │  │ search()      │   │
│  │ update()  │  │ cancel()  │  │ updateStock() │   │
│  │ delete()  │  │ refund()  │  │ publish()     │   │
│  └─────┬─────┘  └─────┬─────┘  └───────┬───────┘   │
│        │              │                │            │
└────────┼──────────────┼────────────────┼────────────┘
         ▼              ▼                ▼
    UserRepo       OrderRepo        ProductRepo
```

### Service Anatomy

```typescript
// src/services/userService.ts
import { UserRepository } from '@/repositories/userRepository'
import { EmailService } from '@/services/emailService'
import { CreateUserDTO, User } from '@/types'
import { hashPassword } from '@/lib/crypto'
import { AppError } from '@/lib/errors'

export class UserService {
  constructor(
    private userRepo: UserRepository,
    private emailService: EmailService
  ) {}

  async create(dto: CreateUserDTO): Promise<User> {
    // 1. Validate business rules
    const existing = await this.userRepo.findByEmail(dto.email)
    if (existing) throw new AppError('Email already registered', 409)

    // 2. Transform / enrich
    const hashedPassword = await hashPassword(dto.password)
    const user = { ...dto, password: hashedPassword, createdAt: new Date() }

    // 3. Persist
    const created = await this.userRepo.create(user)

    // 4. Side effects
    await this.emailService.sendWelcome(created.email)

    return created
  }
}

// Singleton export
export const userService = new UserService(
  new UserRepository(),
  new EmailService()
)
```

### Example Data Flow: Create User

| Step | Action |
|---|---|
| **Input** | `CreateUserDTO { email, password, name }` |
| **Validate** | Check email format, password strength |
| **Duplicate Check** | `userRepo.findByEmail(dto.email)` → throw if exists |
| **Transform** | `hashPassword()` → enrich with `createdAt`, `role: 'user'` |
| **Persist** | `userRepo.create(user)` |
| **Side Effects** | `emailService.sendWelcome()`, `analyticsService.track()` |
| **Return** | `User` (without password hash) |

### ✓ Benefits

- **Single Responsibility** — One service = one domain
- **Testable** — Inject mocked repositories in unit tests
- **Reusable** — Shared between API routes, Server Actions, cron jobs
- **Composable** — Services can call other services

### ⚠ Rules

- **No HTTP logic in services** — No `req`, `res`, `NextResponse` ✗
- **No data access** — Never call DB/ORM directly ✗
- **All business rules live here** — Not in routes, not in repos
- **Use Singleton pattern** — `export const userService = new UserService()`

---

## 9. Repository Layer

### Overview

```
┌──────────────────────────────────────────────────────┐
│                  REPOSITORY LAYER                     │
│            (Data Access Abstraction)                  │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │            IUserRepository (interface)           │ │
│  │  findById() │ findByEmail() │ create() │ update() │ │
│  └──────────────────┬──────────────────────────────┘ │
│                     │                                 │
│         ┌───────────┴───────────┐                    │
│         ▼                       ▼                    │
│  ┌─────────────┐       ┌──────────────────┐          │
│  │PrismaUserRepo│      │JSONFileUserRepo  │          │
│  │(Production) │       │(Dev / Test)      │          │
│  └─────────────┘       └──────────────────┘          │
└──────────────────────────────────────────────────────┘
```

### Repository Anatomy

```typescript
// src/repositories/userRepository.ts
import { prisma } from '@/lib/prisma'
import { User, CreateUserDTO } from '@/types'

export class UserRepository {
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } })
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } })
  }

  async create(data: CreateUserDTO): Promise<User> {
    return prisma.user.create({ data })
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    return prisma.user.update({ where: { id }, data })
  }

  async delete(id: string): Promise<void> {
    await prisma.user.delete({ where: { id } })
  }

  async findAll(query: UserQueryParams): Promise<User[]> {
    return prisma.user.findMany({
      where: {
        ...(query.role && { role: query.role }),
        ...(query.search && {
          OR: [
            { name: { contains: query.search } },
            { email: { contains: query.search } },
          ],
        }),
      },
      take: query.limit ?? 20,
      skip: query.offset ?? 0,
    })
  }
}
```

### Example Data Flow: Read with Filtering

| Step | Action |
|---|---|
| **Service calls** | `userRepo.findAll({ role: 'admin', limit: 10 })` |
| **Query Build** | Prisma `where` clause constructed from params |
| **ORM Execute** | Prisma generates + executes SQL |
| **DB Response** | Raw rows returned |
| **Transform** | Prisma maps to typed `User[]` objects |
| **Return** | `User[]` handed back to service |

### ✓ Benefits

- **Swap DB easily** — Change Prisma to Drizzle without touching services
- **Testable** — Mock the interface, not the DB
- **Typed** — Full TypeScript coverage via Prisma generated types
- **Centralized queries** — No scattered DB calls across codebase

### ⚠ Rules

- **No business logic** — Only data access ✗
- **No validation** — That's the service's job ✗
- **Abstract behind interface** — Services depend on interface, not class ✓
- **Return domain types** — Not raw DB rows

---

## 10. Data Layer (Storage)

### Overview

```
┌──────────────────────────────────────────────────────┐
│                    DATA LAYER                         │
│               (Storage Backends)                     │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐ │
│  │PostgreSQL│  │  Redis   │  │  Object Storage    │ │
│  │(Prisma)  │  │  Cache   │  │  (S3 / R2 / Blob)  │ │
│  │          │  │          │  │                    │ │
│  │ users    │  │ sessions │  │ profile-images/    │ │
│  │ orders   │  │ rate-lim │  │ uploads/           │ │
│  │ products │  │ pub/sub  │  │ exports/           │ │
│  └──────────┘  └──────────┘  └────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### Data Model Example (Prisma Schema)

```prisma
// prisma/schema.prisma

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  role      Role     @default(USER)
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  orders    Order[]
}

model Product {
  id          String   @id @default(cuid())
  name        String
  price       Float
  stock       Int      @default(0)
  publishedAt DateTime?
  orderItems  OrderItem[]
}

model Order {
  id        String      @id @default(cuid())
  userId    String
  user      User        @relation(fields: [userId], references: [id])
  status    OrderStatus @default(PENDING)
  total     Float
  items     OrderItem[]
  createdAt DateTime    @default(now())
}

enum Role       { USER ADMIN }
enum OrderStatus { PENDING CONFIRMED SHIPPED DELIVERED CANCELLED }
```

### Example Data Flow: Creating a User

| Layer | Action |
|---|---|
| **Client** | `fetch('/api/users', { method: 'POST', body: JSON.stringify(userData) })` |
| **API Route** | `POST /api/users/route.ts → userService.createUser(dto)` |
| **Service** | `UserService.createUser()` → Validate email → Check duplicates → Add timestamps |
| **Repository** | `UserRepository.create(user)` → `prisma.user.create(data)` |
| **Data** | Prisma executes `INSERT INTO users ...` → PostgreSQL persists row |
| **Response** | `NextResponse.json({ success: true, data: user })` |
| **Client** | Update UI with new user data |

### ✓ Benefits

- **Separation of Concerns** — Each layer has one job
- **Type Safety** — End-to-end TypeScript via Prisma generated types
- **Testability** — Mock any layer easily
- **Maintainability** — Changes isolated to layers
- **Reusability** — Services used in routes & Server Actions
- **Scalability** — Easy to swap JSON for DB, DB for another DB

### ⚠ Rules

- **Never skip layers** — Client → Service ✗ (must go through Route/Action)
- **One-way dependencies** — Service → Repository ✓ never reverse
- **No business logic in Repository** — Only data access
- **No data access in Service** — Only through Repository
- **Types flow down, never up** — Entities → DTOs → Responses
- **Use Singleton for Services** — One instance per process

---

## 11. Type System Layer

### Overview

```
┌─────────────────────────────────────────────────────────┐
│                  TYPE SYSTEM (Cross-cutting)             │
│         TypeScript types flow through all layers         │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌───────┐ │
│  │ Entities │  │   DTOs   │  │   Params   │  │Respon-│ │
│  │          │  │          │  │            │  │ ses   │ │
│  │ User     │  │ Create-  │  │ UserQuery- │  │ ApiRe-│ │
│  │ Product  │  │ UserDTO  │  │ Params     │  │ spons-│ │
│  │ Order    │  │ UpdateDTO│  │ PaginationP│  │ e<T>  │ │
│  └──────────┘  └──────────┘  └────────────┘  └───────┘ │
└─────────────────────────────────────────────────────────┘
```

### Type Definitions

```typescript
// src/types/index.ts

// ── Entities (DB shape) ──────────────────────────────────
export interface User {
  id: string
  email: string
  name: string
  role: 'USER' | 'ADMIN'
  createdAt: Date
}

// ── DTOs (input shape) ──────────────────────────────────
export interface CreateUserDTO {
  email: string
  name: string
  password: string
}

export interface UpdateUserDTO {
  name?: string
  role?: 'USER' | 'ADMIN'
}

// ── Query Params ────────────────────────────────────────
export interface UserQueryParams {
  role?: 'USER' | 'ADMIN'
  search?: string
  limit?: number
  offset?: number
}

// ── Responses ───────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  meta?: PaginationMeta
}

export interface PaginationMeta {
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

// ── Action State ─────────────────────────────────────────
export interface ActionState<T = void> {
  success: boolean
  data?: T
  errors?: Record<string, string[]>
  message?: string
}
```

### Type Flow Through Layers

```
Client Input
     │
     ▼
CreateUserDTO          ← Input validation (Zod schema)
     │
     ▼
User (Entity)          ← Service transforms DTO → Entity
     │
     ▼
UserRepository         ← Typed Prisma operations
     │
     ▼
ApiResponse<User>      ← Route handler wraps Entity
     │
     ▼
Client receives User   ← Stripped of sensitive fields
```

### ✓ Benefits

- **End-to-end type safety** — From form to DB and back
- **Refactor confidence** — TypeScript catches breaking changes
- **Self-documenting** — Types describe contracts between layers
- **IDE support** — Autocomplete across all layer boundaries

### ⚠ Rules

- **Never use `any`** — Use `unknown` and narrow ✓
- **DTOs ≠ Entities** — Keep them separate by design
- **Validate at boundaries** — Zod at API entry, never deep inside
- **Responses strip internals** — Never expose `password`, `salt` etc.

---

## 12. Authentication Layer

### Overview

```
┌─────────────────────────────────────────────────────────┐
│                  AUTH ARCHITECTURE                       │
│                  (NextAuth.js v5)                        │
│                                                          │
│  Browser  →  Middleware  →  Session  →  Route/Action    │
│                                                          │
│  Providers:  Google | GitHub | Credentials | Magic Link  │
│  Strategy:   JWT (Edge) or Database Sessions             │
│  Storage:    Cookie (httpOnly, Secure, SameSite)         │
└─────────────────────────────────────────────────────────┘
```

### Auth Configuration

```typescript
// src/lib/auth.ts  (NextAuth v5)
import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'
import Credentials from 'next-auth/providers/credentials'
import { userService } from '@/services/userService'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub,
    Credentials({
      async authorize(credentials) {
        const user = await userService.verifyCredentials(
          credentials.email as string,
          credentials.password as string
        )
        return user ?? null
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = user.role
      return token
    },
    async session({ session, token }) {
      session.user.role = token.role as string
      return session
    },
  },
})
```

### Example Data Flow: Login with Credentials

| Stage | Action |
|---|---|
| **Client** | Submits `<form action={signInAction}>` with email + password |
| **Server Action** | `signIn('credentials', { email, password })` |
| **Provider** | `authorize()` → `userService.verifyCredentials()` |
| **Service** | `bcrypt.compare(password, hash)` → returns `User` or `null` |
| **JWT Callback** | Enrich token with `role`, `id` |
| **Cookie** | `next-auth.session-token` set (httpOnly, Secure) |
| **Middleware** | Every request reads token from cookie → guards routes |

### ✓ Benefits

- **Edge-compatible JWT** — Session validation without DB hit
- **Provider flexibility** — OAuth, credentials, magic link, passkeys
- **Type-safe session** — Augment `Session` type with custom fields
- **Integrated middleware** — Auth checks at the edge

### ⚠ Rules

- **Never store sensitive data in JWT** — Only `id`, `role`, `email`
- **Always verify session server-side** — `auth()` in Server Components
- **PKCE + state for OAuth** — Enabled by default in NextAuth v5
- **Rotate secrets regularly** — `AUTH_SECRET` in `.env`

---

## 13. Error Handling Layer

### Overview

```
┌────────────────────────────────────────────────────────┐
│                ERROR HANDLING STRATEGY                  │
│                                                         │
│  error.tsx (RSC/RCC boundary)                          │
│  ├── Catches render errors in segment tree             │
│  ├── Shows fallback UI                                 │
│  └── Logs to monitoring (Sentry, Datadog)              │
│                                                         │
│  Route Handler try/catch                               │
│  ├── AppError → structured JSON + HTTP status          │
│  └── Unknown → 500 Internal Server Error               │
│                                                         │
│  Server Action error state                             │
│  ├── Validation errors → ActionState.errors            │
│  └── Business errors → ActionState.message             │
└────────────────────────────────────────────────────────┘
```

### Error Classes

```typescript
// src/lib/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND')
  }
}

export class UnauthorizedError extends AppError {
  constructor() {
    super('Unauthorized', 401, 'UNAUTHORIZED')
  }
}

// Route handler error wrapper
export function handleError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code },
      { status: error.statusCode }
    )
  }
  console.error('[Unhandled Error]', error)
  return NextResponse.json(
    { success: false, error: 'Internal Server Error' },
    { status: 500 }
  )
}
```

### Error Boundary File Convention

| File | Catches | Scope |
|---|---|---|
| `app/error.tsx` | RSC render errors | Root segment |
| `app/dashboard/error.tsx` | Dashboard errors only | Nested segment |
| `app/global-error.tsx` | Root layout errors | Entire app |
| `app/not-found.tsx` | `notFound()` calls | Current segment |

### ✓ Benefits

- **Graceful degradation** — `error.tsx` shows UI, not blank screen
- **Structured errors** — Consistent JSON shape across all endpoints
- **Typed error states** — `ActionState.errors` for form fields
- **Centralized logging** — One place to integrate Sentry

### ⚠ Rules

- **Never expose stack traces** to client in production ✗
- **Always log unexpected errors** before returning 500
- **`error.tsx` must be a Client Component** — `"use client"` required
- **Use `notFound()`** instead of returning null for missing resources

---

## 14. Performance Layer

### Overview

```
┌────────────────────────────────────────────────────────────┐
│                   PERFORMANCE STRATEGY                      │
│                                                             │
│  Build Time         Request Time        Runtime             │
│  ───────────        ────────────        ───────             │
│  Static HTML   →    Edge Cache    →     Streaming           │
│  Bundle split       CDN hit             Suspense            │
│  Tree shaking       Router Cache        PPR                 │
│  Image optim.       Full Route Cache    use() hook          │
└────────────────────────────────────────────────────────────┘
```

### Optimization Checklist

```typescript
// 1. Image Optimization
import Image from 'next/image'
<Image src="/hero.jpg" alt="Hero" width={1200} height={600} priority />

// 2. Font Optimization
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'], display: 'swap' })

// 3. Dynamic Imports (code splitting)
const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <Skeleton />,
  ssr: false
})

// 4. Parallel data fetching (not sequential!)
const [user, orders] = await Promise.all([
  userService.getById(id),
  orderService.getByUser(id)
])

// 5. Revalidation tagging
fetch('/api/data', { next: { tags: ['user-data'] } })
// Invalidate: revalidateTag('user-data')
```

### Cache Strategy by Data Type

| Data Type | Strategy | Config |
|---|---|---|
| Static content | SSG | `dynamic = 'force-static'` |
| User-specific | No cache | `{ cache: 'no-store' }` |
| Shared, fresh-ish | ISR | `{ next: { revalidate: 60 } }` |
| On-demand purge | Tag-based | `revalidateTag('products')` |
| Session data | Redis | TTL = session duration |

### ✓ Benefits

- **Partial Prerendering** — Best of static and dynamic in one page
- **Automatic code splitting** — Per route, per dynamic import
- **Built-in image CDN** — Resize, optimize, lazy-load automatically
- **React Compiler** — Automatic memoization (Next.js 16+)

### ⚠ Rules

- **Never `await` sequentially** when calls are independent — Use `Promise.all` ✓
- **Avoid large Client Components** — Heavy JS delays interactivity
- **`priority` only for above-fold images** — Avoid LCP regressions
- **Profile with `next build --profile`** before optimizing blindly

---

## Quick Reference Card

### Layer Responsibilities

| Layer | File Location | Responsibility | Calls |
|---|---|---|---|
| **Middleware** | `middleware.ts` | Auth, redirects, headers | Nothing (no DB) |
| **Route Handler** | `app/**/route.ts` | HTTP method handling | Service only |
| **Server Action** | `src/actions/*.ts` | Form/mutation handling | Service only |
| **RSC Page** | `app/**/page.tsx` | Server render, SEO | Service directly |
| **Service** | `src/services/*.ts` | Business logic | Repository + other services |
| **Repository** | `src/repositories/*.ts` | Data access | ORM / DB |
| **Type System** | `src/types/*.ts` | Contracts | (referenced everywhere) |

### The Golden Rules

::: tip ✓ Always

- Keep `"use client"` as deep as possible
- Validate at every public boundary (API, Actions)
- Return typed `ApiResponse<T>` from all endpoints
- Use `Promise.all()` for parallel data fetching
- Add `loading.tsx` and `error.tsx` to every major segment
:::

::: danger ✗ Never

- Call DB/ORM directly from Route Handlers or Pages
- Skip validation because "we trust the client"
- Put business logic in the Repository
- Import Server Components into Client Components
- Use `localStorage` — use cookies + server sessions
:::

---

## 15. Terms Reference

A glossary of every key term used throughout this guide, organized by category.

---

### Core React Concepts

| Term | Description |
|---|---|
| **RSC** | *React Server Component* — A component that runs exclusively on the server. Has no JS bundle on the client, can `await` data directly, cannot use hooks or browser APIs. |
| **RCC** | *React Client Component* — A component marked with `"use client"`. Runs in the browser, supports hooks, event handlers, and browser APIs. Hydrated from server-rendered HTML. |
| **Hydration** | The process where React attaches event listeners to server-rendered HTML in the browser, making static markup interactive. |
| **Suspense** | A React boundary (`<Suspense fallback={...}>`) that shows a fallback UI while async children are loading. Enables streaming and progressive rendering. |
| **Streaming** | Sending HTML to the browser in chunks as it becomes ready, rather than waiting for the entire page to render. Powered by `<Suspense>`. |
| **`use()` hook** | React 19 hook that unwraps a Promise or Context inside a component. Allows async data to be read inline without `await` at the top level. |
| **`useActionState`** | React 19 hook (replaces `useFormState`) that manages the state returned by a Server Action, including pending state and errors. |
| **`useOptimistic`** | React 19 hook that shows an optimistic (assumed-success) UI update immediately, before the server confirms the mutation. |
| **React Compiler** | A build-time compiler from Meta (stable in Next.js 15+) that automatically adds memoization (`useMemo`, `useCallback`) without manual developer effort. |

---

### Next.js App Router

| Term | Description |
|---|---|
| **App Router** | The file-system-based routing system introduced in Next.js 13, living in the `app/` directory. Built on React Server Components and supports layouts, streaming, and Server Actions. |
| **Pages Router** | The legacy routing system (`pages/` directory) from Next.js 12 and earlier. Still supported but not recommended for new projects. |
| **Route Segment** | A single folder inside `app/` that maps to a URL segment. Each segment can have its own `layout`, `page`, `loading`, and `error` files. |
| **Route Handler** | A `route.ts` file that handles HTTP requests (GET, POST, PUT, DELETE…) — the App Router equivalent of API routes. |
| **Server Action** | A function marked with `"use server"` that runs on the server. Called directly from Client Components or `<form action={...}>` without needing a separate API endpoint. |
| **Middleware** | A `middleware.ts` file at the project root that intercepts every request before it reaches a route. Runs on the Edge runtime. Renamed to `proxy.ts` in Next.js 16. |
| **Proxy** | The Next.js 16 replacement for `middleware.ts`. Runs on the Node.js runtime (not Edge) and makes the network boundary explicit. |
| **Layout** | A `layout.tsx` file that wraps all child route segments. Persists across navigations without re-rendering — ideal for nav bars, sidebars, and shell UI. |
| **Template** | A `template.tsx` file similar to layout but re-mounts on every navigation. Useful for page transition animations or resetting state. |
| **Loading UI** | A `loading.tsx` file that automatically wraps the route segment in a `<Suspense>` boundary, shown while the page fetches data. |
| **Error Boundary** | An `error.tsx` file (must be `"use client"`) that catches render and data errors within its segment, showing a fallback UI. |
| **Not Found** | A `not-found.tsx` file that renders when `notFound()` is called within its segment. |
| **Route Group** | A folder wrapped in parentheses, e.g. `(auth)/`, that organizes routes without adding a URL segment. |
| **Dynamic Segment** | A folder wrapped in brackets, e.g. `[id]/`, that matches variable URL parts. Accessible via `params.id` in the component. |
| **Catch-all Segment** | `[...slug]/` — matches any number of path segments after a point. `[[...slug]]` makes it optional. |
| **Parallel Routes** | Named slots (`@modal`, `@sidebar`) inside a layout that render multiple pages simultaneously in different UI regions. |
| **Intercepting Routes** | Routes prefixed with `(.)`, `(..)`, or `(...)` that intercept navigation to show a different UI (e.g. a modal) while the background page persists. |

---

### Rendering Strategies

| Term | Description |
|---|---|
| **SSR** | *Server-Side Rendering* — HTML is generated on the server on every request. Always fresh, never cached. |
| **SSG** | *Static Site Generation* — HTML is generated at build time. Fastest possible delivery via CDN. Used with `generateStaticParams()`. |
| **ISR** | *Incremental Static Regeneration* — Static pages that revalidate in the background after a time interval (`revalidate: 60`). Fresh + fast. |
| **CSR** | *Client-Side Rendering* — Page shell delivered from server; data fetched and rendered entirely in the browser. Used for highly interactive, private UIs. |
| **PPR** | *Partial Prerendering* — A Next.js 15 feature (evolved into Cache Components in v16) that combines a static shell with dynamic streaming holes in a single request. |
| **Cache Components** | The Next.js 16 replacement for PPR. Uses the `"use cache"` directive on components or functions to explicitly mark what should be cached and for how long. |
| **`"use cache"`** | A Next.js 16 directive (on a file, component, or function) that opts it into the Cache Component model for instant navigation and PPR-style static delivery. |
| **Edge Runtime** | A lightweight, V8-based runtime for running code at CDN edge nodes globally. Minimal API surface — no native Node.js modules. Used by Middleware. |
| **Node.js Runtime** | The full Node.js server runtime. Supports all Node APIs, file system access, and native modules. Default for Route Handlers and Proxy in Next.js 16. |

---

### Caching

| Term | Description |
|---|---|
| **Data Cache** | Next.js's persistent server-side cache for `fetch()` responses. Survives across requests and deployments until explicitly invalidated. |
| **Full Route Cache** | A cached version of the entire RSC payload + HTML for a route. Generated at build time for static routes. |
| **Router Cache** | A client-side in-memory cache of RSC payloads for visited routes. Enables instant back/forward navigation. |
| **Memory Cache** | Per-request deduplication cache. Multiple `fetch()` calls to the same URL within one render are deduplicated automatically. |
| **`revalidatePath()`** | A Next.js function that purges the Full Route Cache for a specific path, typically called after a mutation in a Server Action. |
| **`revalidateTag()`** | Purges all cached `fetch()` responses tagged with a specific string. More granular than `revalidatePath`. |
| **`unstable_cache`** | Wraps any async function (e.g. a DB query) in the Data Cache, giving non-`fetch` calls the same caching behavior. |

---

### Architecture Layers

| Term | Description |
|---|---|
| **Service Layer** | The layer containing all business logic. Orchestrates repositories, validates rules, and coordinates side effects. No HTTP or DB concerns. |
| **Repository Layer** | The data access abstraction layer. Wraps ORM/DB queries behind a typed interface. No business logic. |
| **DTO** | *Data Transfer Object* — A typed shape for incoming data (e.g. `CreateUserDTO`). Distinct from the Entity to decouple API contracts from DB schema. |
| **Entity** | The domain model that mirrors the database table (e.g. `User`, `Order`). Returned by repositories and enriched by services. |
| **Singleton** | A pattern where a class is instantiated once and reused. Recommended for services to avoid multiple DB connection pools. |
| **`AppError`** | A custom error class that carries an HTTP status code. Allows route handlers to return structured, typed error responses. |

---

### TypeScript & Validation

| Term | Description |
|---|---|
| **Zod** | A TypeScript-first schema validation library. Used to validate and parse input at API and action boundaries before passing to services. |
| **`safeParse()`** | Zod method that returns `{ success, data, error }` instead of throwing. Used in Server Actions to return validation errors to the client. |
| **Type Guard** | A TypeScript function that narrows `unknown` to a specific type at runtime (e.g. `isUser(value): value is User`). |
| **`ApiResponse<T>`** | A generic wrapper type `{ success, data?, error?, meta? }` used consistently across all Route Handlers for predictable client parsing. |
| **`ActionState<T>`** | The return type of Server Actions, carrying `success`, `data`, `errors` (field-level), and `message` (global). Used with `useActionState`. |
| **Typed Routes** | A Next.js 15.5+ stable feature (behind `typedRoutes` flag) that generates types from your `app/` folder so `<Link href="...">` has compile-time route validation. |

---

### Auth & Security

| Term | Description |
|---|---|
| **NextAuth.js v5** | The latest major version of the most popular auth library for Next.js. Fully compatible with the App Router, Server Actions, and Edge middleware. Also called `Auth.js`. |
| **JWT** | *JSON Web Token* — A signed, self-contained token encoding session data. Used by NextAuth for stateless, Edge-compatible session validation. |
| **Session** | The server-side or token representation of an authenticated user. Accessed via `auth()` in Server Components or `useSession()` in Client Components. |
| **PKCE** | *Proof Key for Code Exchange* — An OAuth 2.0 extension that prevents authorization code interception attacks. Enabled by default in NextAuth v5. |
| **CSRF** | *Cross-Site Request Forgery* — An attack where a malicious site triggers requests on behalf of an authenticated user. Next.js Server Actions include built-in CSRF protection. |
| **`httpOnly` Cookie** | A browser cookie inaccessible to JavaScript. Used by NextAuth to store session tokens securely, preventing XSS theft. |

---

### Tooling & Infrastructure

| Term | Description |
|---|---|
| **Turbopack** | A Rust-based bundler that replaces Webpack in Next.js. Stable as the default bundler in Next.js 16. Delivers 2–5× faster production builds and up to 10× faster Fast Refresh. |
| **Turbopack FS Cache** | A Turbopack feature (beta in Next.js 16) that persists compiler artifacts to disk between dev server restarts for dramatically faster startup times on large projects. |
| **Prisma** | A type-safe ORM for Node.js and TypeScript. Generates typed client from a schema, used in the Repository layer. |
| **Drizzle** | A lightweight TypeScript ORM with SQL-like query syntax. Alternative to Prisma with a smaller runtime footprint. |
| **CDN** | *Content Delivery Network* — A distributed network of servers that caches and serves static assets from the nearest edge location. |
| **DevTools MCP** | A Next.js 16 feature integrating the *Model Context Protocol* for AI-assisted debugging. Allows AI agents to inspect route behavior, diagnose issues, and suggest fixes in the dev workflow. |
| **Biome** | A fast Rust-based linter and formatter introduced as a `next lint` alternative in Next.js 15.5. Replaces ESLint + Prettier in one tool. |
| **Codemod** | An automated code transformation script. Next.js ships codemods (`npx @next/codemod`) for each major version upgrade to handle breaking changes automatically. |

---

## 16. Version Notes

A chronological summary of changes relevant to App Router architecture across recent Next.js releases.

---

### Next.js 16 *(October 2025 — Current Stable)*

::: info 🆕 What's New
**Cache Components** replace the experimental PPR flag. The new model uses `"use cache"` directives on components, functions, or entire files to opt into Partial Prerendering-style caching for instant navigation.

**Turbopack is now stable and the default bundler** for all new projects, delivering 2–5× faster production builds and up to 10× faster Fast Refresh compared to Webpack.

**`proxy.ts` replaces `middleware.ts`** to make the network boundary explicit. `proxy.ts` runs on the Node.js runtime instead of the Edge runtime. `middleware.ts` still works but is deprecated.

**Next.js DevTools MCP** — A new Model Context Protocol integration for AI-assisted debugging that gives AI agents contextual insight into your application to diagnose issues and suggest fixes.

**Async Request APIs are fully enforced** — Next.js 15 introduced async `params` and `searchParams` as a breaking change with temporary backward compatibility. In Next.js 16, synchronous access is fully removed.

**Turbopack Filesystem Caching (beta)** — Stores compiler artifacts on disk between dev server restarts for significantly faster compile times, especially in large projects.
:::

::: warning ⚠️ Breaking Changes in v16

- `experimental.ppr` flag is **removed** — migrate to Cache Components with `"use cache"`
- Synchronous `params` / `searchParams` access is **fully removed** — must be `await`ed
- `middleware.ts` default export and `middleware` named export are **deprecated** — rename to `proxy.ts` and export `proxy`
- `next lint` command is **removed** — use `eslint` or `biome` directly
- `legacyBehavior` prop on `<Link>` is **removed**
- Turbopack config moves from `experimental.turbopack` to top-level `turbopack` in `next.config.ts`
:::

```ts
// ❌ Next.js 15
export function middleware(req: NextRequest) { ... }

// ✅ Next.js 16
// File: proxy.ts
export function proxy(req: NextRequest) { ... }
```

```ts
// ❌ Next.js 15 — synchronous params
export default function Page({ params }: { params: { id: string } }) {
  const { id } = params
}

// ✅ Next.js 16 — async params required
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
}
```

---

### Next.js 15.5 *(August 2025)*

::: info 🆕 What's New
**Turbopack builds in beta** — `next build --turbopack` became available for production, powering Vercel's own sites including `vercel.com`, `v0.app`, and `nextjs.org`.

**Node.js Middleware (stable)** — Node.js runtime support for middleware became stable, allowing full Node.js APIs inside `middleware.ts` before the rename to `proxy.ts` in v16.

**Typed Routes (stable)** — The `typedRoutes` flag graduated from experimental to stable. `<Link href="...">` now has compile-time type safety derived from your `app/` folder structure, compatible with both Webpack and Turbopack.

**`next lint` deprecation** — The `next lint` wrapper command was deprecated in favor of calling `eslint` or `biome` directly. New projects can choose between ESLint, Biome, or no linter at project creation.
:::

---

### Next.js 15 *(October 2024)*

::: info 🆕 What's New
**React Compiler support** — Next.js 15 added support for the React Compiler (experimental), which automatically adds memoization equivalents to your code, reducing the need for manual `useMemo` and `useCallback`.

**Turbopack stable for development** — `next dev --turbo` became stable. Vercel reported up to 76.7% faster local server startup, 96.3% faster code updates with Fast Refresh, and 45.8% faster initial route compile.

**Async Request APIs (breaking)** — `params`, `searchParams`, `cookies()`, `headers()`, and `draftMode()` became async, returning Promises. Temporary synchronous compatibility was included in v15 but fully removed in v16.

**Server Actions stable** — Server Actions graduated from experimental to fully stable, including native file upload support via `FormData`.

**`fetch` HMR caching** — During development, `fetch` responses are reused across Hot Module Replacement saves, preventing redundant API calls to third-party services on every file save.
:::

::: warning ⚠️ Notable Changes

- `params` and `searchParams` in `page.tsx`, `layout.tsx`, `route.ts` are now **Promises**
- `cookies()`, `headers()`, `draftMode()` are now **async** functions
- `<Link>` prefetching behavior changed — `prefetch={null}` is the new default (partial prefetch)
- React 19 is the minimum required version (React 18 still works for the Pages Router only)
:::

---

### Next.js 14 *(October 2023)*

::: info Historical Reference

- **Server Actions stable** — Graduated from experimental, enabled by default
- **Partial Prerendering (PPR) preview** — Experimental feature combining static shell with dynamic streaming holes
- **Metadata API stable** — `generateMetadata()` and static `metadata` exports became the standard for SEO
- Minimum Node.js version raised to **18.17**
:::

---

### Migration Quick Reference

| From | To | How |
|---|---|---|
| `middleware.ts` | `proxy.ts` | Rename file + rename exported function to `proxy` |
| `params.id` (sync) | `await params` then `.id` | Add `async` to component, `await params` |
| `experimental.ppr: true` | `"use cache"` directive | Remove flag, add directive to cacheable components |
| `experimental.turbopack` | top-level `turbopack` | Move config key in `next.config.ts` |
| `next lint` script | `eslint` or `biome check` | Run codemod: `npx @next/codemod@canary upgrade latest` |
| PPR (v15 canary) | Cache Components (v16) | Follow official Vercel migration guide |

::: tip Run the official codemod first

```bash
npx @next/codemod@canary upgrade latest
```

This handles the majority of breaking changes automatically across all Next.js major versions.
:::

---

*Built for **Next.js 16+ App Router** — React 19, Cache Components, Turbopack, Server Actions, and React Compiler.*

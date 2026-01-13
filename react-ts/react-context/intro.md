# React Context with TypeScript: A Complete Guide

## Step 1: Understanding the Basics

Context solves the "prop drilling" problem. Instead of passing data through multiple components, you create a context that any component can access directly.

## Step 2: Creating a Simple Context

Let's start with a theme context example:

```ts
// src/contexts/ThemeContext.tsx
'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

// 1. Define the shape of your context data
type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

// 2. Create the context with a default value (or undefined)
const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

// 3. Create a provider component
interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>('light')

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

// 4. Create a custom hook for easy access
export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
```

## Step 3: Using the Context in Your App

In Next.js 16+ App Router, wrap your app with the provider:

```typescript
// src/app/layout.tsx
import { ThemeProvider } from '@/contexts/ThemeContext'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

## Step 4: Consuming the Context

Now any component can access the theme:

```typescript
// src/components/ThemeToggle.tsx
'use client'

import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/button'
import { Moon, Sun } from 'lucide-react'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <Button onClick={toggleTheme} variant="outline" size="icon">
      {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </Button>
  )
}
```

## Step 5: More Complex Example - User Authentication

Here's a more realistic example with authentication:

```typescript
// src/contexts/AuthContext.tsx
'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: string
  name: string
  email: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in on mount
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      // Your auth check logic here
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })

    if (response.ok) {
      const userData = await response.json()
      setUser(userData)
    } else {
      throw new Error('Login failed')
    }
  }

  const logout = () => {
    setUser(null)
    // Clear cookies, localStorage, etc.
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

Using it in a component:

```typescript
// src/components/UserProfile.tsx
'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export function UserProfile() {
  const { user, logout, isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <div>Please log in</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome, {user?.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
        <Button onClick={logout} className="mt-4" variant="destructive">
          Logout
        </Button>
      </CardContent>
    </Card>
  )
}
```

## Step 6: Combining Multiple Contexts

You can nest providers or create a combined provider:

```typescript
// src/app/layout.tsx
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AuthProvider } from '@/contexts/AuthContext'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
```

## Best Practices

1. **Use custom hooks**: Always create a custom hook (like `useTheme`) to access your context. This provides better error messages and TypeScript support.

2. **Split contexts**: Don't put everything in one giant context. Create separate contexts for different concerns (auth, theme, settings, etc).

3. **Avoid unnecessary re-renders**: Components that use context will re-render when the context value changes. To optimize, you can split contexts or use `useMemo` for the context value.

4. **TypeScript safety**: Always type your context properly. Using `undefined` as the initial value and checking in the custom hook ensures type safety.

5. **Mark as 'use client'**: In Next.js App Router, context providers must be client components, so always add `'use client'` at the top of your context files.

## Examples

- [Example-1](./ex1.md)
- [Example-2](./ex2.md)
- [Example-3](./ex3.md)

# Zustand State Management Guide with TypeScript (v5.0.9)

Complete guide for managing state in React/Next.js applications using Zustand v5.0.9 with TypeScript.

## Table of Contents

- [Installation](#installation)
- [What's New in Zustand v5](#whats-new-in-zustand-v5)
- [Basic Store Setup](#basic-store-setup)
- [Complete Example: Authentication + Shopping Cart](#complete-example)
- [Store Files](#store-files)
- [Components](#components)
- [Advanced Patterns](#advanced-patterns)
- [Best Practices](#best-practices)

---

## Installation

```bash
npm install zustand@5.0.9
# or
yarn add zustand@5.0.9
# or
pnpm add zustand@5.0.9
```

---

## What's New in Zustand v5

Zustand v5 introduces several changes:

1. **No more default exports** - Use named imports: `import { create } from 'zustand'`
2. **Middleware syntax changes** - More consistent API
3. **Better TypeScript inference** - Improved type safety
4. **New `createStore` API** - For vanilla stores without React
5. **`persist` middleware changes** - Updated storage API

---

## Basic Store Setup

### Simple Counter Store

`**store/useCounterStore.ts**`

```typescript
import { create } from 'zustand';

interface CounterState {
  count: number;
  increment: () => void;
  decrement: () => void;
  incrementByAmount: (amount: number) => void;
  reset: () => void;
}

export const useCounterStore = create<CounterState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  incrementByAmount: (amount) => set((state) => ({ count: state.count + amount })),
  reset: () => set({ count: 0 }),
}));
```

**Usage:**

```typescript
'use client';

import { useCounterStore } from '@/store/useCounterStore';

export default function Counter() {
  const count = useCounterStore((state) => state.count);
  const increment = useCounterStore((state) => state.increment);
  const decrement = useCounterStore((state) => state.decrement);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
    </div>
  );
}
```

---

## Complete Example

### Project Structure

```bash
src/
├── store/
│   ├── useAuthStore.ts
│   ├── useCartStore.ts
│   └── types.ts
├── components/
│   ├── Navbar.tsx
│   ├── ProductCard.tsx
│   ├── Cart.tsx
│   └── LoginForm.tsx
└── app/
    ├── page.tsx
    └── layout.tsx
```

---

## Store Files

### Type Definitions

`**store/types.ts**`

```typescript
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
}

export interface CartItem extends Product {
  quantity: number;
}
```

---

### Authentication Store (v5 syntax)

`**store/useAuthStore.ts**`

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from './types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (name: string, email: string, password: string) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          // Simulate API call
          await new Promise((resolve) => setTimeout(resolve, 1000));
          
          // Mock successful login
          const user: User = {
            id: '1',
            name: 'John Doe',
            email: email,
            avatar: 'https://via.placeholder.com/150',
          };

          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ 
            error: 'Login failed. Please try again.', 
            isLoading: false 
          });
        }
      },

      register: async (name: string, email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          // Simulate API call
          await new Promise((resolve) => setTimeout(resolve, 1000));
          
          const user: User = {
            id: Date.now().toString(),
            name,
            email,
          };

          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ 
            error: 'Registration failed. Please try again.', 
            isLoading: false 
          });
        }
      },

      logout: () => {
        set({ user: null, isAuthenticated: false, error: null });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      // In v5, you can optionally specify storage
      // storage: createJSONStorage(() => localStorage), // default is localStorage
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);
```

---

### Shopping Cart Store (v5 syntax)

`**store/useCartStore.ts**`

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, Product } from './types';

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  addItem: (product: Product) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getTotalItems: () => number;
  toggleCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (product) =>
        set((state) => {
          const existingItem = state.items.find((item) => item.id === product.id);
          
          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.id === product.id
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              ),
            };
          }
          
          return {
            items: [...state.items, { ...product, quantity: 1 }],
          };
        }),

      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),

      updateQuantity: (id, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return {
              items: state.items.filter((item) => item.id !== id),
            };
          }
          
          return {
            items: state.items.map((item) =>
              item.id === id ? { ...item, quantity } : item
            ),
          };
        }),

      clearCart: () => set({ items: [] }),

      getTotalPrice: () => {
        const state = get();
        return state.items.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        );
      },

      getTotalItems: () => {
        const state = get();
        return state.items.reduce((total, item) => total + item.quantity, 0);
      },

      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
    }),
    {
      name: 'cart-storage',
    }
  )
);
```

---

## Components

### Navbar Component

`**components/Navbar.tsx**

```typescript
'use client';

import { useAuthStore } from '@/store/useAuthStore';
import { useCartStore } from '@/store/useCartStore';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { getTotalItems, toggleCart } = useCartStore();

  return (
    <nav className="bg-blue-600 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold">My Store</h1>
        
        <div className="flex items-center gap-4">
          <button
            onClick={toggleCart}
            className="relative bg-white text-blue-600 px-4 py-2 rounded hover:bg-gray-100"
          >
            Cart
            {getTotalItems() > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                {getTotalItems()}
              </span>
            )}
          </button>

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span>Welcome, {user?.name}</span>
              <button
                onClick={logout}
                className="bg-red-500 px-4 py-2 rounded hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          ) : (
            <span>Not logged in</span>
          )}
        </div>
      </div>
    </nav>
  );
}
```

---

### Login Form Component

`**components/LoginForm.tsx**`

```typescript
'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Login</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          <button onClick={clearError} className="float-right">×</button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
```

---

### Product Card Component

``**components/ProductCard.tsx**`

```typescript
'use client';

import { useCartStore } from '@/store/useCartStore';
import { Product } from '@/store/types';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);

  return (
    <div className="border rounded-lg p-4 shadow hover:shadow-lg transition">
      <img
        src={product.image}
        alt={product.name}
        className="w-full h-48 object-cover rounded mb-3"
      />
      <h3 className="text-xl font-semibold mb-2">{product.name}</h3>
      <p className="text-gray-600 mb-3">{product.description}</p>
      <div className="flex justify-between items-center">
        <span className="text-2xl font-bold text-blue-600">
          ${product.price.toFixed(2)}
        </span>
        <button
          onClick={() => addItem(product)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}
```

---

### Cart Component

``**components/Cart.tsx**`

```typescript
'use client';

import { useCartStore } from '@/store/useCartStore';

export default function Cart() {
  const { 
    items, 
    isOpen, 
    removeItem, 
    updateQuantity, 
    clearCart, 
    getTotalPrice,
    toggleCart 
  } = useCartStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-lg p-6 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Shopping Cart</h2>
          <button
            onClick={toggleCart}
            className="text-2xl hover:text-red-500"
          >
            ×
          </button>
        </div>

        {items.length === 0 ? (
          <p className="text-gray-500">Your cart is empty</p>
        ) : (
          <>
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="border-b pb-4">
                  <div className="flex gap-3">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold">{item.name}</h3>
                      <p className="text-gray-600">${item.price.toFixed(2)}</p>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="bg-gray-200 px-2 py-1 rounded"
                        >
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="bg-gray-200 px-2 py-1 rounded"
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="ml-auto text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t pt-4">
              <div className="flex justify-between text-xl font-bold mb-4">
                <span>Total:</span>
                <span>${getTotalPrice().toFixed(2)}</span>
              </div>
              
              <button className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 mb-2">
                Checkout
              </button>
              
              <button
                onClick={clearCart}
                className="w-full bg-red-500 text-white py-3 rounded hover:bg-red-600"
              >
                Clear Cart
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

---

### Main Page

`**app/page.tsx**`

```typescript
'use client';

import Navbar from '@/components/Navbar';
import LoginForm from '@/components/LoginForm';
import ProductCard from '@/components/ProductCard';
import Cart from '@/components/Cart';
import { useAuthStore } from '@/store/useAuthStore';
import { Product } from '@/store/types';

const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Wireless Headphones',
    price: 99.99,
    image: 'https://via.placeholder.com/300x200',
    description: 'High-quality wireless headphones with noise cancellation',
  },
  {
    id: '2',
    name: 'Smart Watch',
    price: 249.99,
    image: 'https://via.placeholder.com/300x200',
    description: 'Fitness tracker with heart rate monitor',
  },
  {
    id: '3',
    name: 'Laptop Stand',
    price: 49.99,
    image: 'https://via.placeholder.com/300x200',
    description: 'Ergonomic adjustable laptop stand',
  },
  {
    id: '4',
    name: 'Mechanical Keyboard',
    price: 149.99,
    image: 'https://via.placeholder.com/300x200',
    description: 'RGB mechanical keyboard with blue switches',
  },
];

export default function Home() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Cart />
      
      <main className="container mx-auto p-6">
        {!isAuthenticated ? (
          <LoginForm />
        ) : (
          <div>
            <h1 className="text-3xl font-bold mb-6">Our Products</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {mockProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
```

---

## Advanced Patterns

### Using Immer Middleware (v5)

```bash
npm install immer
```

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface TodoState {
  todos: Array<{ id: string; text: string; completed: boolean }>;
  addTodo: (text: string) => void;
  toggleTodo: (id: string) => void;
}

export const useTodoStore = create<TodoState>()(
  immer((set) => ({
    todos: [],
    addTodo: (text) =>
      set((state) => {
        state.todos.push({
          id: Date.now().toString(),
          text,
          completed: false,
        });
      }),
    toggleTodo: (id) =>
      set((state) => {
        const todo = state.todos.find((t) => t.id === id);
        if (todo) {
          todo.completed = !todo.completed;
        }
      }),
  }))
);
```

---

### DevTools Middleware (v5)

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface State {
  count: number;
  increment: () => void;
}

export const useStore = create<State>()(
  devtools(
    (set) => ({
      count: 0,
      increment: () => set((state) => ({ count: state.count + 1 }), false, 'increment'),
    }),
    { name: 'CounterStore' }
  )
);
```

---

### Combining Multiple Middlewares (v5)

```typescript
import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface State {
  count: number;
  increment: () => void;
}

export const useStore = create<State>()(
  devtools(
    persist(
      immer((set) => ({
        count: 0,
        increment: () => set((state) => { state.count += 1; }),
      })),
      { name: 'my-store' }
    ),
    { name: 'MyStore' }
  )
);
```

---

### Slices Pattern with Better Types (v5)

```typescript
import { create, StateCreator } from 'zustand';

interface UserSlice {
  user: { name: string; email: string } | null;
  setUser: (user: { name: string; email: string }) => void;
}

interface CartSlice {
  items: string[];
  addItem: (item: string) => void;
}

type StoreState = UserSlice & CartSlice;

const createUserSlice: StateCreator<
  StoreState,
  [],
  [],
  UserSlice
> = (set) => ({
  user: null,
  setUser: (user) => set({ user }),
});

const createCartSlice: StateCreator<
  StoreState,
  [],
  [],
  CartSlice
> = (set) => ({
  items: [],
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
});

export const useStore = create<StoreState>()((...a) => ({
  ...createUserSlice(...a),
  ...createCartSlice(...a),
}));
```

---

### Subscribing to Store Changes (v5)

```typescript
// Subscribe to all changes
const unsub = useCartStore.subscribe((state) => {
  console.log('Cart updated:', state.items);
});

// Subscribe to specific state slice with selector
const unsub = useCartStore.subscribe(
  (state) => state.items,
  (items, prevItems) => {
    console.log('Items changed from', prevItems, 'to', items);
  }
);

// Subscribe with equality function
const unsub = useCartStore.subscribe(
  (state) => state.items,
  (items) => console.log('Items changed:', items),
  { equalityFn: (a, b) => a.length === b.length }
);

// Unsubscribe
unsub();
```

---

### Getting State Outside Components (v5)

```typescript
// Get current state
const currentUser = useAuthStore.getState().user;

// Get initial state
const initialState = useAuthStore.getInitialState();

// Call actions
useCartStore.getState().addItem(product);

// Set state directly
useAuthStore.setState({ user: null, isAuthenticated: false });
```

---

### Vanilla Store (without React) - v5

```typescript
import { createStore } from 'zustand/vanilla';

interface CounterState {
  count: number;
  increment: () => void;
}

export const counterStore = createStore<CounterState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));

// Use in React
import { useStore } from 'zustand';
import { counterStore } from './store';

function Counter() {
  const count = useStore(counterStore, (state) => state.count);
  const increment = useStore(counterStore, (state) => state.increment);
  
  return (
    <div>
      <p>{count}</p>
      <button onClick={increment}>+</button>
    </div>
  );
}
```

---

### Custom Storage Engine (v5)

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';

// Custom storage implementation
const customStorage: StateStorage = {
  getItem: (name) => {
    const value = sessionStorage.getItem(name);
    return value ?? null;
  },
  setItem: (name, value) => {
    sessionStorage.setItem(name, value);
  },
  removeItem: (name) => {
    sessionStorage.removeItem(name);
  },
};

interface State {
  count: number;
  increment: () => void;
}

export const useStore = create<State>()(
  persist(
    (set) => ({
      count: 0,
      increment: () => set((state) => ({ count: state.count + 1 })),
    }),
    {
      name: 'counter-storage',
      storage: createJSONStorage(() => customStorage),
    }
  )
);
```

---

### Async Storage with IndexedDB (v5)

```typescript
import { create } from 'zustand';
import { persist, StateStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval'; // npm install idb-keyval

const indexedDBStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};

interface State {
  data: string[];
  addData: (item: string) => void;
}

export const useStore = create<State>()(
  persist(
    (set) => ({
      data: [],
      addData: (item) => set((state) => ({ data: [...state.data, item] })),
    }),
    {
      name: 'async-storage',
      storage: indexedDBStorage,
    }
  )
);
```

---

## Best Practices

### 1. Use Named Exports (v5 requirement)

```typescript
// ✅ Good - Named export
export const useAuthStore = create<AuthState>()(...);

// ❌ Bad - Default export (old v4 style)
const useAuthStore = create<AuthState>()(...);
export default useAuthStore;
```

### 2. Organize Stores by Domain

```bash
store/
├── auth/
│   ├── useAuthStore.ts
│   └── types.ts
├── cart/
│   ├── useCartStore.ts
│   └── types.ts
└── products/
    ├── useProductStore.ts
    └── types.ts
```

### 3. Use Selectors to Prevent Unnecessary Re-renders

```typescript
// Bad - component re-renders on any state change
const state = useStore();

// Good - component only re-renders when count changes
const count = useStore((state) => state.count);
```

### 4. Use Shallow Comparison for Multiple Values

```typescript
import { shallow } from 'zustand/shallow';

const { items, total } = useCartStore(
  (state) => ({ items: state.items, total: state.getTotalPrice() }),
  shallow
);
```

### 5. Separate Actions from State

```typescript
// Create separate hooks for actions
export const useCartActions = () =>
  useCartStore((state) => ({
    addItem: state.addItem,
    removeItem: state.removeItem,
    clearCart: state.clearCart,
  }));

// Usage
const { addItem, removeItem } = useCartActions();
```

### 6. Type Safety with Strict Mode

```typescript
// Enable strict mode in tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true
  }
}
```

### 7. Reset Store Pattern

```typescript
const initialState = {
  user: null,
  isAuthenticated: false,
};

export const useAuthStore = create<AuthState>((set) => ({
  ...initialState,
  reset: () => set(initialState),
}));
```

### 8. Use Middleware Correctly (v5)

```typescript
// ✅ Correct - Double function call for middleware
export const useStore = create<State>()(
  persist(
    (set) => ({ /* state */ }),
    { name: 'storage' }
  )
);

// ❌ Wrong - Missing second function call
export const useStore = create<State>(
  persist(
    (set) => ({ /* state */ }),
    { name: 'storage' }
  )
);
```

---

## Testing Zustand Stores (v5)

```typescript
import { renderHook, act } from '@testing-library/react';
import { useCartStore } from '@/store/useCartStore';

describe('Cart Store', () => {
  beforeEach(() => {
    // Reset store before each test
    useCartStore.setState({ items: [], isOpen: false });
  });

  it('should add item to cart', () => {
    const { result } = renderHook(() => useCartStore());
    
    act(() => {
      result.current.addItem({
        id: '1',
        name: 'Test Product',
        price: 10,
        image: '',
        description: '',
      });
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.getTotalPrice()).toBe(10);
  });

  it('should increment quantity for existing item', () => {
    const { result } = renderHook(() => useCartStore());
    
    const product = {
      id: '1',
      name: 'Test Product',
      price: 10,
      image: '',
      description: '',
    };
    
    act(() => {
      result.current.addItem(product);
      result.current.addItem(product);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(2);
  });
});
```

---

## Migration from v4 to v5

### Key Changes

1. **Import Changes:**

```typescript
// v4
import create from 'zustand';

// v5
import { create } from 'zustand';
```

1. **Export Changes:**

```typescript
// v4
const useStore = create(...)
export default useStore;

// v5
export const useStore = create(...);
```

1. **Middleware Syntax:**

```typescript
// v4
const useStore = create(
  persist(
    (set) => ({ count: 0 }),
    { name: 'storage' }
  )
);

// v5
export const useStore = create()(
  persist(
    (set) => ({ count: 0 }),
    { name: 'storage' }
  )
);
```

1. **Storage API:**

```typescript
// v4
import { persist, createJSONStorage } from 'zustand/middleware';

// v5 - Same, but createJSONStorage is more explicit
import { persist, createJSONStorage } from 'zustand/middleware';

export const useStore = create()(
  persist(
    (set) => ({ count: 0 }),
    {
      name: 'storage',
      storage: createJSONStorage(() => localStorage), // More explicit
    }
  )
);
```

---

## Common Patterns & Tips

### Pattern 1: Computed Values

```typescript
export const useCartStore = create<CartState>()((set, get) => ({
  items: [],
  // Computed value as a function
  getTotalPrice: () => {
    return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  },
  // Or use it in a selector
}));

// Usage
const totalPrice = useCartStore((state) => state.getTotalPrice());
```

### Pattern 2: Transient Updates (don't persist)

```typescript
export const useStore = create<State>()(
  persist(
    (set) => ({
      // Will be persisted
      user: null,
      // Won't be persisted
      isLoading: false,
    }),
    {
      name: 'storage',
      partialize: (state) => ({ user: state.user }), // Only persist user
    }
  )
);
```

### Pattern 3: Store Composition

```typescript
// base-store.ts
export const useBaseStore = create(() => ({
  theme: 'light' as 'light' | 'dark',
}));

// user-store.ts
export const useUserStore = create(() => ({
  user: null as User | null,
}));

// Use both in components
function MyComponent() {
  const theme = useBaseStore((state) => state.theme);
  const user = useUserStore((state) => state.user);
}
```

### Pattern 4: Actions in Separate Object

```typescript
interface State {
  count: number;
}

interface Actions {
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

export const useCounterStore = create<State & Actions>((set) => ({
  // State
  count: 0,
  
  // Actions
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
}));
```

---

## Resources

- [Zustand v5 Official Docs](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [Zustand v5 Migration Guide](https://github.com/pmndrs/zustand/releases/tag/v5.0.0)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Next.js Documentation](https://nextjs.org/docs)

---

## Summary

Zustand v5 provides a simple, flexible, and type-safe way to manage state in React and Next.js applications. Key improvements in v5 include better TypeScript inference, more consistent API, and named exports for better tree-shaking.

**Key Changes in v5:**

- Named imports: `import { create } from 'zustand'`
- Named exports for stores
- Double function call for middleware
- Better TypeScript support
- More explicit storage API

The example above demonstrates a complete e-commerce application with authentication and shopping cart functionality, showcasing real-world patterns optimized for Zustand v5.

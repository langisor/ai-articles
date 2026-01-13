# Booklet TypeScript in React: A Quick Reference

<!-- toc -->

- [Booklet TypeScript in React: A Quick Reference](#booklet-typescript-in-react-a-quick-reference)
  - [Introduction: Why TypeScript in React?](#introduction-why-typescript-in-react)
  - [Essential Aspects of Using TypeScript in React](#essential-aspects-of-using-typescript-in-react)
    - [1. Project Setup](#1-project-setup)
    - [2. Typing Component Props](#2-typing-component-props)
    - [3. Typing State with `useState`](#3-typing-state-with-usestate)
    - [4. Typing Event Handlers](#4-typing-event-handlers)
    - [5. Typing Children (`React.ReactNode`)](#5-typing-children-reactreactnode)
    - [6. Strict Mode in `tsconfig.json`](#6-strict-mode-in-tsconfigjson)
  - [Advanced Patterns with TypeScript in React](#advanced-patterns-with-typescript-in-react)
    - [1. Custom Hooks](#1-custom-hooks)
    - [2. Context API](#2-context-api)
    - [3. Higher-Order Components (HOCs)](#3-higher-order-components-hocs)
    - [4. Render Props](#4-render-props)
    - [5. Utility Types for Components](#5-utility-types-for-components)
    - [6. Polymorphic Components (The `as` Prop)](#6-polymorphic-components-the-as-prop)
  - [Best Practices and Tips](#best-practices-and-tips)

<!-- tocstop -->

> This booklet will guide you through using TypeScript in React, starting with the essentials and moving into more advanced patterns. By the end, you'll have a solid reference for building robust and type-safe React applications.

## Introduction: Why TypeScript in React?

TypeScript is a superset of JavaScript that adds static typing to the language. When integrated with React, it provides numerous benefits:

- **Type Safety:** Catch type-related errors at compile time rather than at runtime, leading to fewer bugs in production.
- **Improved Code Readability and Maintainability:** Explicit types make it easier to understand the shape of data and function signatures, especially in large codebases and team environments.
- **Enhanced Developer Experience:** Better IDE support (autocompletion, refactoring, immediate error feedback) significantly boosts productivity.
- **Easier Refactoring:** The compiler can immediately identify parts of your application that might break after a change, making refactoring safer and more efficient.

## Essential Aspects of Using TypeScript in React

### 1\. Project Setup

To start a new React project with TypeScript, the easiest way is to use Create React App:

```bash
npx create-react-app my-ts-app --template typescript
cd my-ts-app
npm start
```

For an existing React project, you can add TypeScript by installing the necessary packages:

```bash
npm install --save-dev typescript @types/react @types/react-dom @types/node
```

You'll also need a `tsconfig.json` file to configure TypeScript. Create React App sets this up for you. For manual setup, ensure you have settings like `jsx: "react-jsx"` (or `react`), `lib` (including `dom`), and ideally `strict: true`.

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true, // Enable strict type-checking options
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx", // or "react" for older versions
    "moduleResolution": "node",
    "baseUrl": "src" // Example: allows absolute imports from 'src'
  },
  "include": ["src"]
}
```

### 2\. Typing Component Props

This is the most fundamental aspect of using TypeScript in React. You define an interface or type alias to describe the shape of your component's props.

```tsx
// src/components/Greeting.tsx

import React from "react";

// Define an interface for the component's props
interface GreetingProps {
  name: string;
  age?: number; // Optional prop
  isActive: boolean;
}

// Functional Component with props type annotation
const Greeting: React.FC<GreetingProps> = ({ name, age, isActive }) => {
  return (
    <div>
      <h1>Hello, {name}!</h1>
      {age && <p>You are {age} years old.</p>}
      <p>Status: {isActive ? "Active" : "Inactive"}</p>
    </div>
  );
};

export default Greeting;

// Usage example in App.tsx
// import Greeting from './components/Greeting';
// <Greeting name="Alice" isActive={true} />
// <Greeting name="Bob" age={30} isActive={false} />
```

**Key Points:**

- **`interface` vs. `type`:** Both can be used for defining prop types. `interface` is generally preferred for object shapes as it can be extended and implemented, while `type` aliases are more versatile for unions, intersections, and primitive types. For consistency, many prefer `type` for component props.

- **`React.FC` (Functional Component):** While widely used, `React.FC` implicitly provides `children` prop and `displayName`. For more explicit control and to avoid some issues with default props or generics, some prefer typing props directly on the function:

  ```tsx
  // Alternative for functional component typing
  const Greeting = ({ name, age, isActive }: GreetingProps) => {
    // ...
  };
  ```

  Both approaches are valid; choose what feels more comfortable for your team.

### 3\. Typing State with `useState`

`useState` can often infer the type of your state based on the initial value. However, for more complex types, especially when the initial state is `null` or an empty object that will later contain data, explicit typing is crucial.

```tsx
// src/components/Counter.tsx

import React, { useState } from "react";

interface User {
  id: number;
  name: string;
  email: string;
}

const Counter: React.FC = () => {
  // Type inference: `count` is inferred as number
  const [count, setCount] = useState(0);

  // Explicit type for an object state that might be null initially
  const [user, setUser] = useState<User | null>(null);

  // Explicit type for an array of objects
  const [items, setItems] = useState<string[]>([]);

  const increment = () => setCount((prevCount) => prevCount + 1);
  const loadUser = () => {
    // Simulate fetching user data
    setTimeout(() => {
      setUser({ id: 1, name: "John Doe", email: "john.doe@example.com" });
    }, 1000);
  };

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>Increment</button>

      {user ? (
        <div>
          <p>
            User: {user.name} ({user.email})
          </p>
        </div>
      ) : (
        <button onClick={loadUser}>Load User</button>
      )}

      {items.length === 0 && <p>No items yet.</p>}
    </div>
  );
};

export default Counter;
```

### 4\. Typing Event Handlers

React's synthetic event types are available in `@types/react`. You'll typically use `React.MouseEvent`, `React.ChangeEvent`, `React.FormEvent`, etc., and specify the HTML element type they originate from.

```tsx
// src/components/Form.tsx

import React, { useState } from "react";

const Form: React.FC = () => {
  const [inputValue, setInputValue] = useState<string>("");

  // Typing for an input change event
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  // Typing for a button click event
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    console.log("Button clicked!", event.currentTarget.tagName);
  };

  // Typing for a form submission event
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Prevent default form submission behavior
    console.log("Form submitted with value:", inputValue);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        placeholder="Type something..."
      />
      <button type="submit" onClick={handleClick}>
        Submit
      </button>
    </form>
  );
};

export default Form;
```

### 5\. Typing Children (`React.ReactNode`)

When a component accepts children, you typically type the `children` prop as `React.ReactNode`. This type is a union of all possible things React can render (JSX elements, strings, numbers, booleans, null, undefined).

```tsx
// src/components/Card.tsx

import React from "react";

interface CardProps {
  title: string;
  children: React.ReactNode; // Defines that this component accepts children
  footer?: React.ReactNode; // Optional footer content
}

const Card: React.FC<CardProps> = ({ title, children, footer }) => {
  return (
    <div style={`{ border: "1px solid #ccc", padding: "16px", margin: "16px" }`}>
      <h2>{title}</h2>
      <div>{children}</div>
      {footer && (
        <div
          style={`{
            marginTop: "10px",
            borderTop: "1px dashed #eee",
            paddingTop: "10px",
          }`}
        >
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;

// Usage example
// import Card from './components/Card';
// <Card title="My Awesome Card">
//   <p>This is the content of the card.</p>
//   <ul>
//     <li>Item 1</li>
//     <li>Item 2</li>
//   </ul>
// </Card>
// <Card title="Another Card" footer={<span>&copy; 2025</span>}>
//   <p>With a footer!</p>
// </Card>
```

### 6\. Strict Mode in `tsconfig.json`

Enabling `strict: true` in your `tsconfig.json` is highly recommended. It turns on a suite of stricter type-checking options that catch common programming errors and improve overall code quality.

## Advanced Patterns with TypeScript in React

### 1\. Custom Hooks

Custom hooks are functions that allow you to reuse stateful logic across components. Typing them involves specifying the types of their arguments and return values.

```tsx
// src/hooks/useFetch.ts

import { useState, useEffect } from "react";

interface FetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// Generic custom hook to fetch data
function useFetch<T>(url: string): FetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result: T = await response.json();
        setData(result);
      } catch (err: any) {
        // Type 'any' can be narrowed down if error structure is known
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url]);

  return { data, loading, error };
}

export default useFetch;
```

**Usage example in a component:**

```tsx
import useFetch from "../hooks/useFetch";
interface Post {
  id: number;
  title: string;
  body: string;
}
const PostsList: React.FC = () => {
  const {
    data: posts,
    loading,
    error,
  } = useFetch<Post[]>("https://jsonplaceholder.typicode.com/posts");
  if (loading) return <div>Loading posts...</div>;
  if (error) return <div>Error: {error}</div>;
  return (
    <div>
      <h1>Posts</h1>
      <ul>
        {posts?.map((post) => (
          <li key={post.id}>
            <h3>{post.title}</h3>
            <p>{post.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};
```

**Using `as const` for Tuples:**

When a custom hook returns an array, TypeScript might infer a union type (`(boolean | typeof load)[]`) instead of a tuple (`[boolean, typeof load]`). `as const` can fix this.

```tsx
// src/hooks/useToggle.ts

import { useState, useCallback } from "react";

// Using `as const` to ensure a tuple type is inferred
function useToggle(initialState: boolean = false) {
  const [state, setState] = useState(initialState);

  const toggle = useCallback(() => setState((prev) => !prev), []);

  return [state, toggle] as const;
}

export default useToggle;
```

**Usage:**

```tsx
import useToggle from "./hooks/useToggle";
const MyComponent: React.FC = () => {
  const [isOn, toggle] = useToggle(false); // isOn is boolean, toggle is () => void
  return <button onClick={toggle}>{isOn ? "On" : "Off"}</button>;
};
```

### 2\. Context API

Typing React Context involves creating an interface for your context value and providing an initial value that matches that type (often `null` with a runtime check).

```tsx
// src/context/ThemeContext.tsx

import React, { createContext, useState, useContext, ReactNode } from "react";

// 1. Define the shape of your context value
interface ThemeContextType {
  theme: "light" | "dark";
  toggleTheme: () => void;
}

// 2. Create the context with an initial value (can be null, but requires handling)
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// 3. Create a provider component
interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  const contextValue: ThemeContextType = {
    theme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// 4. Create a custom hook to consume the context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

// Usage example
// src/App.tsx
// import { ThemeProvider } from './context/ThemeContext';
// import ThemeSwitcher from './components/ThemeSwitcher';
// const App: React.FC = () => {
//   return (
//     <ThemeProvider>
//       <ThemeSwitcher />
//       {/* Other components that need theme */}
//     </ThemeProvider>
//   );
// };

// src/components/ThemeSwitcher.tsx
// import React from 'react';
// import { useTheme } from '../context/ThemeContext';
// const ThemeSwitcher: React.FC = () => {
//   const { theme, toggleTheme } = useTheme();
//   return (
//     <button onClick={toggleTheme}>
//       Switch to {theme === 'light' ? 'dark' : 'light'} theme
//     </button>
//   );
// };
```

### 3\. Higher-Order Components (HOCs)

<div class="summary">HOCs are functions that take a component and return a new component with enhanced props or behavior. Typing HOCs can be a bit tricky due to generics and prop manipulation.</div>

```tsx
// src/hocs/withLoading.tsx

import React, { ComponentType } from "react";

// Define the props that the HOC will inject
interface WithLoadingProps {
  isLoading: boolean;
}

// A generic HOC that adds a loading state
function withLoading<P extends object>(
  WrappedComponent: ComponentType<P & WithLoadingProps>
) {
  // Create a display name for better debugging in React Dev Tools
  const displayName =
    WrappedComponent.displayName || WrappedComponent.name || "Component";

  // Return a new functional component that wraps the original
  const ComponentWithLoading: React.FC<P> = (props) => {
    // In a real scenario, isLoading would come from state/props of the HOC's parent
    // or internal logic. For this example, we'll just hardcode it.
    const isLoading = true; // Example: This would come from some HOC-specific logic

    if (isLoading) {
      return <div>Loading...</div>;
    }

    // Spread both original props and injected props (using type assertion if needed)
    return <WrappedComponent {...(props as P)} isLoading={isLoading} />;
  };

  ComponentWithLoading.displayName = `withLoading(${displayName})`;
  return ComponentWithLoading;
}

export default withLoading;

// Usage example
// src/components/MyDataComponent.tsx
// import React from 'react';
// interface MyDataComponentProps {
//   data: string;
//   isLoading: boolean; // This prop will be injected by the HOC
// }
// const MyDataComponent: React.FC<MyDataComponentProps> = ({ data, isLoading }) => {
//   if (isLoading) return <div>Loading data inside component...</div>;
//   return <div>Data: {data}</div>;
// };

// src/App.tsx
// import withLoading from './hocs/withLoading';
// import MyDataComponent from './components/MyDataComponent';
// const LoadedDataComponent = withLoading(MyDataComponent);
// const App: React.FC = () => {
//   return (
//     <LoadedDataComponent data="Hello World" />
//   );
// };
```

**Explanation of HOC Typing:**

- `P extends object`: This is a generic type parameter representing the original props of the `WrappedComponent`. We use `object` as a general constraint.
- `ComponentType<P & WithLoadingProps>`: The `WrappedComponent` expects its original props (`P`) combined with the props injected by the HOC (`WithLoadingProps`). The `&` (intersection type) merges these two types.
- `React.FC<P>`: The returned component `ComponentWithLoading` only accepts the `P` (original) props from its consumer, as `WithLoadingProps` are handled internally by the HOC.

### 4\. Render Props

Render props is a pattern where a component takes a function as a prop, and that function returns a React element to be rendered. This allows the consumer to control the rendering logic.

```tsx
// src/components/DataFetcher.tsx

import React, { useState, useEffect, ReactNode } from "react";

// Define the interface for the data that will be fetched
interface UserData {
  id: number;
  name: string;
}

// Define the props for the DataFetcher component
interface DataFetcherProps {
  // The `render` prop is a function that receives the fetched data
  // and returns a ReactNode (JSX element, string, etc.)
  render: (data: UserData[]) => ReactNode;
  url: string;
}

const DataFetcher: React.FC<DataFetcherProps> = ({ render, url }) => {
  const [data, setData] = useState<UserData[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result: UserData[] = await response.json();
        setData(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url]);

  if (loading) return <div>Loading data...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data) return null; // Or some fallback UI

  // Call the render prop with the fetched data
  return <>{render(data)}</>;
};

export default DataFetcher;

// Usage example
// src/App.tsx
// import React from 'react';
// import DataFetcher from './components/DataFetcher';
// const App: React.FC = () => {
//   return (
//     <DataFetcher
//       url="https://jsonplaceholder.typicode.com/users"
//       render={(users) => (
//         <div>
//           <h2>User List (Render Prop)</h2>
//           <ul>
//             {users.map((user) => (
//               <li key={user.id}>{user.name}</li>
//             ))}
//           </ul>
//         </div>
//       )}
//     />
//   );
// };
```

### 5\. Utility Types for Components

TypeScript provides several built-in utility types that are incredibly useful when working with React components.

- **`Partial<T>`:** Makes all properties in `T` optional. Useful for default props or draft objects.

  ```tsx
  interface UserProfile {
    name: string;
    email: string;
    age?: number;
  }

  // A component that can take partial user data for editing
  const UserForm: React.FC<{ initialData: Partial<UserProfile> }> = ({ initialData }) => {
    const [formData, setFormData] = useState<Partial<UserProfile>>(initialData);
    // ... form logic
    return (/* ... */);
  };

  // Usage: <UserForm initialData={{ name: 'Jane' }} />
  ```

- **`Pick<T, K>`:** Constructs a type by picking the set of properties `K` from `T`.

  ```tsx
  interface Product {
    id: string;
    name: string;
    price: number;
    description: string;
    imageUrl: string;
  }

  // Component only needs name and price
  type ProductCardProps = Pick<Product, "name" | "price">;

  const ProductCard: React.FC<ProductCardProps> = ({ name, price }) => {
    return (
      <div>
        <h3>{name}</h3>
        <p>${price.toFixed(2)}</p>
      </div>
    );
  };
  ```

- **`Omit<T, K>`:** Constructs a type by omitting the set of properties `K` from `T`. Useful when extending a type but excluding certain properties.

  ```tsx
  // Assuming ButtonHTMLAttributes provides all standard button props
  type CustomButtonProps = Omit<
    React.ComponentPropsWithoutRef<"button">,
    "className" | "children"
  > & {
    variant: "primary" | "secondary";
    label: string;
    // Add any other custom props here
  };

  const CustomButton: React.FC<CustomButtonProps> = ({
    variant,
    label,
    ...rest
  }) => {
    const className = variant === "primary" ? "btn-primary" : "btn-secondary";
    return (
      <button className={className} {...rest}>
        {label}
      </button>
    );
  };
  ```

- **`Required<T>`:** Makes all properties in `T` required.

  ```tsx
  interface Config {
    apiKey?: string;
    endpoint?: string;
  }

  // Function that requires all config properties to be present
  function initializeApp(config: Required<Config>) {
    console.log(config.apiKey, config.endpoint); // Guaranteed to be present
  }
  ```

- **`React.ComponentProps<T>` / `React.ComponentPropsWithoutRef<T>` / `React.ComponentPropsWithRef<T>`:** These are powerful for "mirroring" props of existing HTML elements or React components.

  - `React.ComponentProps<'div'>` would give you all props for a `<div>` element.
  - `React.ComponentProps<typeof MyCustomComponent>` would give you the props for `MyCustomComponent`.
  - `ComponentPropsWithoutRef` and `ComponentPropsWithRef` are more explicit about whether the `ref` prop is included.

    <!-- end list -->

    ```tsx
    // Example: A wrapper around an HTML button
    type ButtonWrapperProps = React.ComponentPropsWithoutRef<"button"> & {
      customLabel: string;
    };

    const ButtonWrapper: React.FC<ButtonWrapperProps> = ({
      customLabel,
      ...rest
    }) => {
      return <button {...rest}>{customLabel}</button>;
    };

    // Usage: <ButtonWrapper customLabel="Click Me" onClick={() => alert('Clicked!')} type="submit" />
    ```

### 6\. Polymorphic Components (The `as` Prop)

Polymorphic components are components that can render as different HTML elements or React components based on a prop (commonly named `as` or `component`). Typing these requires a good understanding of generics and utility types.

```tsx
// src/components/PolymorphicButton.tsx

import React from "react";

// 1. Define the base props that are always present
type BaseProps = {
  children: React.ReactNode;
};

// 2. Define a default element type
type PolymorphicButtonProps<E extends React.ElementType = "button"> =
  BaseProps &
    // Merge the intrinsic element props, omitting base props
    Omit<React.ComponentPropsWithoutRef<E>, keyof BaseProps> & {
      as?: E; // The 'as' prop itself
    };

// 3. Implement the polymorphic component
function PolymorphicButton<E extends React.ElementType = "button">({
  as,
  children,
  ...rest
}: PolymorphicButtonProps<E>) {
  const Component = as || "button";
  return <Component {...rest}>{children}</Component>;
}

export default PolymorphicButton;

// Usage examples:
// import PolymorphicButton from './components/PolymorphicButton';

// Renders as a default button
// <PolymorphicButton onClick={() => alert('Button Clicked')}>
//   Default Button
// </PolymorphicButton>

// Renders as an anchor tag (<a>)
// <PolymorphicButton as="a" href="https://example.com" target="_blank">
//   Link Button
// </PolymorphicButton>

// Renders as a div
// <PolymorphicButton as="div" style={{ padding: '10px', background: 'lightblue' }}>
//   Div Button
// </PolymorphicButton>

// Renders as a custom component (e.g., from a UI library)
// const MyCustomLinkComponent = ({ to, children }: { to: string; children: React.ReactNode }) => (
//   <a href={to}>{children}</a>
// );
// <PolymorphicButton as={MyCustomLinkComponent} to="/dashboard">
//   Custom Link Button
// </PolymorphicButton>
```

**Explanation of Polymorphic Component Typing:**

- `E extends React.ElementType = 'button'`: This generic type parameter captures the element type (e.g., `'a'`, `'div'`, `typeof MyCustomComponent`). It defaults to `'button'`.
- `Omit<React.ComponentPropsWithoutRef<E>, keyof BaseProps>`: This is the core. It takes all the props of the selected element `E` (e.g., `<a>` props if `E` is `'a'`) and then removes any properties that are already defined in our `BaseProps` to prevent conflicts.
- The `as` prop itself is added as `as?: E;`.

---

## Best Practices and Tips

- **Enable Strict Mode:** Always start with `strict: true` in your `tsconfig.json`. It catches many common errors.
- **Avoid `any`:** While convenient, `any` defeats the purpose of TypeScript. Try to be as specific as possible. If you truly don't know the type, consider `unknown` and then narrow it down with type guards.
- **Organize Your Types:** For larger projects, consider a `types` directory or separate type definition files (e.g., `your-component.d.ts` or `types.ts`).
- **Leverage Type Inference:** Let TypeScript infer types when it can, especially for simple `useState` calls or function return types. Don't over-annotate.
- **Use Interfaces for Objects, Types for Unions/Intersections:** This is a common convention, though both can often achieve similar results.
- **Read React TypeScript Cheatsheets:** This is an invaluable resource for various React-TypeScript patterns and common questions.
- **ESLint with TypeScript:** Integrate ESLint with TypeScript support to enforce consistent coding styles and catch potential issues early.
- **Keep `@types/*` packages updated:** Ensure your `@types/react` and `@types/react-dom` packages match your React version.

---

This booklet should serve as a solid foundation and quick reference for effectively using TypeScript in your React projects. Remember that consistent application of these patterns will lead to more robust, maintainable, and enjoyable code. Happy coding\!

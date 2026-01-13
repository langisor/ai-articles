# Combining `useReducer` hook with `Typescript`

The `useReducer` hook in React is an alternative to `useState` for managing more complex state logic, especially when the next state depends on the previous one or when the state logic involves multiple sub-values. It's often preferred over `useState` when dealing with complex state transitions that might otherwise lead to a lot of nested `if/else` statements or `switch` cases within your component.

When combined with TypeScript, `useReducer` becomes even more powerful as TypeScript helps you define strict types for your state, actions, and reducer function, leading to more robust and maintainable code.

Here's a detailed explanation of how to apply the `useReducer` hook using TypeScript, along with examples:

<!-- toc -->

- [Combining `useReducer` hook with `Typescript`](#combining-usereducer-hook-with-typescript)
  - [Understanding the Core Concepts](#understanding-the-core-concepts)
  - [`useReducer` Signature](#usereducer-signature)
  - [TypeScript and `useReducer`](#typescript-and-usereducer)
    - [Example: Simple Counter](#example-simple-counter)
      - [Step 1: Define the State Type](#step-1-define-the-state-type)
      - [Step 2: Define Action Types](#step-2-define-action-types)
      - [Step 3: Create the Reducer Function](#step-3-create-the-reducer-function)
      - [Step 4: Use `useReducer` in your Component](#step-4-use-usereducer-in-your-component)
    - [More Complex Example: Todo List](#more-complex-example-todo-list)
      - [Step 1: Define State Types](#step-1-define-state-types)
      - [Step 2: Define Action Types](#step-2-define-action-types-1)
      - [Step 3: Create the Reducer Function](#step-3-create-the-reducer-function-1)
      - [Step 4: Use `useReducer` in your Component](#step-4-use-usereducer-in-your-component-1)
  - [Benefits of using `useReducer` with TypeScript](#benefits-of-using-usereducer-with-typescript)
  - [When to use `useReducer` vs `useState`](#when-to-use-usereducer-vs-usestate)
  - [Comperhensive Examples](#comperhensive-examples)

<!-- tocstop -->

## Understanding the Core Concepts

Before diving into the TypeScript specifics, let's briefly review the core concepts of `useReducer`:

- **State:** The data that your component manages.
- **Action:** A plain JavaScript object that describes _what happened_. Actions typically have a `type` property (a string) and optionally a `payload` property (any data related to the action).
- **Reducer Function:** A pure function that takes the current `state` and an `action` as arguments and returns the `new state`. It's crucial that the reducer function is pure, meaning it doesn't cause any side effects (like API calls or DOM manipulation) and always returns the same output for the same input.
- **`dispatch` Function:** A function returned by `useReducer` that you use to send actions to the reducer. When you call `dispatch` with an action, the reducer function is executed with the current state and that action, and the component re-renders with the new state.

## `useReducer` Signature

The `useReducer` hook has the following signature:

```typescript
const [state, dispatch] = useReducer(reducer, initialState, init);
```

- `reducer`: Your reducer function.
- `initialState`: The initial state value.
- `init` (optional): An initializer function that computes the initial state lazily. If provided, `initialState` is passed to `init`, and `init`'s return value is used as the initial state. This is useful for expensive initial state calculations.

## TypeScript and `useReducer`

TypeScript enhances `useReducer` by allowing you to define the types for:

1. **State:** The shape of your state object.
2. **Actions:** The different types of actions your reducer can handle, including their `type` and `payload` (if any).
3. **Reducer Function:** The types of its arguments (`state`, `action`) and its return value (`state`).

Let's break it down with an example: a simple counter with increment, decrement, and reset functionality.

### Example: Simple Counter

#### Step 1: Define the State Type

First, define the type for your state. For a simple counter, it might just be a number.

```typescript
// types.ts or directly in your component file
interface CounterState {
  count: number;
}
```

#### Step 2: Define Action Types

Next, define the types for your actions. This is often done using a discriminated union, which is a powerful TypeScript feature for representing a fixed set of distinct types.

```typescript
// types.ts
type CounterAction =
  | { type: "increment"; payload: number }
  | { type: "decrement"; payload: number }
  | { type: "reset" };
```

Here:

- `'increment'` and `'decrement'` actions have a `payload` of type `number`.
- `'reset'` action has no payload.

#### Step 3: Create the Reducer Function-1

Now, write your reducer function, making sure to type its arguments and return value.

```typescript
// counterReducer.ts or directly in your component file
function counterReducer(
  state: CounterState,
  action: CounterAction
): CounterState {
  switch (action.type) {
    case "increment":
      return { count: state.count + action.payload };
    case "decrement":
      return { count: state.count - action.payload };
    case "reset":
      return { count: 0 };
    default:
      // It's good practice to throw an error for unknown action types
      // or return the current state for unhandled actions.
      // TypeScript will often infer that this branch is unreachable if your action types cover all possibilities.
      const exhaustiveCheck: never = action; // This ensures all action types are handled
      throw new Error(`Unhandled action type: ${exhaustiveCheck}`);
  }
}
```

- `state: CounterState`: Ensures the `state` argument conforms to `CounterState`.
- `action: CounterAction`: Ensures the `action` argument conforms to `CounterAction`.
- `: CounterState`: Ensures the function returns a `CounterState` object.
- The `default` case with `exhaustiveCheck` is a TypeScript pattern to ensure that all possible `action.type` values are explicitly handled in your `switch` statement. If you later add a new action type to `CounterAction` but forget to add a `case` for it, TypeScript will flag an error here.

#### Step 4: Use `useReducer` in your Component

Finally, integrate `useReducer` into your React component.

```tsx
// Counter.tsx
import React, { useReducer } from "react";

interface CounterState {
  count: number;
}

type CounterAction =
  | { type: "increment"; payload: number }
  | { type: "decrement"; payload: number }
  | { type: "reset" };

function counterReducer(
  state: CounterState,
  action: CounterAction
): CounterState {
  switch (action.type) {
    case "increment":
      return { count: state.count + action.payload };
    case "decrement":
      return { count: state.count - action.payload };
    case "reset":
      return { count: 0 };
    default:
      const exhaustiveCheck: never = action;
      throw new Error(`Unhandled action type: ${exhaustiveCheck}`);
  }
}

const initialState: CounterState = { count: 0 };

function Counter() {
  const [state, dispatch] = useReducer(counterReducer, initialState);

  return (
    <div>
      <h1>Count: {state.count}</h1>
      <button onClick={() => dispatch({ type: "increment", payload: 1 })}>
        Increment by 1
      </button>
      <button onClick={() => dispatch({ type: "increment", payload: 5 })}>
        Increment by 5
      </button>
      <button onClick={() => dispatch({ type: "decrement", payload: 1 })}>
        Decrement by 1
      </button>
      <button onClick={() => dispatch({ type: "reset" })}>Reset</button>
    </div>
  );
}

export default Counter;
```

In this component:

- `useReducer(counterReducer, initialState)`:
  - TypeScript infers the type of `state` to be `CounterState` based on `initialState` and the `reducer`'s return type.
  - TypeScript infers the type of `dispatch` based on the `action` argument of `counterReducer`, meaning `dispatch` will only accept actions conforming to `CounterAction`.

### More Complex Example: Todo List

Let's consider a slightly more complex scenario: a Todo List application.

#### Step 1: Define State Types

```typescript
// types.ts
interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

interface TodoState {
  todos: Todo[];
}
```

#### Step 2: Define Action Types-1

```typescript
// types.ts
type TodoAction =
  | { type: "ADD_TODO"; payload: { text: string } }
  | { type: "TOGGLE_TODO"; payload: { id: string } }
  | { type: "REMOVE_TODO"; payload: { id: string } };
```

#### Step 3: Create the Reducer Function

```tsx
// todoReducer.ts
import { Todo, TodoState, TodoAction } from "./types"; // Assuming types.ts

function todoReducer(state: TodoState, action: TodoAction): TodoState {
  switch (action.type) {
    case "ADD_TODO":
      return {
        todos: [
          ...state.todos,
          {
            id: Date.now().toString(),
            text: action.payload.text,
            completed: false,
          },
        ],
      };
    case "TOGGLE_TODO":
      return {
        todos: state.todos.map((todo) =>
          todo.id === action.payload.id
            ? { ...todo, completed: !todo.completed }
            : todo
        ),
      };
    case "REMOVE_TODO":
      return {
        todos: state.todos.filter((todo) => todo.id !== action.payload.id),
      };
    default:
      const exhaustiveCheck: never = action;
      throw new Error(`Unhandled action type: ${exhaustiveCheck}`);
  }
}
```

#### Step 4: Use `useReducer` in your Component-1

```typescript jsx
// TodoApp.tsx
import React, { useReducer, useState } from 'react';
import { Todo, TodoState, TodoAction } from './types'; // Assuming types.ts
import { todoReducer } from './todoReducer'; // Assuming todoReducer.ts

const initialState: TodoState = {
  todos: [],
};

function TodoApp() {
  const [state, dispatch] = useReducer(todoReducer, initialState);
  const [newTodoText, setNewTodoText] = useState('');

  const handleAddTodo = () => {
    if (newTodoText.trim()) {
      dispatch({ type: 'ADD_TODO', payload: { text: newTodoText } });
      setNewTodoText('');
    }
  };

  return (
    <div>
      <h1>Todo List</h1>
      <div>
        <input
          type="text"
          value={newTodoText}
          onChange={(e) => setNewTodoText(e.target.value)}
          placeholder="Add a new todo"
        />
        <button onClick={handleAddTodo}>Add Todo</button>
      </div>
      <ul>
        {state.todos.map((todo) => (
          <li key={todo.id} style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
            {todo.text}
            <button onClick={() => dispatch({ type: 'TOGGLE_TODO', payload: { id: todo.id } })}>
              Toggle
            </button>
            <button onClick={() => dispatch({ type: 'REMOVE_TODO', payload: { id: todo.id } })}>
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TodoApp;
```

## Benefits of using `useReducer` with TypeScript

1. **Type Safety:** TypeScript ensures that your state, actions, and reducer functions adhere to their defined types, catching errors at compile time rather than runtime.
2. **Improved Readability:** Explicitly defined types make it clear what data shapes your state and actions take, improving code understanding for you and other developers.
3. **Better Maintainability:** When you modify state or action structures, TypeScript will highlight all places that need updates, preventing inconsistencies.
4. **Enhanced Autocompletion:** Your IDE will provide excellent autocompletion for action types and payload properties, making development faster and less error-prone.
5. **Centralized State Logic:** The reducer function centralizes all state transition logic, making it easier to reason about and test independently.
6. **Scalability:** For larger applications with complex state, `useReducer` provides a more scalable and organized approach than managing many `useState` hooks.

## When to use `useReducer` vs `useState`

- **`useState`:** Ideal for simple state (e.g., boolean flags, numbers, strings, simple objects) where updates are straightforward.
- **`useReducer`:** Preferred for:
  - **Complex state logic:** When state transitions involve multiple values or complex calculations.
  - **Related state:** When state updates often depend on the previous state.
  - **Performance optimizations:** If dispatching many updates, `useReducer` can sometimes be more performant than multiple `useState` calls because React batches updates.
  - **Sharing state logic:** The reducer function can be externalized and reused across multiple components.

By combining `useReducer` with TypeScript, you gain the benefits of predictable state management and the robustness of static type checking, leading to more reliable and easier-to-maintain React applications.

## Comperhensive Examples

- [Example: Shopping Cart Management](../examples/shopping-cart-management.md)

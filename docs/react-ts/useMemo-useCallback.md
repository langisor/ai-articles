# `React` `useMemo` `useCallback` hooks

> You should use `useMemo` and `useCallback` in React with `TypeScript` primarily for performance optimization by memoizing expensive calculations or function definitions, preventing unnecessary re-renders of child components.

-----

## 💡 Key Concepts: Memoization

**Memoization** is a technique where the result of an expensive function call is cached, and the cached result is returned when the same inputs occur again.

* **`useMemo`**: Memoizes a **value**.
* **`useCallback`**: Memoizes a **function** definition.

-----

## 1\. When and How to use `useMemo`

The `useMemo` hook is used to **memoize a calculated value**. It only re-calculates the value when one of its **dependencies** changes.

### ➡️ Syntax (TypeScript)

```typescript
const memoizedValue = useMemo<TResult>(
  () => {
    // Expensive calculation goes here
    return result;
  },
  [dependency1, dependency2] // Dependencies array
);
```

### 🗓️ Real Example Situation: Expensive Calculation

Use `useMemo` when you have a **complex, time-consuming calculation** inside your component that shouldn't run on every single render, especially if only unrelated props/state have changed.

**Scenario**: Filtering a large list of items based on a search term.

```tsx
import React, { useMemo, useState } from 'react';

// Define the type for an item
interface Item {
  id: number;
  name: string;
  category: string;
}

const ItemList: React.FC<{ items: Item[]; searchTerm: string }> = ({ items, searchTerm }) => {
  // Use useMemo to memoize the filtered list
  const filteredItems = useMemo<Item[]>(() => {
    console.log('Filtering items...'); // This log indicates when the calculation runs
    if (!searchTerm) {
      return items;
    }
    return items.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]); // Dependencies: only re-calculate when 'items' or 'searchTerm' changes

  return (
    <div>
      <h3>Filtered Results ({filteredItems.length})</h3>
      <ul>
        {filteredItems.map(item => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
};

// --- Parent Component for context ---
const App: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [count, setCount] = useState(0); // State for unrelated re-renders
  const data: Item[] = useMemo(() => ([ /* large array of data */ ]), []); // Mock data

  return (
    <div>
      <input
        type="text"
        placeholder="Search..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <button onClick={() => setCount(c => c + 1)}>
        Rerender (Count: {count})
      </button>
      {/* ItemList's filtering is skipped when 'count' changes, but 'searchTerm' doesn't */}
      <ItemList items={data} searchTerm={searchTerm} />
    </div>
  );
};
```

-----

## 2\. When and How to use `useCallback`

The `useCallback` hook is used to **memoize a function definition**. It returns a memoized version of the function that only changes if one of its **dependencies** has changed.

## Syntax (TypeScript)

```typescript
const memoizedFunction = useCallback<TFunction>(
  (arg1: TArg1, arg2: TArg2): TResult => {
    // Function logic goes here
    return result;
  },
  [dependency1, dependency2] // Dependencies array
);
```

### 🗓️ Real Example Situation: Passing a Prop to a Memoized Child Component

Use `useCallback` when you pass a function as a prop to a child component that is wrapped in **`React.memo()`**.

**Why?** In React, functions are recreated on *every* render of the parent component. When a new function is passed as a prop, the `React.memo()` child component sees a **prop change** (since `oldFunction !== newFunction`) and **re-renders unnecessarily**. `useCallback` prevents this.

**Scenario**: Preventing a memoized button component from re-rendering just because its `onClick` handler is recreated.

```tsx
import React, { useCallback, useState } from 'react';

// 1. Child component wrapped in React.memo for optimization
interface ButtonProps {
  onClick: (value: string) => void;
  label: string;
}

// React.memo ensures this component only re-renders if its props change (shallow comparison)
const MemoizedButton = React.memo<ButtonProps>(({ onClick, label }) => {
  console.log(`Rendering ${label} Button`);
  return (
    <button onClick={() => onClick(label)}>
      {label}
    </button>
  );
});


// 2. Parent component
const ParentComponent: React.FC = () => {
  const [count, setCount] = useState(0);
  const [inputVal, setInputVal] = useState('');

  // ❌ Without useCallback: handleButtonClick would be a new function on every render,
  //    forcing MemoizedButton to re-render even if 'count' hasn't changed.

  // ✅ With useCallback: The function definition is memoized. It only changes
  //    when 'count' (its dependency) changes.
  const handleButtonClick = useCallback((buttonLabel: string) => {
    setCount(c => c + 1);
    console.log(`Button ${buttonLabel} clicked. New count: ${count + 1}`);
  }, [count]); // Dependency: The count state, since it's used inside setCount (though here c=>c+1 is safer)

  return (
    <div>
      <input
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        placeholder="Typing causes re-render"
      />
      <p>Current Count: {count}</p>

      {/* This button will only re-render when 'count' changes, thanks to useMemoizedButton and useCallback */}
      <MemoizedButton
        label="Increment"
        onClick={handleButtonClick}
      />
    </div>
  );
};
```

-----

## 🛑 When NOT to use them

Avoid using `useMemo` or `useCallback` in these situations:

1. **Trivial Calculations**: If the computation is simple (e.g., `a + b`, a simple string concatenation, or filtering a small array), the overhead of the hook itself often outweighs the performance gain.
2. **Every Function/Value**: Don't wrap every function or value in your component. This adds complexity and memory overhead. **Only use them for performance-critical scenarios** (heavy computations or passing props to memoized child components).
3. **No Dependencies**: If your function or value doesn't rely on state or props, you can often define it *outside* the component function entirely, which is the ultimate form of memoization.

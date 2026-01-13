# Shopping Cart Management

## Example 2: Shopping Cart Management

A shopping cart often involves adding items, updating quantities, removing items, and calculating totals. This is a classic use case for `useReducer`.

### Scenario: E-commerce Shopping Cart

We'll manage a cart with items, each having an ID, name, price, and quantity.

#### 1\. Define State Types

The state will hold the list of items in the cart and potentially other derived values like `totalItems` and `totalPrice`.

```ts
// types.ts
interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
}
```

#### 2\. Define Action Types

Actions will cover adding, removing, and updating quantities of items.

```typescript
// types.ts
type CartAction =
  | {
      type: "ADD_ITEM";
      payload: { item: Omit<CartItem, "quantity">; quantity?: number };
    }
  | { type: "REMOVE_ITEM"; payload: { id: string } }
  | { type: "UPDATE_QUANTITY"; payload: { id: string; quantity: number } }
  | { type: "CLEAR_CART" };
```

- `Omit<CartItem, 'quantity'>`: When adding an item, we typically provide its base details and an optional initial quantity. The `quantity` property is omitted from the input `item` because the reducer will manage it.

#### 3\. Create the Reducer Function

The reducer will handle all cart modifications and recalculate `totalItems` and `totalPrice` on every relevant action.

```tsx
// cartReducer.ts
import { CartItem, CartState, CartAction } from "./types"; // Assuming types.ts

const calculateTotals = (
  items: CartItem[]
): { totalItems: number; totalPrice: number } => {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  return { totalItems, totalPrice };
};

export const initialCartState: CartState = {
  items: [],
  totalItems: 0,
  totalPrice: 0,
};

export function cartReducer(state: CartState, action: CartAction): CartState {
  let updatedItems: CartItem[];

  switch (action.type) {
    case "ADD_ITEM":
      const { item, quantity = 1 } = action.payload;
      const existingItem = state.items.find((i) => i.id === item.id);

      if (existingItem) {
        updatedItems = state.items.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i
        );
      } else {
        updatedItems = [...state.items, { ...item, quantity }];
      }
      break;

    case "REMOVE_ITEM":
      updatedItems = state.items.filter(
        (item) => item.id !== action.payload.id
      );
      break;

    case "UPDATE_QUANTITY":
      updatedItems = state.items
        .map((item) =>
          item.id === action.payload.id
            ? { ...item, quantity: Math.max(0, action.payload.quantity) } // Ensure quantity doesn't go below 0
            : item
        )
        .filter((item) => item.quantity > 0); // Remove if quantity becomes 0
      break;

    case "CLEAR_CART":
      updatedItems = [];
      break;

    default:
      const exhaustiveCheck: never = action;
      throw new Error(`Unhandled action type: ${exhaustiveCheck}`);
  }

  const { totalItems, totalPrice } = calculateTotals(updatedItems);
  return {
    items: updatedItems,
    totalItems,
    totalPrice,
  };
}
```

- The `calculateTotals` helper function ensures that `totalItems` and `totalPrice` are always up-to-date.
- The reducer handles logic for incrementing quantity if an item already exists or adding a new item.

#### 4\. Use `useReducer` in your Component

```typescript
// ShoppingCart.tsx
import React, { useReducer } from 'react';
import { initialCartState, cartReducer } from './cartReducer'; // Assuming cartReducer.ts
import { CartItem } from './types'; // Assuming types.ts

// Dummy product data
const products = [
  { id: 'p1', name: 'Laptop', price: 1200 },
  { id: 'p2', name: 'Mouse', price: 25 },
  { id: 'p3', name: 'Keyboard', price: 75 },
];

function ShoppingCart() {
  const [cartState, dispatch] = useReducer(cartReducer, initialCartState);

  const handleAddToCart = (product: Omit<CartItem, 'quantity'>) => {
    dispatch({ type: 'ADD_ITEM', payload: { item: product, quantity: 1 } });
  };

  const handleRemoveFromCart = (id: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { id } });
  };

  const handleUpdateQuantity = (id: string, newQuantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity: newQuantity } });
  };

  return (
    <div>
      <h1>Products</h1>
      <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
        {products.map((product) => (
          <div key={product.id} style={{ border: '1px solid #ccc', padding: '10px' }}>
            <h3>{product.name}</h3>
            <p>${product.price.toFixed(2)}</p>
            <button onClick={() => handleAddToCart(product)}>Add to Cart</button>
          </div>
        ))}
      </div>

      <h1>Shopping Cart</h1>
      {cartState.items.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <>
          <ul>
            {cartState.items.map((item) => (
              <li key={item.id}>
                {item.name} - ${item.price.toFixed(2)} x{' '}
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => handleUpdateQuantity(item.id, parseInt(e.target.value))}
                  min="1"
                  style={{ width: '50px' }}
                />
                <button onClick={() => handleRemoveFromCart(item.id)} style={{ marginLeft: '10px' }}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <h3>Total Items: {cartState.totalItems}</h3>
          <h3>Total Price: ${cartState.totalPrice.toFixed(2)}</h3>
          <button onClick={() => dispatch({ type: 'CLEAR_CART' })}>Clear Cart</button>
        </>
      )}
    </div>
  );
}

export default ShoppingCart;
```

These two examples demonstrate how `useReducer` with TypeScript can effectively manage more intricate state logic, promote better code organization, and leverage TypeScript's type safety for more robust applications. The benefits become more apparent as your application grows in complexity.

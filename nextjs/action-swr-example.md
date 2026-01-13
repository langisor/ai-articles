# Basic Example : `useSWR` and Server Action

## 1\. Define Your Server Action (The `use server` Function)

Your server action, which will handle the data mutation, needs the `'use server'` directive and should accept the form data.

Assuming you want to update a user's name and email, your server action file (e.g., `app/actions/user.ts`) might look like this:

```typescript
// app/actions/user.ts
"use server";

import { revalidatePath } from "next/cache";

interface User {
  user_id: number;
  name: string;
  user_name: string;
  email: string;
  created_at: Date;
}

// NOTE: The Server Action must accept a FormData object when used directly in a <form action="...">
export async function updateUser(
  formData: FormData
): Promise<{ success: boolean; message: string }> {
  // 1. Extract data from the FormData object
  const userId = formData.get("userId");
  const newName = formData.get("name") as string;
  const newEmail = formData.get("email") as string;

  // You'll need to handle validation and type assertion here
  if (!userId || !newName || !newEmail) {
    return { success: false, message: "Missing required fields." };
  }

  const user_id = Number(userId);

  try {
    // 2. Perform the database mutation (Replace with your actual logic)
    // const updatedUser = await db.user.update({
    //     where: { user_id },
    //     data: { name: newName, email: newEmail },
    // });

    console.log(
      `Updating user ${user_id}: Name: ${newName}, Email: ${newEmail}`
    );

    // 3. (Optional but recommended for data fetching) Revalidate any cached data
    // This is crucial if you have a page displaying this user's data.
    revalidatePath("/dashboard/users");

    return { success: true, message: "User updated successfully." };
  } catch (error) {
    console.error("Update failed:", error);
    return {
      success: false,
      message: "Failed to update user due to a server error.",
    };
  }
}
```

---

## 2\. Use the Server Action in a Client Component Form

You will use a Client Component to render the interactive form and import the Server Action to use in the `action` prop of the `<form>` element.

```tsx
// app/dashboard/users/edit-form.tsx
"use client";

import { updateUser } from "@/app/actions/user";
import { experimental_useFormStatus as useFormStatus } from "react-dom";
import { useState } from "react";

// Simplified type based on your interface
interface InitialUser {
  user_id: number;
  name: string;
  email: string;
}

// A helper component to manage the button's loading state
function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="p-2 bg-blue-500 text-white rounded"
    >
      {pending ? "Saving..." : "Save Changes"}
    </button>
  );
}

export function EditUserForm({ user }: { user: InitialUser }) {
  const [statusMessage, setStatusMessage] = useState("");

  // This is the **key step**: Bind the Server Action to a client-side function
  const handleSubmit = async (formData: FormData) => {
    setStatusMessage("Saving...");
    const result = await updateUser(formData);

    // Handle the response from the Server Action
    if (result.success) {
      setStatusMessage(`✅ ${result.message}`);
    } else {
      setStatusMessage(`❌ ${result.message}`);
    }
  };

  return (
    // The form action can be bound to the client-side handleSubmit wrapper
    <form action={handleSubmit} className="space-y-4 p-4 border rounded shadow">
      {/* Hidden field for the ID - Server Actions get all form fields */}
      <input type="hidden" name="userId" value={user.user_id} />

      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          name="name" // The 'name' attribute is crucial for FormData
          type="text"
          defaultValue={user.name}
          required
          className="mt-1 p-2 w-full border rounded"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email" // The 'name' attribute is crucial for FormData
          type="email"
          defaultValue={user.email}
          required
          className="mt-1 p-2 w-full border rounded"
        />
      </div>

      <SubmitButton />

      {statusMessage && <p className="mt-2 text-sm">{statusMessage}</p>}
    </form>
  );
}
```

### Explanation of Key Concepts

1. **Form Data Handling:**
   - When you use an async function in the `<form action={...}>` prop, the browser automatically serializes all form fields (using their **`name`** attributes) into a standard **`FormData`** object and passes it as the **first argument** to your Server Action.
2. **Progressive Enhancement:**
   - By binding the action to the form, the form will submit and work even if JavaScript is disabled. This is the **Progressive Enhancement** feature.
3. **`useFormStatus` (Client Component Hook):**
   - This hook (from `react-dom`) is used in any component _inside_ the `<form>` to get the submission status, letting you disable the button and show a "Saving..." state automatically.
4. **Returning Values:**
   - The Server Action returns a value (e.g., `{ success: boolean; message: string }`). When called from a Client Component (like in the `handleSubmit` wrapper), you can await this result to handle success or error messages on the client side.
5. **`revalidatePath`:**
   - Since a successful mutation changes your data, calling `revalidatePath('/path')` inside the Server Action tells Next.js to purge the cache for that path, ensuring subsequent navigation or server fetches get the new data.

---

## Adding Errors Handling

That's an excellent next step\! Handling validation errors from the Server Action and displaying them in your Client Component form is crucial for a good user experience.

Here's how you can achieve this by modifying both the Server Action and the Client Component:

## 1\. Modify the Server Action to Return Validation Errors 🛠️

Instead of a simple success/failure message, the Server Action should return a more structured object that includes an **`errors`** field for client-side display.

```typescript
// app/actions/user.ts (Modified)
"use server";

import { revalidatePath } from "next/cache";

// Define the shape of your expected result
interface ServerActionResult {
  success: boolean;
  message: string;
  errors?: {
    name?: string;
    email?: string;
  };
}

export async function updateUser(
  formData: FormData
): Promise<ServerActionResult> {
  const userId = formData.get("userId");
  const newName = formData.get("name") as string;
  const newEmail = formData.get("email") as string;

  // --- 1. Perform Validation ---
  const errors: ServerActionResult["errors"] = {};

  if (!newName || newName.length < 3) {
    errors.name = "Name must be at least 3 characters.";
  }

  // Simple email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!newEmail || !emailRegex.test(newEmail)) {
    errors.email = "Please provide a valid email address.";
  }

  // --- 2. Handle Validation Failure ---
  if (Object.keys(errors).length > 0) {
    return { success: false, message: "Validation failed.", errors };
  }

  const user_id = Number(userId);

  try {
    // ... (Database mutation logic goes here, as before) ...
    console.log(
      `Updating user ${user_id}: Name: ${newName}, Email: ${newEmail}`
    );

    revalidatePath("/dashboard/users");

    return { success: true, message: "User updated successfully." };
  } catch (error) {
    console.error("Update failed:", error);
    return {
      success: false,
      message: "Failed to update user due to a server error.",
    };
  }
}
```

---

## 2\. Modify the Client Component to Display Errors

The Client Component needs state to hold any returned validation errors and logic to update that state based on the Server Action's result.

```tsx
// app/dashboard/users/edit-form.tsx (Modified)
"use client";

import { updateUser } from "@/app/actions/user";
import { experimental_useFormStatus as useFormStatus } from "react-dom";
import { useState } from "react";

// Simplified type for demonstration
interface InitialUser {
  user_id: number;
  name: string;
  email: string;
}

// Helper component (unchanged)
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="p-2 bg-blue-500 text-white rounded"
    >
      {pending ? "Saving..." : "Save Changes"}
    </button>
  );
}

export function EditUserForm({ user }: { user: InitialUser }) {
  const [statusMessage, setStatusMessage] = useState("");
  // State to hold validation errors from the server
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string | undefined>
  >({});

  const handleSubmit = async (formData: FormData) => {
    setStatusMessage("Saving...");
    setValidationErrors({}); // Clear previous errors

    const result = await updateUser(formData);

    if (result.success) {
      setStatusMessage(`✅ ${result.message}`);
    } else {
      // --- KEY LOGIC: Handle and display errors ---
      if (result.errors) {
        // Set the validation errors state to re-render the form with error messages
        setValidationErrors(result.errors);
        setStatusMessage("Please fix the errors below.");
      } else {
        // Handle general server error
        setStatusMessage(`❌ ${result.message}`);
      }
    }
  };

  return (
    <form action={handleSubmit} className="space-y-4 p-4 border rounded shadow">
      <input type="hidden" name="userId" value={user.user_id} />

      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          defaultValue={user.name}
          className={`mt-1 p-2 w-full border rounded ${validationErrors.name ? "border-red-500" : ""}`}
        />
        {/* Display the error message */}
        {validationErrors.name && (
          <p className="text-red-500 text-xs mt-1">{validationErrors.name}</p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={user.email}
          className={`mt-1 p-2 w-full border rounded ${validationErrors.email ? "border-red-500" : ""}`}
        />
        {/* Display the error message */}
        {validationErrors.email && (
          <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>
        )}
      </div>

      <SubmitButton />

      {statusMessage && (
        <p
          className={`mt-2 text-sm ${statusMessage.startsWith("❌") ? "text-red-500" : "text-green-500"}`}
        >
          {statusMessage}
        </p>
      )}
    </form>
  );
}
```

By passing the structured `errors` object from the Server Action to the Client Component's state, you can render specific error messages next to the corresponding form fields, providing targeted feedback to the user.

---

## That's an excellent next step\! Handling validation errors from the Server Action and displaying them in your Client Component form is crucial for a good user experience

Here's how you can achieve this by modifying both the Server Action and the Client Component:

### 3\. Modify the Server Action to Return Validation Errors 🛠️

Instead of a simple success/failure message, the Server Action should return a more structured object that includes an **`errors`** field for client-side display.

```typescript
// app/actions/user.ts (Modified)
"use server";

import { revalidatePath } from "next/cache";

// Define the shape of your expected result
interface ServerActionResult {
  success: boolean;
  message: string;
  errors?: {
    name?: string;
    email?: string;
  };
}

export async function updateUser(
  formData: FormData
): Promise<ServerActionResult> {
  const userId = formData.get("userId");
  const newName = formData.get("name") as string;
  const newEmail = formData.get("email") as string;

  // --- 1. Perform Validation ---
  const errors: ServerActionResult["errors"] = {};

  if (!newName || newName.length < 3) {
    errors.name = "Name must be at least 3 characters.";
  }

  // Simple email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!newEmail || !emailRegex.test(newEmail)) {
    errors.email = "Please provide a valid email address.";
  }

  // --- 2. Handle Validation Failure ---
  if (Object.keys(errors).length > 0) {
    return { success: false, message: "Validation failed.", errors };
  }

  const user_id = Number(userId);

  try {
    // ... (Database mutation logic goes here, as before) ...
    console.log(
      `Updating user ${user_id}: Name: ${newName}, Email: ${newEmail}`
    );

    revalidatePath("/dashboard/users");

    return { success: true, message: "User updated successfully." };
  } catch (error) {
    console.error("Update failed:", error);
    return {
      success: false,
      message: "Failed to update user due to a server error.",
    };
  }
}
```

---

## 4\. Modify the Client Component to Display Errors

The Client Component needs state to hold any returned validation errors and logic to update that state based on the Server Action's result.

```tsx
// app/dashboard/users/edit-form.tsx (Modified)
"use client";

import { updateUser } from "@/app/actions/user";
import { experimental_useFormStatus as useFormStatus } from "react-dom";
import { useState } from "react";

// Simplified type for demonstration
interface InitialUser {
  user_id: number;
  name: string;
  email: string;
}

// Helper component (unchanged)
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="p-2 bg-blue-500 text-white rounded"
    >
      {pending ? "Saving..." : "Save Changes"}
    </button>
  );
}

export function EditUserForm({ user }: { user: InitialUser }) {
  const [statusMessage, setStatusMessage] = useState("");
  // State to hold validation errors from the server
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string | undefined>
  >({});

  const handleSubmit = async (formData: FormData) => {
    setStatusMessage("Saving...");
    setValidationErrors({}); // Clear previous errors

    const result = await updateUser(formData);

    if (result.success) {
      setStatusMessage(`✅ ${result.message}`);
    } else {
      // --- KEY LOGIC: Handle and display errors ---
      if (result.errors) {
        // Set the validation errors state to re-render the form with error messages
        setValidationErrors(result.errors);
        setStatusMessage("Please fix the errors below.");
      } else {
        // Handle general server error
        setStatusMessage(`❌ ${result.message}`);
      }
    }
  };

  return (
    <form action={handleSubmit} className="space-y-4 p-4 border rounded shadow">
      <input type="hidden" name="userId" value={user.user_id} />

      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          defaultValue={user.name}
          className={`mt-1 p-2 w-full border rounded ${validationErrors.name ? "border-red-500" : ""}`}
        />
        {/* Display the error message */}
        {validationErrors.name && (
          <p className="text-red-500 text-xs mt-1">{validationErrors.name}</p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={user.email}
          className={`mt-1 p-2 w-full border rounded ${validationErrors.email ? "border-red-500" : ""}`}
        />
        {/* Display the error message */}
        {validationErrors.email && (
          <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>
        )}
      </div>

      <SubmitButton />

      {statusMessage && (
        <p
          className={`mt-2 text-sm ${statusMessage.startsWith("❌") ? "text-red-500" : "text-green-500"}`}
        >
          {statusMessage}
        </p>
      )}
    </form>
  );
}
```

By passing the structured `errors` object from the Server Action to the Client Component's state, you can render specific error messages next to the corresponding form fields, providing targeted feedback to the user.

---

## Combine Server Actions with **optimistic UI updates** (for an even snappier user experience)

Yes, combining Server Actions with **optimistic UI updates** provides an exceptionally fast and responsive feel to your application, even while network requests are processing.

The pattern for this involves using the `useOptimistic` hook, which is part of React's suite of features supporting Server Actions.

---

## 1\. The Concept of Optimistic Updates ✨

**Optimistic UI** means updating the user interface immediately after a form submission (or mutation) as if the request has already succeeded. This gives the user instant feedback. If the Server Action later succeeds, no further change is needed. If it fails, you revert the UI back to its previous state and display an error message.

This pattern is especially useful for actions like "liking" a post, checking a to-do item, or, in your case, updating a user's name, where the operation is highly likely to succeed.

---

## 2\. Implement `useOptimistic` in Your Form

The `useOptimistic` hook allows you to define a temporary, "optimistic" state that is applied immediately upon action execution, which will then be superseded by the actual returned state once the Server Action completes.

### Modifying `EditUserForm`

We'll focus on optimistically updating the user's name in the UI.

```tsx
// app/dashboard/users/edit-form-optimistic.tsx
"use client";

import { updateUser } from "@/app/actions/user";
import {
  experimental_useFormStatus as useFormStatus,
  useOptimistic,
} from "react-dom";
import { useState } from "react";

interface InitialUser {
  user_id: number;
  name: string;
  email: string;
}

// ... (SubmitButton and other imports/types remain the same) ...

export function EditUserFormOptimistic({ user }: { user: InitialUser }) {
  const [statusMessage, setStatusMessage] = useState("");
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string | undefined>
  >({});

  // --- KEY CHANGE: Initialize useOptimistic ---
  // 1. Initial State: The current user object.
  // 2. Updater Function: Defines how the state should change optimistically.
  const [optimisticUser, addOptimisticUpdate] = useOptimistic(
    user,
    (currentState, newName: string) => ({
      ...currentState,
      name: newName, // Optimistically update ONLY the name
    })
  );
  // ---------------------------------------------

  // The Server Action wrapper needs to be updated for optimistic UI
  const handleSubmit = async (formData: FormData) => {
    const newName = formData.get("name") as string;

    // --- 1. Optimistic Update (Immediate UI change) ---
    addOptimisticUpdate(newName);
    setStatusMessage("Saving...");
    setValidationErrors({});

    const result = await updateUser(formData);

    if (result.success) {
      // Success: The Server Action returns, and the optimistic state is automatically reconciled
      // (or simply remains, as it matches the expected outcome).
      setStatusMessage(`✅ ${result.message}`);
    } else {
      // Failure:
      if (result.errors) {
        setValidationErrors(result.errors);
        setStatusMessage("Please fix the errors below.");
      } else {
        setStatusMessage(`❌ ${result.message}`);
      }

      // --- 2. Revert on Failure (Crucial step for pessimistic flow) ---
      // Because the Server Action failed, we need to manually revert the optimistic change.
      // A simple way is to pass the original state again.
      addOptimisticUpdate(user.name);
    }
  };

  return (
    <form action={handleSubmit} className="space-y-4 p-4 border rounded shadow">
      <input type="hidden" name="userId" value={user.user_id} />

      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          // --- Use the optimistic state value here ---
          defaultValue={optimisticUser.name}
          key={optimisticUser.name} // Key is often needed to force re-render when reverting
          // ------------------------------------------
          className={`mt-1 p-2 w-full border rounded ${validationErrors.name ? "border-red-500" : ""}`}
        />
        {validationErrors.name && (
          <p className="text-red-500 text-xs mt-1">{validationErrors.name}</p>
        )}
      </div>

      {/* ... (Email field and other form elements remain similar) ... */}

      <SubmitButton />

      {statusMessage && (
        <p
          className={`mt-2 text-sm ${statusMessage.startsWith("❌") ? "text-red-500" : "text-green-500"}`}
        >
          {statusMessage}
        </p>
      )}
    </form>
  );
}
```

### How the Optimistic Flow Works

1. The user types a new name and clicks **"Save Changes."**
2. The `handleSubmit` function is called.
3. **`addOptimisticUpdate(newName)`** executes immediately. The `optimisticUser.name` value instantly changes to the new name in the input field (due to `key={optimisticUser.name}`). The UI appears updated.
4. The **`updateUser(formData)`** Server Action runs asynchronously on the server.
5. **If the action succeeds:** The form remains as is. The user sees an updated name instantly, and the state reconciliation happens transparently in the background.
6. **If the action fails (e.g., validation error):** The code enters the `else` block. The Server Action's failure is detected, and **`addOptimisticUpdate(user.name)`** is called, reverting the displayed name back to the original value stored in the `user` prop.

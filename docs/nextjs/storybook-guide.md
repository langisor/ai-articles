---
title: Storybook with Next.js App Router, TypeScript & Shadcn UI
description: A complete step-by-step guide to building and documenting frontend UI components with Storybook in a Next.js App Router project using TypeScript and Shadcn UI.
outline: deep
---

# Storybook with Next.js App Router, TypeScript & Shadcn UI

> **Who this guide is for:** Intermediate Next.js App Router developers who want to integrate Storybook for isolated UI component development and documentation, using TypeScript and Shadcn UI as their component library.

---

## Prerequisites

Before you begin, make sure your project has:

- Node.js 18.17 or later
- A Next.js 14+ project using the **App Router**
- TypeScript configured (`tsconfig.json`)
- Tailwind CSS set up
- Shadcn UI initialized (`npx shadcn@latest init` already run)

---

## 1. Installing Storybook

Storybook provides an automated setup command that detects your framework and configures everything accordingly.

Run this from your project root:

```bash
npx storybook@latest init
```

The CLI will:

- Detect Next.js and install `@storybook/nextjs`
- Create a `.storybook/` configuration directory
- Add example stories under `src/stories/`
- Add scripts to your `package.json`

Your `package.json` will now include:

```json
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  }
}
```

Launch Storybook to verify the installation:

```bash
npm run storybook
```

Open [http://localhost:6006](http://localhost:6006) — you should see the default Storybook UI with example stories.

---

## 2. Understanding the Configuration Files

After init, your `.storybook/` directory contains two files.

### `.storybook/main.ts`

This is the core configuration file. It tells Storybook where to find your stories and which addons to load.

```ts
// .storybook/main.ts
import type { StorybookConfig } from "@storybook/nextjs";

const config: StorybookConfig = {
  // Glob pattern — where Storybook looks for story files
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    "@storybook/addon-onboarding",
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
  ],
  framework: {
    name: "@storybook/nextjs",
    options: {},
  },
  // Make Next.js static assets available in Storybook
  staticDirs: ["../public"],
};

export default config;
```

### `.storybook/preview.ts`

This file controls the global rendering environment for all stories — decorators, parameters, and global types (like a dark mode toggle).

```ts
// .storybook/preview.ts
import type { Preview } from "@storybook/react";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
```

---

## 3. Configuring Tailwind CSS & Shadcn UI in Storybook

Shadcn UI relies on Tailwind CSS and CSS custom properties. Without importing your global stylesheet, components will render unstyled in Storybook.

### Step 3.1 — Import your global CSS

Edit `.storybook/preview.ts` to import the file where your Tailwind directives and Shadcn CSS variables live (typically `app/globals.css`):

```ts
// .storybook/preview.ts
import type { Preview } from "@storybook/react";
import "../app/globals.css"; // [!code ++]

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default config;
```

### Step 3.2 — Configure PostCSS

`@storybook/nextjs` automatically reads your project's `postcss.config.js`, so if Tailwind is already working in Next.js it will work in Storybook too. No extra action is needed unless you have a custom PostCSS setup.

### Step 3.3 — Alias resolution

Shadcn components import from `@/components/ui/...`. Storybook must resolve the `@` alias the same way TypeScript does.

Open `.storybook/main.ts` and add the `webpackFinal` config:

```ts
// .storybook/main.ts
import type { StorybookConfig } from "@storybook/nextjs";
import path from "path"; // [!code ++]

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: ["@storybook/addon-essentials", "@storybook/addon-interactions"],
  framework: {
    name: "@storybook/nextjs",
    options: {},
  },
  staticDirs: ["../public"],
  // [!code ++:10]
  webpackFinal: async (config) => {
    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "@": path.resolve(__dirname, "../src"),
      };
    }
    return config;
  },
};

export default config;
```

::: tip
`@storybook/nextjs` already reads `tsconfig.json` paths automatically in most cases. Add `webpackFinal` only if you experience unresolved module errors.
:::

---

## 4. Writing Your First Story

A **story** is a named, isolated rendering of a component with a specific set of props. Every component should have at least one story per meaningful visual state.

### Story file conventions

| File location                          | When to use                   |
| -------------------------------------- | ----------------------------- |
| `src/components/ui/button.stories.tsx` | Co-located with the component |
| `src/stories/Button.stories.tsx`       | Dedicated stories folder      |

Co-location (next to the component) is recommended — it keeps stories close to the code they describe.

### The Component Story Format (CSF 3)

Storybook uses **CSF 3** — a simple ES module format. Every story file has:

- A **default export** (the Meta object) that configures the component
- **Named exports** (individual stories) for each state

### Example — Shadcn `Button` stories

```tsx
// src/components/ui/button.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "@/components/ui/button";

// ------- Meta -------
const meta: Meta<typeof Button> = {
  title: "UI/Button", // Sidebar path in Storybook
  component: Button,
  tags: ["autodocs"], // Auto-generate a docs page
  argTypes: {
    variant: {
      control: "select",
      options: [
        "default",
        "destructive",
        "outline",
        "secondary",
        "ghost",
        "link",
      ],
    },
    size: {
      control: "select",
      options: ["default", "sm", "lg", "icon"],
    },
    disabled: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// ------- Stories -------

export const Default: Story = {
  args: {
    children: "Click me",
    variant: "default",
    size: "default",
  },
};

export const Destructive: Story = {
  args: {
    children: "Delete",
    variant: "destructive",
  },
};

export const Outline: Story = {
  args: {
    children: "Cancel",
    variant: "outline",
  },
};

export const Large: Story = {
  args: {
    children: "Get started",
    size: "lg",
  },
};

export const Disabled: Story = {
  args: {
    children: "Unavailable",
    disabled: true,
  },
};
```

Open Storybook and navigate to **UI → Button**. You'll see each named export listed as a separate story, with a **Controls** panel to tweak props interactively.

---

## 5. Commonly Used Shadcn Components — Story Examples

### 5.1 — Input

```tsx
// src/components/ui/input.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const meta: Meta<typeof Input> = {
  title: "UI/Input",
  component: Input,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: "Email address",
    type: "email",
  },
};

export const WithLabel: Story = {
  render: (args) => (
    <div className="grid w-full max-w-sm gap-1.5">
      <Label htmlFor="email">Email</Label>
      <Input id="email" {...args} />
    </div>
  ),
  args: {
    placeholder: "you@example.com",
    type: "email",
  },
};

export const Disabled: Story = {
  args: {
    placeholder: "Disabled",
    disabled: true,
  },
};
```

### 5.2 — Card

Cards are composition components — they have no significant props on their own, so stories use the `render` function to compose the full layout.

```tsx
// src/components/ui/card.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const meta: Meta<typeof Card> = {
  title: "UI/Card",
  component: Card,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-[380px]">
      <CardHeader>
        <CardTitle>Create project</CardTitle>
        <CardDescription>Deploy your new project in one-click.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Your project will be live in under a minute.
        </p>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline">Cancel</Button>
        <Button>Deploy</Button>
      </CardFooter>
    </Card>
  ),
};
```

### 5.3 — Dialog

Interactive components like modals need a trigger to control open/close state. Use a `render` function with local state:

```tsx
// src/components/ui/dialog.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const meta: Meta<typeof Dialog> = {
  title: "UI/Dialog",
  component: Dialog,
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">Edit Profile</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>
              Make changes to your profile here. Click save when done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input id="name" defaultValue="John Doe" className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={() => setOpen(false)}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  },
};
```

---

## 6. Writing Stories for Custom Components

Real-world projects compose Shadcn primitives into custom components. Here's how to write stories at that layer.

### Example — A `UserCard` component

```tsx
// src/components/user-card.tsx
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface UserCardProps {
  name: string;
  role: string;
  avatarUrl?: string;
  status: "online" | "offline" | "away";
}

export function UserCard({ name, role, avatarUrl, status }: UserCardProps) {
  const statusColors: Record<UserCardProps["status"], string> = {
    online: "bg-green-500",
    offline: "bg-gray-400",
    away: "bg-yellow-400",
  };

  return (
    <Card className="w-64">
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <Avatar>
          <AvatarImage src={avatarUrl} alt={name} />
          <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="font-semibold text-sm">{name}</span>
          <span className="text-xs text-muted-foreground">{role}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${statusColors[status]}`} />
          <span className="text-xs capitalize">{status}</span>
        </div>
      </CardContent>
    </Card>
  );
}
```

Now write its stories:

```tsx
// src/components/user-card.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { UserCard } from "./user-card";

const meta: Meta<typeof UserCard> = {
  title: "Components/UserCard",
  component: UserCard,
  tags: ["autodocs"],
  argTypes: {
    status: {
      control: "radio",
      options: ["online", "offline", "away"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Online: Story = {
  args: {
    name: "Sarah Chen",
    role: "Frontend Engineer",
    status: "online",
  },
};

export const Away: Story = {
  args: {
    name: "Marcus Webb",
    role: "Product Designer",
    status: "away",
  },
};

export const WithAvatar: Story = {
  args: {
    name: "Priya Kapoor",
    role: "Engineering Manager",
    avatarUrl: "https://i.pravatar.cc/150?u=priya",
    status: "online",
  },
};

export const Offline: Story = {
  args: {
    name: "James Liu",
    role: "Backend Engineer",
    status: "offline",
  },
};
```

---

## 7. Decorators — Providing Global Context

Decorators are wrappers that apply to every story — or to a specific story — to provide context like theme providers, layout padding, or router context.

### 7.1 — Global decorator (all stories)

Add decorators to `.storybook/preview.ts`:

```ts
// .storybook/preview.ts
import type { Preview } from "@storybook/react";
import "../app/globals.css";

const preview: Preview = {
  // Wrap every story with consistent padding
  decorators: [
    (Story) => (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <Story />
      </div>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
```

### 7.2 — Story-level decorator

Apply a decorator only to specific stories when you need special context:

```tsx
export const InsideForm: Story = {
  decorators: [
    (Story) => (
      <form className="space-y-4 w-80">
        <Story />
      </form>
    ),
  ],
  args: {
    placeholder: "Inside a form",
  },
};
```

### 7.3 — Dark mode decorator

Shadcn UI uses a `dark` class on `<html>` for dark mode. Add a toolbar toggle:

```ts
// .storybook/preview.ts
import type { Preview } from "@storybook/react";
import "../app/globals.css";

const preview: Preview = {
  globalTypes: {
    theme: {
      name: "Theme",
      description: "Global theme",
      defaultValue: "light",
      toolbar: {
        icon: "circlehollow",
        items: ["light", "dark"],
        showName: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme as string;
      return (
        <div className={theme === "dark" ? "dark" : ""}>
          <div className="bg-background text-foreground min-h-screen p-8">
            <Story />
          </div>
        </div>
      );
    },
  ],
};

export default preview;
```

---

## 8. Mocking Next.js Features

`@storybook/nextjs` handles most Next.js internals automatically, but some features need explicit mocking.

### 8.1 — `next/navigation` (App Router)

The App Router hooks (`useRouter`, `usePathname`, `useSearchParams`) are shimmed by `@storybook/nextjs` out of the box. No configuration needed for most use cases.

For stories that depend on a specific pathname or search params, you can override them via parameters:

```tsx
export const ActiveLink: Story = {
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/dashboard",
        query: { tab: "settings" },
      },
    },
  },
  args: {
    href: "/dashboard",
    label: "Dashboard",
  },
};
```

### 8.2 — `next/image`

`next/image` works in Storybook because `@storybook/nextjs` automatically overrides the loader. Ensure `staticDirs: ["../public"]` is in `main.ts` so local images resolve correctly.

### 8.3 — `next/link`

`next/link` renders as a standard anchor tag in Storybook. No configuration needed.

### 8.4 — Server Components

Storybook renders components in a browser — Server Components must be wrapped in a **Client Component** story wrapper or converted to a Client Component for testing in isolation.

```tsx
// For a React Server Component, write a client wrapper in the story:
export const ServerComponentStory: Story = {
  render: () => {
    // Simulate server-side data by passing props directly
    return <MyServerComponent data={mockData} />;
  },
};
```

::: warning
Storybook cannot render true React Server Components (RSC) yet, as it runs entirely in the browser. Test RSC behavior with integration or E2E tests (Playwright / Cypress).
:::

---

## 9. Page-Level Stories

You can write stories for full pages, not just individual components. This is great for layout reviews and full-page visual regression testing.

### Example — Dashboard page story

```tsx
// src/app/dashboard/page.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import DashboardPage from "./page";

// Because this is an App Router page, convert it to a Client Component
// or create a presentational version for Storybook.

const meta: Meta<typeof DashboardPage> = {
  title: "Pages/Dashboard",
  component: DashboardPage,
  parameters: {
    // Remove padding decorators for full-page stories
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/dashboard",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const MobileViewport: Story = {
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
  },
};
```

---

## 10. Autodocs — Auto-Generated Documentation

When you add `tags: ["autodocs"]` to a story's Meta, Storybook generates a **Docs** page for that component automatically, including:

- A live preview of the `Default` story
- A props table derived from TypeScript types
- Individual story previews with their args

### Making autodocs work well

**Use JSDoc comments on your component props** — Storybook extracts them into the docs table:

```tsx
interface ButtonProps {
  /** The visual style of the button */
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  /** The size of the button */
  size?: "default" | "sm" | "lg" | "icon";
  /** Prevents user interaction when true */
  disabled?: boolean;
  children: React.ReactNode;
}
```

**Write a `Default` story** — it becomes the hero preview on the docs page.

**Add a description to your stories:**

```tsx
export const Destructive: Story = {
  name: "Destructive variant",
  parameters: {
    docs: {
      description: {
        story:
          "Use the destructive variant for irreversible actions like deleting data.",
      },
    },
  },
  args: {
    variant: "destructive",
    children: "Delete account",
  },
};
```

---

## 11. Testing with Storybook

Storybook integrates directly with several testing tools.

### 11.1 — Interaction Testing (`play` function)

The `play` function runs after a story renders, letting you simulate user interactions:

```tsx
// npm install @storybook/test --save-dev
import { expect, fn, userEvent, within } from "@storybook/test";

const meta: Meta<typeof LoginForm> = {
  title: "Forms/LoginForm",
  component: LoginForm,
};

export default meta;
type Story = StoryObj<typeof meta>;

export const SuccessfulLogin: Story = {
  args: {
    onSubmit: fn(), // Creates a Storybook spy
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // Find and fill the email field
    const emailInput = canvas.getByLabelText("Email");
    await userEvent.type(emailInput, "user@example.com");

    // Fill the password field
    const passwordInput = canvas.getByLabelText("Password");
    await userEvent.type(passwordInput, "password123");

    // Click submit
    const submitButton = canvas.getByRole("button", { name: /sign in/i });
    await userEvent.click(submitButton);

    // Assert the handler was called
    await expect(args.onSubmit).toHaveBeenCalledOnce();
  },
};

export const ValidationErrors: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Submit without filling in fields
    const submitButton = canvas.getByRole("button", { name: /sign in/i });
    await userEvent.click(submitButton);

    // Expect error messages to appear
    await expect(canvas.getByText("Email is required")).toBeInTheDocument();
    await expect(canvas.getByText("Password is required")).toBeInTheDocument();
  },
};
```

Run interaction tests from the CLI:

```bash
npx storybook test
```

### 11.2 — Accessibility Testing

Install the a11y addon:

```bash
npm install @storybook/addon-a11y --save-dev
```

Register it in `.storybook/main.ts`:

```ts
addons: [
  "@storybook/addon-essentials",
  "@storybook/addon-interactions",
  "@storybook/addon-a11y", // [!code ++]
],
```

Each story now shows an **Accessibility** tab with violations, warnings, and passes powered by `axe-core`. You can also configure per-story:

```tsx
export const Default: Story = {
  parameters: {
    a11y: {
      // Disable a specific rule for this story
      config: {
        rules: [{ id: "color-contrast", enabled: false }],
      },
    },
  },
};
```

---

## 12. Organizing Your Storybook

A well-organized sidebar makes Storybook a pleasure to navigate.

### Naming convention

Use the `title` field in your Meta to define the hierarchy:

```ts
// Results in: Design System > Primitives > Button
title: "Design System/Primitives/Button";

// Results in: Components > Forms > LoginForm
title: "Components/Forms/LoginForm";

// Results in: Pages > Dashboard
title: "Pages/Dashboard";
```

### Recommended folder structure

```
src/
├── components/
│   ├── ui/                        # Shadcn UI components
│   │   ├── button.tsx
│   │   ├── button.stories.tsx     # Co-located story
│   │   ├── card.tsx
│   │   └── card.stories.tsx
│   ├── user-card.tsx
│   ├── user-card.stories.tsx
│   └── forms/
│       ├── login-form.tsx
│       └── login-form.stories.tsx
├── app/
│   └── dashboard/
│       ├── page.tsx
│       └── page.stories.tsx       # Page-level story
└── stories/
    └── Introduction.mdx           # Landing page for your Storybook
```

### Writing an MDX introduction page

Create `src/stories/Introduction.mdx` as a welcome page:

```mdx
import { Meta } from "@storybook/blocks";

<Meta title="Introduction" />

# My Design System

Welcome to the component library for **My App**. This Storybook documents all
UI components built with [Shadcn UI](https://ui.shadcn.com) and Tailwind CSS.

## Getting started

Browse components in the sidebar. Each component page shows:

- Interactive previews with live controls
- Auto-generated props documentation
- Usage examples for common states

## Contributing

Co-locate your story file next to its component:
```

src/components/my-component.tsx
src/components/my-component.stories.tsx

```

```

---

## 13. Building & Deploying Storybook

Build a static version of Storybook:

```bash
npm run build-storybook
```

This outputs a static site to `storybook-static/`. Deploy it to any static hosting service.

### Deploy to Chromatic (recommended)

[Chromatic](https://www.chromatic.com/) is built by the Storybook team and provides visual regression testing + hosted Storybook.

```bash
npm install --save-dev chromatic
npx chromatic --project-token=<your-token>
```

Add it to your CI pipeline (GitHub Actions example):

```yaml
# .github/workflows/chromatic.yml
name: Chromatic

on: push

jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - name: Run Chromatic
        uses: chromaui/action@latest
        with:
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
```

### Deploy to Vercel or Netlify

Point the build command to `build-storybook` and the publish directory to `storybook-static`:

| Setting           | Value                     |
| ----------------- | ------------------------- |
| Build command     | `npm run build-storybook` |
| Publish directory | `storybook-static`        |

---

## 14. Quick Reference — Patterns Cheat Sheet

### `args` vs `render`

| Pattern                     | When to use                                                      |
| --------------------------- | ---------------------------------------------------------------- |
| `args: {}`                  | Simple components driven purely by props                         |
| `render: (args) => <JSX />` | Composition, internal state (`useState`), or multiple components |

### Controls reference

```ts
argTypes: {
  variant: { control: "select", options: ["a", "b", "c"] },
  count:   { control: { type: "range", min: 0, max: 100, step: 1 } },
  color:   { control: "color" },
  enabled: { control: "boolean" },
  label:   { control: "text" },
  date:    { control: "date" },
}
```

### Useful parameters

```ts
parameters: {
  layout: "fullscreen",          // Remove padding (for pages)
  layout: "centered",            // Center in canvas (default for components)
  backgrounds: {
    default: "dark",
    values: [
      { name: "dark", value: "#1a1a1a" },
      { name: "light", value: "#ffffff" },
    ],
  },
  viewport: {
    defaultViewport: "mobile1",  // Built-in: mobile1, mobile2, tablet
  },
}
```

---

## Summary

Here's the complete workflow you now have:

1. **Install** Storybook with `npx storybook@latest init` and configure `@storybook/nextjs`.
2. **Import** your global CSS in `.storybook/preview.ts` so Tailwind and Shadcn styles apply.
3. **Configure** alias resolution in `.storybook/main.ts` for `@/` imports.
4. **Write stories** using CSF 3 — one file per component, co-located with the source.
5. **Use decorators** for shared context like theme providers or layout wrappers.
6. **Mock Next.js features** using `@storybook/nextjs` parameters (pathname, navigation).
7. **Test interactions** with `play` functions and the `@storybook/test` utilities.
8. **Audit accessibility** automatically with `@storybook/addon-a11y`.
9. **Deploy** to Chromatic, Vercel, or Netlify for a shareable living style guide.

Your Storybook now acts as a **living design system** — a single source of truth where developers and designers can explore, test, and document every component in isolation.

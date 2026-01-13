# How to make your Nextjs App working offline

> This is an AI response (`gemini`). You must visit main guide at [Nextjs.org - Guide - PWA](https://nextjs.org/docs/app/guides/progressive-web-apps)

Making your Next.js App Router app work offline, especially when hosted on Netlify, primarily involves implementing a **Service Worker** to cache assets and provide fallback content. This process turns your app into a **Progressive Web Application (PWA)**.

Since you're using the App Router and `next.config.ts`, the most streamlined way to handle the complex Service Worker configuration is by using a specialized package like **`@ducanh2912/next-pwa`**.

Here's the step-by-step approach:

## 1\. Install and Configure `next-pwa`

You'll use the `@ducanh2912/next-pwa` package, which is actively maintained and has good support for the Next.js App Router and TypeScript.

### Installation

Install the package using your package manager:

```bash
npm install @ducanh2912/next-pwa
# or
yarn add @ducanh2912/next-pwa
```

### Configure `next.config.ts`

Modify your `next.config.ts` to wrap your existing configuration with the PWA setup. This handles generating and registering the Service Worker.

```typescript
// next.config.ts
import type { NextConfig } from "next";
// Import the PWA plugin wrapper
import withPWA from "@ducanh2912/next-pwa";

// Configure PWA options
const pwaConfig = withPWA({
  dest: "public", // Directory where Service Worker files will be output
  register: true, // Automatically registers the Service Worker on the client
  skipWaiting: true, // Activates the new Service Worker immediately on update
  disable: process.env.NODE_ENV === "development", // Disable PWA in dev mode
  cacheOnFrontEndNav: true, // Cache pages visited during client-side navigation
  aggressiveFrontEndNavCaching: true, // Cache aggressively for faster offline navigation
  // You can add more Workbox options here for fine-grained caching
});

// Your main Next.js configuration
const nextConfig: NextConfig = {
  // Your other Next.js config options...
};

// Export the wrapped configuration
export default pwaConfig(nextConfig);
```

---

## 2\. Create a Web App Manifest

The Web App Manifest (`manifest.json` or `manifest.ts`) is a required file for a PWA. It defines the app's metadata (name, icons, display mode) for when a user installs it.

### Create `app/manifest.ts`

The App Router allows you to dynamically generate the manifest using a `manifest.ts` file in your `app` directory.

```typescript
// app/manifest.ts
import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Your App Name",
    short_name: "ShortName",
    description: "My offline-ready Next.js App",
    start_url: "/",
    display: "standalone", // Makes it feel more like a native app
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      {
        src: "/icon-192x192.png", // Place these icons in your public/ folder
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
```

### Add Icons

Make sure you create the necessary icon files (e.g., `icon-192x192.png`, `icon-512x512.png`) and place them in your **`public/`** directory.

---

## 3\. Configure a Fallback Page (Optional but Recommended)

For a better offline experience, you should create a simple fallback page that loads when a user tries to access a page that hasn't been cached.

### Create the Offline Page

Create a file like **`app/offline/page.tsx`** (or `app/_offline/page.tsx`, depending on the package version/convention) that is entirely a Client Component and relies only on assets that are guaranteed to be cached by the Service Worker.

```tsx
// app/offline/page.tsx
"use client";
import React from "react";

export default function OfflinePage() {
  return (
    <div style={{ padding: "20px", textAlign: "center" }}>
      <h1>You Are Offline 😞</h1>
      <p>It looks like you're not connected to the internet.</p>
      <p>The content for this page wasn't loaded while you were online.</p>
      {/* You can add a button to try navigating back or home */}
    </div>
  );
}
```

### Update `next.config.ts` for Fallbacks

You'll need to specify this fallback in your `next.config.ts` to instruct the Service Worker to use it for navigation requests that fail when offline. Add a `fallbacks` section to your PWA config:

```typescript
// next.config.ts (inside the pwaConfig object)
// ...
workboxOptions: {
  // ... other workbox options
  fallbacks: {
    // Use the route to your offline page
    document: '/offline',
  }
},
// ...
```

---

## 4\. Netlify Deployment

Netlify's Next.js adapter should automatically handle the Service Worker file generated in the `public/` directory after the build.

### Build and Deploy

1. **Run a production build** locally to test and see the generated PWA files:

    ```bash
    npm run build
    ```

    You should see the Service Worker files (`sw.js`, etc.) generated inside your `public` directory.
2. **Commit and push** your changes to your Git repository.
3. **Netlify** will automatically run the build and deploy your app, including the PWA files.

### Testing Offline Functionality

After deployment:

1. Visit your deployed app in your browser (must be a secure context, Netlify uses HTTPS).
2. Navigate to a few pages to ensure they are cached by the Service Worker.
3. Open the browser **DevTools** (F12) and go to the **Application** tab.
4. Select the **Service Workers** section and check the **Offline** box.
5. Try navigating to one of the pages you just visited—it should load\!
6. Try navigating to a page you haven't visited; it should load your `/offline` fallback page.

---

# Caching your app's static assets (`HTML, CSS, JavaScript`, icons) to enable basic offline access

That's an excellent follow-up question. The previous guide focused on caching your app's **static assets** (HTML, CSS, JavaScript, icons) to enable basic offline access. To truly make an app like your Urdu Library useful offline, you need to cache the **data** (JSON files from API requests) as well.

This is handled by extending the **Service Worker's caching strategy** using the `workboxOptions` in your `next.config.ts`.

## 1\. Runtime Caching for JSON/API Requests

While the core assets are precached during the Service Worker installation, data requests need **runtime caching** with a specific strategy. This tells the Service Worker how to handle requests for your data endpoints (APIs).

You'll add a `runtimeCaching` array to your `next.config.ts`.

### Update `next.config.ts`

Modify the `workboxOptions` in your PWA configuration:

```typescript
// next.config.ts (inside the PWA_CONFIG object)

// ... other PWA options ...
workboxOptions: {
  fallbacks: {
    document: '/offline',
  },
  runtimeCaching: [
    {
      // 1. Identify the URL pattern for your API requests
      // Replace with your actual API endpoint pattern (e.g., /api/books.* or https://your-backend.com/api/v1/data.*)
      urlPattern: /^https?:\/\/(?:[a-zA-Z0-9-]+\.)?example\.com\/api\/.*/i, 
      // For your current Netlify app, you might be fetching data from a third-party source. 
      // If so, use the full external domain here. If you use Next.js Route Handlers, use /api/.*
      
      // 2. Choose a caching strategy
      handler: 'StaleWhileRevalidate',
      
      // 3. Configure the cache
      options: {
        cacheName: 'api-data-cache', // A name for the cache storage
        expiration: {
          maxEntries: 50, // Limit the number of entries
          maxAgeSeconds: 60 * 60 * 24 * 7, // Cache for 7 days
        },
        cacheableResponse: {
          statuses: [0, 200], // Only cache successful responses
        },
      },
    },
    // You can add a second rule for image assets if needed
    {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
        handler: 'CacheFirst',
        options: {
            cacheName: 'image-cache',
            expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30, // Cache images for 30 days
            },
        },
    },
  ],
},
// ...
```

### Common Caching Strategies

The `handler` property determines how the Service Worker fetches data:

| Strategy | When to Use | Offline Behavior |
| :--- | :--- | :--- |
| **StaleWhileRevalidate** | Default for most data. | Serves the **cached data immediately** ("stale"), and then checks the network for an update ("revalidate"). If a user is offline, the cached data is returned instantly. |
| **CacheFirst** | Best for static media (images, fonts). | Checks the cache first. If found, it uses the cached response and **never hits the network**. Only falls back to the network if the cache misses. |
| **NetworkFirst** | Best for critical data that needs to be current (e.g., user profiles). | Tries the network first. If the network request fails (user is offline), it falls back to the cache. Slower when online, but ensures fresh data. |

## 2\. Deep Data Caching (IndexedDB)

For a truly robust offline experience, especially with dynamic data and user input (like saving book progress), you should move beyond the Service Worker's simple URL caching and implement a **client-side database** like **IndexedDB** (often managed with libraries like **Dexie.js**).

* **How it Works:**
    1. When online, your client components fetch data from your API.
    2. Instead of relying only on Service Worker caching, you **explicitly save this data** to an IndexedDB store in the user's browser.
    3. When offline, your client components attempt to read data **directly from IndexedDB** instead of making a network request.

This approach requires more custom development in your React Client Components but gives you granular control over what data is available and how long it persists.

## Summary for Your Netlify App

For your **Urdu Library**, the most critical steps are:

1. Use the **`StaleWhileRevalidate`** strategy for the API endpoint that fetches your book/content data in `runtimeCaching`.
2. Use the **`CacheFirst`** strategy for any image/media files.

This will ensure that once a user has visited your main content pages, they can still view those pages and their associated data (JSON responses) even when they lose their connection.

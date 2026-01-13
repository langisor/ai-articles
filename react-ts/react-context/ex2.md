# Preloading Large Datasets with React Context + SWR

Using SWR gives you automatic caching, revalidation, and optimized data fetching out of the box.

## Step 1: Install SWR

```bash
npm install swr
```

## Step 2: Create the Data Context with SWR

```typescript
// src/contexts/DataContext.tsx
"use client";

import { createContext, useContext, ReactNode, useMemo } from "react";
import useSWR from "swr";

// Define your record type
interface Record {
  id: string;
  name: string;
  category?: string;
}

interface DataContextType {
  records: Record[];
  isLoading: boolean;
  error: any;
  mutate: () => void;
  // Helper methods
  getRecordById: (id: string) => Record | undefined;
  getRecordsByCategory: (category: string) => Record[];
  searchRecords: (query: string) => Record[];
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Fetcher function for SWR
const fetcher = async (url: string) => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch records: ${response.statusText}`);
  }

  return response.json();
};

export function DataProvider({ children }: { children: ReactNode }) {
  // SWR hook for data fetching
  const { data, error, isLoading, mutate } = useSWR<Record[]>(
    "/api/records",
    fetcher,
    {
      // SWR configuration
      revalidateOnFocus: false, // Don't refetch on window focus
      revalidateOnReconnect: true, // Refetch on reconnect
      dedupingInterval: 60000, // Dedupe requests within 60s
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      // Cache the data
      fallbackData: [], // Initial value before first fetch
    }
  );

  const records = data || [];

  // Create indexed maps for fast lookups
  const recordsById = useMemo(() => {
    return new Map(records.map((record) => [record.id, record]));
  }, [records]);

  const recordsByCategory = useMemo(() => {
    const map = new Map<string, Record[]>();
    records.forEach((record) => {
      if (record.category) {
        const existing = map.get(record.category) || [];
        map.set(record.category, [...existing, record]);
      }
    });
    return map;
  }, [records]);

  // Helper functions
  const getRecordById = (id: string) => recordsById.get(id);

  const getRecordsByCategory = (category: string) =>
    recordsByCategory.get(category) || [];

  const searchRecords = (query: string) => {
    const lowerQuery = query.toLowerCase();
    return records.filter((record) =>
      record.name.toLowerCase().includes(lowerQuery)
    );
  };

  return (
    <DataContext.Provider
      value={{
        records,
        isLoading,
        error,
        mutate,
        getRecordById,
        getRecordsByCategory,
        searchRecords,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useRecords() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useRecords must be used within a DataProvider");
  }
  return context;
}
```

## Step 3: Configure SWR Globally (Optional)

For better control across your app:

```ts
// src/app/providers.tsx
"use client";

import { SWRConfig } from "swr";
import { DataProvider } from "@/contexts/DataContext";
import { ReactNode } from "react";

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("An error occurred while fetching the data.");
  }
  return response.json();
};

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        shouldRetryOnError: true,
        errorRetryCount: 3,
        dedupingInterval: 60000,
        // Use localStorage for persistence
        provider: () => {
          if (typeof window !== "undefined") {
            return new Map(
              JSON.parse(localStorage.getItem("app-cache") || "[]")
            );
          }
          return new Map();
        },
        // Persist to localStorage
        onSuccess: (data, key) => {
          if (typeof window !== "undefined") {
            const cache = new Map(
              JSON.parse(localStorage.getItem("app-cache") || "[]")
            );
            cache.set(key, data);
            localStorage.setItem(
              "app-cache",
              JSON.stringify(Array.from(cache.entries()))
            );
          }
        },
      }}
    >
      <DataProvider>{children}</DataProvider>
    </SWRConfig>
  );
}
```

## Step 4: Update Layout

```typescript
// src/app/layout.tsx
import { Providers } from "@/app/providers";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
```

## Step 5: Create Loading Wrapper Component

```typescript
// src/components/DataLoader.tsx
"use client";

import { useRecords } from "@/contexts/DataContext";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

interface DataLoaderProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function DataLoader({ children, fallback }: DataLoaderProps) {
  const { isLoading, error, mutate } = useRecords();

  if (isLoading) {
    return (
      fallback || (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="mt-4 text-lg text-muted-foreground">
              Loading data...
            </p>
          </div>
        </div>
      )
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription className="mt-2">
            {error.message || "An error occurred while loading data."}
          </AlertDescription>
          <Button onClick={() => mutate()} variant="outline" className="mt-4">
            Retry
          </Button>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}
```

## Step 6: Use in Your App

```typescript
// src/app/page.tsx
import { DataLoader } from "@/components/DataLoader";
import { Dashboard } from "@/components/Dashboard";

export default function Home() {
  return (
    <DataLoader>
      <Dashboard />
    </DataLoader>
  );
}
```

## Step 7: Use the Data in Components

```typescript
// src/components/Dashboard.tsx
"use client";

import { useRecords } from "@/contexts/DataContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useState, useMemo } from "react";

export function Dashboard() {
  const { records, mutate, isLoading } = useRecords();
  const [search, setSearch] = useState("");

  // Filter records client-side
  const filteredRecords = useMemo(() => {
    if (!search) return records;

    return records.filter((record) =>
      record.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [records, search]);

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Records ({records.length} total)</CardTitle>
          <Button
            onClick={() => mutate()}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search records..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-4"
          />

          <div className="space-y-2">
            {filteredRecords.map((record) => (
              <div
                key={record.id}
                className="p-3 border rounded-lg hover:bg-accent transition-colors"
              >
                {record.name}
              </div>
            ))}
          </div>

          {filteredRecords.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No records found
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

## Step 8: Using Helper Methods

```typescript
// src/components/RecordDetail.tsx
"use client";

import { useRecords } from "@/contexts/DataContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function RecordDetail({ id }: { id: string }) {
  const { getRecordById } = useRecords();

  const record = getRecordById(id);

  if (!record) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Record not found
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{record.name}</CardTitle>
        {record.category && (
          <Badge variant="secondary">{record.category}</Badge>
        )}
      </CardHeader>
      <CardContent>{/* Record details */}</CardContent>
    </Card>
  );
}
```

## Step 9: Advanced - Optimistic Updates

When you need to update records optimistically:

```typescript
// src/components/RecordEditor.tsx
"use client";

import { useRecords } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function RecordEditor({ id }: { id: string }) {
  const { getRecordById, mutate, records } = useRecords();
  const [name, setName] = useState("");

  const record = getRecordById(id);

  const updateRecord = async () => {
    // Optimistically update the UI
    mutate(
      records.map((r) => (r.id === id ? { ...r, name } : r)),
      false // Don't revalidate immediately
    );

    try {
      // Make the API call
      await fetch(`/api/records/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      // Revalidate to ensure consistency
      mutate();
    } catch (error) {
      // Revert on error
      mutate();
    }
  };

  return (
    <div className="space-y-4">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border rounded px-3 py-2 w-full"
      />
      <Button onClick={updateRecord}>Update Record</Button>
    </div>
  );
}
```

## Step 10: Preloading with Server Components (Bonus)

For even faster initial loads in Next.js:

```typescript
// src/app/page.tsx
import { DataLoader } from "@/components/DataLoader";
import { Dashboard } from "@/components/Dashboard";
import { Suspense } from "react";

async function getRecords() {
  const response = await fetch("https://your-api.com/records", {
    cache: "no-store", // or next: { revalidate: 60 }
  });
  return response.json();
}

export default async function Home() {
  // Preload data on server
  const initialData = await getRecords();

  return (
    <DataLoader fallbackData={initialData}>
      <Dashboard />
    </DataLoader>
  );
}
```

## Key Benefits of Using SWR

1. **Automatic caching**: Data is cached and shared across components
2. **Revalidation**: Automatic background updates when needed
3. **Focus revalidation**: Optional refetch when user returns to tab
4. **Error retry**: Built-in retry logic with exponential backoff
5. **Optimistic updates**: Easy to implement optimistic UI updates
6. **Deduplication**: Multiple components requesting same data = single request
7. **Persistence**: Can persist cache to localStorage
8. **TypeScript**: Full type safety out of the box

This approach is production-ready and handles all edge cases like network failures, stale data, and concurrent requests automatically!

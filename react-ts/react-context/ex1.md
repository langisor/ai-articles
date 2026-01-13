# Preloading Large Datasets with React Context

For preloading ~2000 records at app startup, here's a robust pattern that handles loading states, errors, and caching:

## Step 1: Create the Data Context

```typescript
// src/contexts/DataContext.tsx
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

// Define your record type
interface Record {
  id: string;
  name: string;
  // ... other fields
}

interface DataContextType {
  records: Record[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<Record[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/records", {
        // Add cache control if needed
        cache: "no-store", // or 'force-cache' depending on your needs
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch records: ${response.statusText}`);
      }

      const data = await response.json();
      setRecords(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Error fetching records:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on mount
  useEffect(() => {
    fetchRecords();
  }, []);

  return (
    <DataContext.Provider
      value={{
        records,
        isLoading,
        error,
        refetch: fetchRecords,
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

## Step 2: Add Provider to Layout with Loading UI

```typescript
// src/app/layout.tsx
import { DataProvider } from "@/contexts/DataContext";
import { Toaster } from "@/components/ui/toaster";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <DataProvider>{children}</DataProvider>
        <Toaster />
      </body>
    </html>
  );
}
```

## Step 3: Create a Loading Wrapper Component

To show a loading screen until data is ready:

```typescript
// src/components/DataLoader.tsx
"use client";

import { useRecords } from "@/contexts/DataContext";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

interface DataLoaderProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function DataLoader({ children, fallback }: DataLoaderProps) {
  const { isLoading, error, refetch } = useRecords();

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
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription className="mt-2">{error}</AlertDescription>
          <Button onClick={refetch} variant="outline" className="mt-4">
            Retry
          </Button>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}
```

## Step 4: Wrap Your App Content

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

## Step 5: Use the Data in Components

```typescript
// src/components/Dashboard.tsx
"use client";

import { useRecords } from "@/contexts/DataContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";

export function Dashboard() {
  const { records } = useRecords();
  const [search, setSearch] = useState("");

  // Filter records client-side (efficient since data is already loaded)
  const filteredRecords = useMemo(() => {
    if (!search) return records;

    return records.filter((record) =>
      record.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [records, search]);

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Records ({records.length} total)</CardTitle>
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
                className="p-3 border rounded-lg hover:bg-accent"
              >
                {record.name}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

## Step 6: Advanced Pattern - With Pagination & Caching

For better performance with 2000 records:

```tsx
// src/contexts/DataContext.tsx
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
} from "react";

interface Record {
  id: string;
  name: string;
  category?: string;
}

interface DataContextType {
  records: Record[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  // Helper methods
  getRecordById: (id: string) => Record | undefined;
  getRecordsByCategory: (category: string) => Record[];
  searchRecords: (query: string) => Record[];
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<Record[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const fetchRecords = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/records");

      if (!response.ok) {
        throw new Error(`Failed to fetch records: ${response.statusText}`);
      }

      const data = await response.json();
      setRecords(data);

      // Optional: Cache to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("cached_records", JSON.stringify(data));
        localStorage.setItem("cached_records_timestamp", Date.now().toString());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");

      // Try to load from cache on error
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem("cached_records");
        if (cached) {
          setRecords(JSON.parse(cached));
          setError("Using cached data (offline)");
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Try to load from cache first for instant display
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("cached_records");
      const timestamp = localStorage.getItem("cached_records_timestamp");

      // Use cache if less than 1 hour old
      if (cached && timestamp) {
        const age = Date.now() - parseInt(timestamp);
        if (age < 3600000) {
          // 1 hour
          setRecords(JSON.parse(cached));
          setIsLoading(false);
          return; // Skip fetch
        }
      }
    }

    fetchRecords();
  }, []);

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
        refetch: fetchRecords,
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

## Step 7: Using the Helper Methods

```typescript
// src/components/RecordDetail.tsx
"use client";

import { useRecords } from "@/contexts/DataContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function RecordDetail({ id }: { id: string }) {
  const { getRecordById } = useRecords();

  const record = getRecordById(id);

  if (!record) {
    return <div>Record not found</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{record.name}</CardTitle>
      </CardHeader>
      <CardContent>{/* Record details */}</CardContent>
    </Card>
  );
}
```

## Key Benefits of This Approach

1. **Single fetch**: Data loads once at app startup
2. **Global access**: Any component can access the data without prop drilling
3. **Loading states**: Clean UX during initial load
4. **Error handling**: Graceful error recovery with retry
5. **Performance**: Indexed lookups for O(1) access by ID
6. **Caching**: Optional localStorage for instant loads on return visits
7. **Type safety**: Full TypeScript support throughout

This pattern works great for reference data, lookup tables, or any dataset that doesn't change frequently during a session.

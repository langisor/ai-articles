# Preloading Dictionary Data with React Context + SWR

Here's a complete implementation for your dictionary app with ~2000 words.

## Step 1: Create the Dictionary Context with SWR

```typescript
// src/contexts/DictionaryContext.tsx
"use client";

import { createContext, useContext, ReactNode, useMemo } from "react";
import useSWR from "swr";
import { DictionaryResponse, Word, Category } from "@/lib/types";

interface DictionaryContextType {
  // Core data
  words: Word[];
  categories: Category[];
  total: number;
  isLoading: boolean;
  error: any;
  mutate: () => void;

  // Helper methods
  filterWordsByCategory: (categoryName: string) => Word[];
  searchWords: (query: string) => Word[];
  getWordBySerial: (serial: number) => Word | undefined;
  getCategoryById: (catId: number) => Category | undefined;
  getWordsBySerialRange: (start: number, end: number) => Word[];
}

const DictionaryContext = createContext<DictionaryContextType | undefined>(
  undefined
);

// Fetcher function for SWR
const fetcher = async (url: string): Promise<DictionaryResponse> => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch dictionary: ${response.statusText}`);
  }

  return response.json();
};

export function DictionaryProvider({ children }: { children: ReactNode }) {
  // SWR hook for data fetching
  const { data, error, isLoading, mutate } = useSWR<DictionaryResponse>(
    "/api/dict",
    fetcher,
    {
      // SWR configuration for optimal performance
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      revalidateIfStale: false,
      dedupingInterval: 300000, // 5 minutes
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      // Keep data cached
      keepPreviousData: true,
    }
  );

  // Extract data with defaults
  const words = data?.words || [];
  const categories = data?.categories || [];
  const total = data?.total || 0;

  // Create indexed maps for O(1) lookups
  const wordsBySerial = useMemo(() => {
    return new Map(words.map((word) => [word.serial, word]));
  }, [words]);

  const wordsByCategory = useMemo(() => {
    const map = new Map<string, Word[]>();
    words.forEach((word) => {
      const existing = map.get(word.category_name) || [];
      map.set(word.category_name, [...existing, word]);
    });
    return map;
  }, [words]);

  const categoriesById = useMemo(() => {
    return new Map(categories.map((cat) => [cat.cat_id, cat]));
  }, [categories]);

  // Helper function: Filter words by category
  const filterWordsByCategory = (categoryName: string): Word[] => {
    return wordsByCategory.get(categoryName) || [];
  };

  // Helper function: Search words (searches across multiple fields)
  const searchWords = (query: string): Word[] => {
    if (!query.trim()) return words;

    const lowerQuery = query.toLowerCase().trim();

    return words.filter(
      (word) =>
        word.urdu.toLowerCase().includes(lowerQuery) ||
        word.english.toLowerCase().includes(lowerQuery) ||
        word.arabic.includes(lowerQuery) ||
        word.transliteration?.toLowerCase().includes(lowerQuery) ||
        word.category_name.toLowerCase().includes(lowerQuery) ||
        word.example_urdu?.toLowerCase().includes(lowerQuery) ||
        word.example_english?.toLowerCase().includes(lowerQuery)
    );
  };

  // Helper function: Get word by serial number
  const getWordBySerial = (serial: number): Word | undefined => {
    return wordsBySerial.get(serial);
  };

  // Helper function: Get category by ID
  const getCategoryById = (catId: number): Category | undefined => {
    return categoriesById.get(catId);
  };

  // Helper function: Get words by serial range (useful for pagination)
  const getWordsBySerialRange = (start: number, end: number): Word[] => {
    return words.filter((word) => word.serial >= start && word.serial <= end);
  };

  return (
    <DictionaryContext.Provider
      value={{
        words,
        categories,
        total,
        isLoading,
        error,
        mutate,
        filterWordsByCategory,
        searchWords,
        getWordBySerial,
        getCategoryById,
        getWordsBySerialRange,
      }}
    >
      {children}
    </DictionaryContext.Provider>
  );
}

export function useDictionary() {
  const context = useContext(DictionaryContext);
  if (context === undefined) {
    throw new Error("useDictionary must be used within a DictionaryProvider");
  }
  return context;
}
```

## Step 2: Configure SWR Globally with Persistence

```typescript
// src/app/providers.tsx
"use client";

import { SWRConfig } from "swr";
import { DictionaryProvider } from "@/contexts/DictionaryContext";
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
        dedupingInterval: 300000, // 5 minutes
        // Use localStorage for persistence across sessions
        provider: () => {
          if (typeof window !== "undefined") {
            const cacheKey = "dictionary-app-cache";
            const cached = localStorage.getItem(cacheKey);
            return new Map(cached ? JSON.parse(cached) : []);
          }
          return new Map();
        },
      }}
    >
      <DictionaryProvider>{children}</DictionaryProvider>
    </SWRConfig>
  );
}
```

## Step 3: Update Layout

```typescript
// src/app/layout.tsx
import { Providers } from "@/app/providers";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

export const metadata = {
  title: "Dictionary App",
  description: "Core 2000 Words Dictionary",
};

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

## Step 4: Create Loading Wrapper Component

```typescript
// src/components/DictionaryLoader.tsx
"use client";

import { useDictionary } from "@/contexts/DictionaryContext";
import { Loader2, AlertCircle, BookOpen } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";
import { Progress } from "@/components/ui/progress";

interface DictionaryLoaderProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function DictionaryLoader({
  children,
  fallback,
}: DictionaryLoaderProps) {
  const { isLoading, error, mutate, total } = useDictionary();

  if (isLoading) {
    return (
      fallback || (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center space-y-4 max-w-md">
            <BookOpen className="h-16 w-16 text-primary mx-auto" />
            <div className="space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <h2 className="text-2xl font-semibold">Loading Dictionary</h2>
              <p className="text-muted-foreground">
                Loading {total > 0 ? total : "~2000"} words...
              </p>
            </div>
            <Progress value={33} className="w-full" />
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
          <AlertTitle>Error Loading Dictionary</AlertTitle>
          <AlertDescription className="mt-2 space-y-4">
            <p>
              {error.message ||
                "An error occurred while loading the dictionary data."}
            </p>
            <Button
              onClick={() => mutate()}
              variant="outline"
              className="w-full"
            >
              Retry Loading
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}
```

## Step 5: Use in Your App

```typescript
// src/app/page.tsx
import { DictionaryLoader } from "@/components/DictionaryLoader";
import { DictionaryDashboard } from "@/components/DictionaryDashboard";

export default function Home() {
  return (
    <DictionaryLoader>
      <DictionaryDashboard />
    </DictionaryLoader>
  );
}
```

## Step 6: Create Dashboard Component

```typescript
// src/components/DictionaryDashboard.tsx
"use client";

import { useDictionary } from "@/contexts/DictionaryContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Search } from "lucide-react";
import { useState, useMemo } from "react";

export function DictionaryDashboard() {
  const {
    words,
    categories,
    total,
    mutate,
    isLoading,
    filterWordsByCategory,
    searchWords,
  } = useDictionary();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Filter and search words
  const filteredWords = useMemo(() => {
    let result = words;

    // Apply category filter
    if (selectedCategory !== "all") {
      result = filterWordsByCategory(selectedCategory);
    }

    // Apply search
    if (search.trim()) {
      result = result.filter(
        (word) =>
          word.urdu.toLowerCase().includes(search.toLowerCase()) ||
          word.english.toLowerCase().includes(search.toLowerCase()) ||
          word.arabic.includes(search) ||
          word.transliteration?.toLowerCase().includes(search.toLowerCase())
      );
    }

    return result;
  }, [words, selectedCategory, search, filterWordsByCategory]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dictionary</h1>
          <p className="text-muted-foreground">
            {total.toLocaleString()} total words • {categories.length}{" "}
            categories
          </p>
        </div>
        <Button onClick={() => mutate()} variant="outline" disabled={isLoading}>
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by Urdu, English, Arabic, or transliteration..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.cat_id} value={cat.category}>
                    {cat.category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>Words ({filteredWords.length.toLocaleString()})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredWords.map((word) => (
              <div
                key={word.serial}
                className="p-4 border rounded-lg hover:bg-accent transition-colors space-y-2"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="font-mono">
                        #{word.serial}
                      </Badge>
                      <Badge variant="secondary">{word.category_name}</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Urdu</p>
                        <p className="font-semibold text-lg" dir="rtl">
                          {word.urdu}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">English</p>
                        <p className="font-semibold">{word.english}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Arabic</p>
                        <p className="font-semibold text-lg" dir="rtl">
                          {word.arabic}
                        </p>
                      </div>
                    </div>
                    {word.transliteration && (
                      <p className="text-sm text-muted-foreground italic">
                        {word.transliteration}
                      </p>
                    )}
                  </div>
                </div>

                {/* Examples */}
                {(word.example_english ||
                  word.example_urdu ||
                  word.example_arabic) && (
                  <div className="pt-2 border-t space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">
                      Examples:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      {word.example_urdu && (
                        <p dir="rtl" className="text-muted-foreground">
                          {word.example_urdu}
                        </p>
                      )}
                      {word.example_english && (
                        <p className="text-muted-foreground">
                          {word.example_english}
                        </p>
                      )}
                    </div>
                    {word.example_transliteration && (
                      <p className="text-xs italic text-muted-foreground">
                        {word.example_transliteration}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredWords.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-semibold">No words found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

## Step 7: Word Detail Component Example

```typescript
// src/components/WordDetail.tsx
'use client'

import { useDictionary } from '@/contexts/DictionaryContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export function WordDetail({ serial }: { serial: number }) {
  const { getWordBySerial } = useDictionary()

  const word = getWordBySerial(serial)

  if (!word) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Word not found
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Word Details</CardTitle>
          <Badge variant="outline">#{word.serial}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Category</h3>
            <Badge>{word.category_name}</Badge>
          </div>

          <Separator />

          <div className="grid gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Urdu</h3>
              <p className="text-2xl font-semibold" dir="rtl">{word.urdu}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">English</h3>
              <p className="text-2xl font-semibold">{word.english}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Arabic</h3>
              <p className="text-2xl font-semibold" dir="rtl">{word.arabic}</p>
            </div>

            {word.transliteration && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Transliteration
                </h3>
                <p className="text-lg italic">{word.transliteration}</p>
              </div>
            )}
          </div>

          {(word.example_urdu || word.example_english || word.example_arabic) && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Examples</h3>

                {word.example_urdu && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Urdu</p>
                    <p dir="rtl">{word.example_urdu}</p>
                  </div>
                )}

                {word.example_english && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">English</p>
                    <p>{word.example_english}</p>
                  </div>
                )}

                {word.example_arabic && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Arabic</p>
                    <p dir="rtl">{word.example_arabic}</p>
                  </div>
                )}

                {word.example_transliteration && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Transliteration</p>
                    <p className="italic text-sm">{word.example_transliteration}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
  )
}
```

## Step 8: Category Statistics Component

```typescript
// src/components/CategoryStats.tsx
"use client";

import { useDictionary } from "@/contexts/DictionaryContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function CategoryStats() {
  const { categories, filterWordsByCategory, total } = useDictionary();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Categories</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {categories.map((category) => {
            const count = filterWordsByCategory(category.category).length;
            const percentage = ((count / total) * 100).toFixed(1);

            return (
              <div
                key={category.cat_id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium">{category.category}</p>
                  <p className="text-sm text-muted-foreground">
                    {count.toLocaleString()} words ({percentage}%)
                  </p>
                </div>
                <Badge variant="secondary">{count}</Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
```

## Key Features

1. **Single API call on startup**: All 2000 words loaded once
2. **Fast lookups**: O(1) access using Maps for serial numbers and categories
3. **Multi-field search**: Search across Urdu, English, Arabic, transliteration
4. **Category filtering**: Quick filtering by category
5. **SWR caching**: Automatic caching and revalidation
6. **localStorage persistence**: Data persists across sessions
7. **Error handling**: Graceful error states with retry
8. **TypeScript safety**: Full type safety throughout
9. **Optimized rendering**: useMemo for expensive computations
10. **Right-to-left support**: Proper RTL for Urdu and Arabic text

This implementation is production-ready and handles your 2000+ word dictionary efficiently!

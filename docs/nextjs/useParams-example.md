# Nextjs `useParams`/`usePathname` Example

## `app/dashboard/page.tsx`

```tsx
import { Suspense } from "react";
import SearchBar from "./search-bar";

// This component passed as a fallback to the Suspense boundary
// will be rendered in place of the search bar in the initial HTML.
// When the value is available during React hydration the fallback
// will be replaced with the `<SearchBar>` component.
function SearchBarFallback() {
  return <>placeholder</>;
}

export default function Page() {
  return (
    <div className="bg-amber-900 text-white p-2 border-2 border-white">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <nav>
        <Suspense fallback={<SearchBarFallback />}>
          <SearchBar />
        </Suspense>
      </nav>
    </div>
  );
}
```

## `src/app/components/search-bar.tsx` - Client Search bar

```tsx
"use client";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
export default function SearchBar() {
  const searchParams = useSearchParams();
  const search = searchParams.get("search");
  const [users, setUsers] = useState([]);
  const pathname = usePathname();
  const router = useRouter();
  // This will not be logged on the server when using static rendering
  console.log("client - search", search);
  const handleSearch = async (search: string) => {
    const response = await fetch(
      `https://dummyjson.com/users/search?q=${search}`
    );
    const data = await response.json();
    setUsers(data.users);
    console.log("data", data);
    router.push(`${pathname}?search=${search}`);
  };
  return (
    <div className="flex flex-col gap-2 bg-indigo-700 text-white p-2 border-2 border-white">
      <Label htmlFor="search">Search User in dummyjson.com/users</Label>
      <Input
        type="text"
        placeholder="Search"
        id="search"
        name="search"
        onChange={(e) => handleSearch(e.target.value)}
      />
      <ul className="">
        {users.map((user: any) => (
          <li
            className="cursor-pointer"
            key={user.id}
            onClick={() => router.push(`${pathname}?search=${user.firstName}`)}
          >
            {user.firstName}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

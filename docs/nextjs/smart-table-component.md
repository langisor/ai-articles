# `SmartTable` component`

## Source Code

```tsx
"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Settings,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";

// Exported interfaces for users
export interface ColumnsVisibility {
  sm?: string[];
  md?: string[];
  lg?: string[];
}

export interface ColumnsConfig {
  columnsVisibility?: ColumnsVisibility;
  freezeHeader?: boolean;
  enableColumnToggle?: boolean;
}

export interface SmartTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, any>[];
  columnsConfig?: ColumnsConfig;
  className?: string;
  headerStyle?: React.CSSProperties;
  pageSize?: number;
}

// Utility hook to handle responsive column visibility
function useResponsiveColumns<TData>(
  columns: ColumnDef<TData, any>[],
  columnsVisibility?: ColumnsVisibility,
  enableColumnToggle?: boolean
) {
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [userToggledColumns, setUserToggledColumns] =
    React.useState<VisibilityState>({});

  React.useEffect(() => {
    if (!columnsVisibility) {
      // Apply user toggles if no responsive config
      setColumnVisibility(userToggledColumns);
      return;
    }

    const updateVisibility = () => {
      const width = window.innerWidth;
      let visibleColumnIds: string[] | undefined;

      // Tailwind breakpoints: sm: 640px, md: 768px, lg: 1024px
      if (width < 640 && columnsVisibility.sm) {
        visibleColumnIds = columnsVisibility.sm;
      } else if (width >= 640 && width < 768 && columnsVisibility.md) {
        visibleColumnIds = columnsVisibility.md;
      } else if (width >= 768 && width < 1024 && columnsVisibility.lg) {
        visibleColumnIds = columnsVisibility.lg;
      }

      if (visibleColumnIds) {
        const visibility: VisibilityState = {};
        columns.forEach((col) => {
          const colId = (col as any).accessorKey || (col as any).id;
          if (colId) {
            // Merge responsive visibility with user toggles
            const isVisibleByBreakpoint = visibleColumnIds!.includes(colId);
            const userToggled = userToggledColumns[colId];
            visibility[colId] =
              userToggled !== undefined ? userToggled : isVisibleByBreakpoint;
          }
        });
        setColumnVisibility(visibility);
      } else {
        // All columns visible by default, but respect user toggles
        setColumnVisibility(userToggledColumns);
      }
    };

    updateVisibility();
    window.addEventListener("resize", updateVisibility);
    return () => window.removeEventListener("resize", updateVisibility);
  }, [columns, columnsVisibility, userToggledColumns]);

  const toggleColumn = React.useCallback(
    (columnId: string) => {
      setUserToggledColumns((prev) => {
        const current =
          prev[columnId] !== undefined
            ? prev[columnId]
            : (columnVisibility[columnId] ?? true);
        return {
          ...prev,
          [columnId]: !current,
        };
      });
    },
    [columnVisibility]
  );

  return {
    columnVisibility,
    setColumnVisibility,
    toggleColumn,
    userToggledColumns,
  };
}

function SmartTable<TData>({
  data,
  columns,
  columnsConfig,
  className,
  headerStyle,
  pageSize = 50,
}: SmartTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const { columnVisibility, setColumnVisibility, toggleColumn } =
    useResponsiveColumns(
      columns,
      columnsConfig?.columnsVisibility,
      columnsConfig?.enableColumnToggle
    );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  const freezeHeader = columnsConfig?.freezeHeader ?? false;
  const enableColumnToggle = columnsConfig?.enableColumnToggle ?? false;

  return (
    <div className="w-full space-y-4">
      {enableColumnToggle && (
        <ColumnToggleMenu
          columns={columns}
          columnVisibility={columnVisibility}
          toggleColumn={toggleColumn}
        />
      )}

      <div
        data-slot="smart-table-container"
        className={cn(
          "relative w-full overflow-x-auto",
          freezeHeader && "max-h-[600px] overflow-y-auto"
        )}
      >
        <table
          data-slot="smart-table"
          className={cn("w-full caption-bottom text-sm", className)}
        >
          <SmartTableHeader
            headerGroups={table.getHeaderGroups()}
            style={headerStyle}
            freezeHeader={freezeHeader}
          />
          <SmartTableBody rows={table.getRowModel().rows} />
        </table>
      </div>

      <SmartTablePagination table={table} />
    </div>
  );
}

interface ColumnToggleMenuProps<TData> {
  columns: ColumnDef<TData, any>[];
  columnVisibility: VisibilityState;
  toggleColumn: (columnId: string) => void;
}

function ColumnToggleMenu<TData>({
  columns,
  columnVisibility,
  toggleColumn,
}: ColumnToggleMenuProps<TData>) {
  const [showMenu, setShowMenu] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!showMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  return (
    <div className="flex justify-end" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-3 py-2 text-sm border rounded-md hover:bg-muted transition-colors"
      >
        <Settings className="w-4 h-4" />
        Columns
      </button>

      {showMenu && (
        <div className="absolute z-50 mt-12 min-w-[200px] border rounded-md bg-background shadow-lg">
          <div className="p-2 border-b font-medium text-sm">Toggle Columns</div>
          <div className="p-2 max-h-[300px] overflow-y-auto">
            {columns.map((col) => {
              const colId = (col as any).accessorKey || (col as any).id;
              if (!colId) return null;

              const header =
                typeof col.header === "string" ? col.header : colId;
              const isVisible = columnVisibility[colId] ?? true;

              return (
                <label
                  key={colId}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={() => toggleColumn(colId)}
                    className="w-4 h-4"
                  />
                  {isVisible ? (
                    <Eye className="w-4 h-4 text-green-600" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-gray-400" />
                  )}
                  <span>{header}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface SmartTableHeaderProps {
  headerGroups: Array<{
    id: string;
    headers: Array<{
      id: string;
      isPlaceholder: boolean;
      column: {
        getCanSort: () => boolean;
        getIsSorted: () => false | "asc" | "desc";
        getToggleSortingHandler: () => ((event: unknown) => void) | undefined;
        columnDef: ColumnDef<any, any>;
      };
      getContext: () => any;
    }>;
  }>;
  style?: React.CSSProperties;
  freezeHeader?: boolean;
}

function SmartTableHeader({
  headerGroups,
  style,
  freezeHeader,
}: SmartTableHeaderProps) {
  const [isFrozen, setIsFrozen] = React.useState(false);
  const headerRef = React.useRef<HTMLTableSectionElement>(null);

  React.useEffect(() => {
    if (!freezeHeader) return;

    const container = headerRef.current?.closest(
      '[data-slot="smart-table-container"]'
    );
    if (!container) return;

    const checkScroll = () => {
      setIsFrozen(container.scrollTop > 0);
    };

    container.addEventListener("scroll", checkScroll);
    return () => container.removeEventListener("scroll", checkScroll);
  }, [freezeHeader]);

  return (
    <thead
      ref={headerRef}
      data-slot="smart-table-header"
      className={cn(
        "[&_tr]:border-b",
        freezeHeader && "sticky top-0 z-10 bg-background",
        isFrozen && "shadow-sm"
      )}
      style={style}
    >
      {headerGroups.map((headerGroup) => (
        <tr key={headerGroup.id}>
          {headerGroup.headers.map((header) => (
            <SmartTableHead key={header.id} header={header} />
          ))}
        </tr>
      ))}
    </thead>
  );
}

interface SmartTableHeadProps {
  header: {
    id: string;
    isPlaceholder: boolean;
    column: {
      getCanSort: () => boolean;
      getIsSorted: () => false | "asc" | "desc";
      getToggleSortingHandler: () => ((event: unknown) => void) | undefined;
      columnDef: ColumnDef<any, any>;
    };
    getContext: () => any;
  };
  className?: string;
}

function SmartTableHead({ header, className }: SmartTableHeadProps) {
  const canSort = header.column.getCanSort();
  const isSorted = header.column.getIsSorted();

  return (
    <th
      data-slot="smart-table-head"
      className={cn(
        "text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap",
        canSort && "cursor-pointer select-none hover:bg-muted/50",
        className
      )}
      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
    >
      <div className="flex items-center gap-2">
        {header.isPlaceholder
          ? null
          : flexRender(header.column.columnDef.header, header.getContext())}
        {canSort && (
          <span className="flex items-center">
            {isSorted === "asc" ? (
              <ChevronUp className="h-4 w-4" />
            ) : isSorted === "desc" ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            )}
          </span>
        )}
      </div>
    </th>
  );
}

interface SmartTableBodyProps {
  rows: Array<{
    id: string;
    getVisibleCells: () => Array<{
      id: string;
      column: {
        columnDef: ColumnDef<any, any>;
      };
      getContext: () => any;
    }>;
  }>;
}

function SmartTableBody({ rows }: SmartTableBodyProps) {
  return (
    <tbody data-slot="smart-table-body" className="[&_tr:last-child]:border-0">
      {rows.length ? (
        rows.map((row) => <SmartTableRow key={row.id} row={row} />)
      ) : (
        <tr>
          <td colSpan={100} className="h-24 text-center text-muted-foreground">
            No results found.
          </td>
        </tr>
      )}
    </tbody>
  );
}

interface SmartTableRowProps {
  row: {
    id: string;
    getVisibleCells: () => Array<{
      id: string;
      column: {
        columnDef: ColumnDef<any, any>;
      };
      getContext: () => any;
    }>;
  };
  className?: string;
}

function SmartTableRow({ row, className }: SmartTableRowProps) {
  return (
    <tr
      data-slot="smart-table-row"
      className={cn(
        "hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors",
        className
      )}
    >
      {row.getVisibleCells().map((cell) => (
        <SmartTableCell key={cell.id} cell={cell} />
      ))}
    </tr>
  );
}

interface SmartTableCellProps {
  cell: {
    id: string;
    column: {
      columnDef: ColumnDef<any, any>;
    };
    getContext: () => any;
  };
  className?: string;
}

function SmartTableCell({ cell, className }: SmartTableCellProps) {
  return (
    <td
      data-slot="smart-table-cell"
      className={cn("p-2 align-middle whitespace-nowrap", className)}
    >
      {flexRender(cell.column.columnDef.cell, cell.getContext())}
    </td>
  );
}

interface SmartTablePaginationProps {
  table: {
    getState: () => {
      pagination: {
        pageIndex: number;
        pageSize: number;
      };
    };
    getFilteredRowModel: () => {
      rows: any[];
    };
    getCanPreviousPage: () => boolean;
    getCanNextPage: () => boolean;
    previousPage: () => void;
    nextPage: () => void;
    getPageCount: () => number;
  };
}

function SmartTablePagination({ table }: SmartTablePaginationProps) {
  return (
    <div className="flex items-center justify-between px-2">
      <div className="text-sm text-muted-foreground">
        Showing{" "}
        {table.getState().pagination.pageIndex *
          table.getState().pagination.pageSize +
          1}{" "}
        to{" "}
        {Math.min(
          (table.getState().pagination.pageIndex + 1) *
            table.getState().pagination.pageSize,
          table.getFilteredRowModel().rows.length
        )}{" "}
        of {table.getFilteredRowModel().rows.length} results
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="px-3 py-2 border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-sm font-medium">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </div>
        <button
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="px-3 py-2 border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// Demo Component
interface Employee {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  department: string;
  salary: number;
}

function Demo() {
  const data: Employee[] = Array.from({ length: 150 }, (_, i) => ({
    id: i + 1,
    name: `Employee ${i + 1}`,
    email: `employee${i + 1}@example.com`,
    role: ["Developer", "Designer", "Manager", "Analyst"][i % 4],
    status: i % 5 === 0 ? "Inactive" : "Active",
    department: ["Engineering", "Design", "HR", "Sales"][i % 4],
    salary: 50000 + i * 1000,
  }));

  const columns: ColumnDef<Employee>[] = [
    {
      accessorKey: "id",
      header: "ID",
      enableSorting: true,
    },
    {
      accessorKey: "name",
      header: "Name",
      enableSorting: true,
    },
    {
      accessorKey: "email",
      header: "Email",
      enableSorting: true,
    },
    {
      accessorKey: "role",
      header: "Role",
      enableSorting: true,
    },
    {
      accessorKey: "department",
      header: "Department",
      enableSorting: true,
    },
    {
      accessorKey: "salary",
      header: "Salary",
      enableSorting: true,
      cell: ({ getValue }) => {
        const value = getValue() as number;
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(value);
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      enableSorting: true,
      cell: ({ getValue }) => {
        const status = getValue() as string;
        return (
          <span
            className={cn(
              "px-2 py-1 rounded-full text-xs",
              status === "Active"
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
            )}
          >
            {status}
          </span>
        );
      },
    },
  ];

  const columnsConfig: ColumnsConfig = {
    columnsVisibility: {
      sm: ["name", "status"],
      md: ["name", "email", "role", "status"],
      lg: ["name", "email", "role", "department", "status"],
    },
    freezeHeader: true,
    enableColumnToggle: true,
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">SmartTable Component Demo</h1>
      <p className="text-muted-foreground mb-6">
        Featuring sorting, pagination (50 rows/page), frozen headers, responsive
        column visibility, and manual column toggle
      </p>

      <SmartTable
        data={data}
        columns={columns}
        columnsConfig={columnsConfig}
        headerStyle={{ backgroundColor: "#f8fafc", fontWeight: 600 }}
        pageSize={50}
      />
    </div>
  );
}

export default Demo;

export {
  SmartTable,
  SmartTableHeader,
  SmartTableHead,
  SmartTableBody,
  SmartTableRow,
  SmartTableCell,
  SmartTablePagination,
};
```

### 1. **Extended Breakpoints**

```typescript
interface ColumnsVisibility {
  sm?: string[]; // <640px
  md?: string[]; // 640px-768px
  lg?: string[]; // 768px-1024px (NEW!)
}
```

### 2. **Manual Column Toggle**

- Added `enableColumnToggle` option in `ColumnsConfig`
- Click the "Columns" button to show/hide individual columns
- Visual indicators (eye icons) show visibility status
- Works alongside responsive visibility

### 3. **Smart Visibility Logic**

The component now intelligently merges:

- **Responsive visibility** (based on screen size)
- **User manual toggles** (via the column menu)
- **Default behavior** (all visible if not specified)

User toggles take precedence over responsive config, so users can override the default responsive behavior.

## 📝 Updated Usage

```typescript
const columnsConfig: ColumnsConfig = {
  columnsVisibility: {
    sm: ["name", "status"],           // Mobile
    md: ["name", "email", "status"],  // Tablet
    lg: ["name", "email", "role", "department", "status"], // Desktop
  },
  freezeHeader: true,
  enableColumnToggle: true,  // NEW! Shows the column toggle menu
}

<SmartTable
  data={data}
  columns={columns}
  columnsConfig={columnsConfig}
  pageSize={50}
/>
```

### How It Works

1. Resize the window to see responsive column visibility in action
2. Use the "Columns" button to manually show/hide columns
3. Manual toggles persist even when resizing the window
4. Click column headers to sort
5. Use pagination controls at the bottom

All exported interfaces are ready for TypeScript users to import!

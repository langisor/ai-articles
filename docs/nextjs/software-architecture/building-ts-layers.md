# Building Typescript Architecture In `Nextjs` App Router

> comprehensive guide on building TypeScript types, repository, and service layers for local `JSON` data in` Next.js App Router` applications.

## Architecture Overview

This architecture follows the **Repository Pattern** with clear separation of concerns:

```shell
Data Layer (JSON files)
    ↓
Repository Layer (data access)
    ↓
Service Layer (business logic)
    ↓
API Routes / Server Components
    ↓
Client Components
```

## 1. TypeScript Types Foundation

First, let's create robust, type-safe definitions:

```typescript
// src/types/user.types.ts

/**
 * Base user interface representing the core user entity
 * This matches the structure of our JSON data files
 */
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'moderator';
  createdAt: string; // ISO 8601 date string
  updatedAt: string;
  isActive: boolean;
  metadata?: Record<string, unknown>; // Flexible metadata object
}

/**
 * Data Transfer Object for creating new users
 * Omits auto-generated fields like id, createdAt, updatedAt
 */
export type CreateUserDTO = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Data Transfer Object for updating existing users
 * All fields are optional except id
 */
export type UpdateUserDTO = Partial<Omit<User, 'id'>> & { id: string };

/**
 * Query parameters for filtering and pagination
 */
export interface UserQueryParams {
  role?: User['role'];
  isActive?: boolean;
  search?: string; // Search in name or email
  page?: number;
  limit?: number;
  sortBy?: keyof User;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response wrapper
 * Generic type T allows reuse for different entities
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Standard API response wrapper for type-safe error handling
 */
export type ApiResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: string };
```

```typescript
// src/types/product.types.ts

/**
 * Product entity with advanced typing
 */
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: ProductCategory;
  tags: string[];
  inStock: boolean;
  inventory: {
    quantity: number;
    reserved: number;
    available: number; // computed field
  };
  images: ProductImage[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Product category with hierarchical structure
 */
export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  parentId?: string; // For nested categories
}

/**
 * Product image with metadata
 */
export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  isPrimary: boolean;
  order: number;
}

export type CreateProductDTO = Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'inventory'> & {
  quantity: number;
};

export interface ProductQueryParams {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  tags?: string[];
  search?: string;
  page?: number;
  limit?: number;
}
```

## 2. Repository Layer

The repository layer handles all data access logic:

```typescript
// src/repositories/base.repository.ts

import fs from 'fs/promises';
import path from 'path';

/**
 * Generic base repository providing CRUD operations for JSON files
 * Uses generics to maintain type safety across different entity types
 * 
 * @template T - The entity type this repository manages
 */
export abstract class BaseRepository<T extends { id: string }> {
  protected abstract readonly filePath: string;
  
  /**
   * Reads and parses the JSON file
   * Includes error handling and returns empty array if file doesn't exist
   */
  protected async readData(): Promise<T[]> {
    try {
      const fullPath = path.join(process.cwd(), this.filePath);
      const fileContent = await fs.readFile(fullPath, 'utf-8');
      return JSON.parse(fileContent) as T[];
    } catch (error) {
      // If file doesn't exist, return empty array
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw new Error(`Failed to read data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Writes data to JSON file with proper formatting
   * Creates directory structure if it doesn't exist
   */
  protected async writeData(data: T[]): Promise<void> {
    try {
      const fullPath = path.join(process.cwd(), this.filePath);
      const dirPath = path.dirname(fullPath);
      
      // Ensure directory exists
      await fs.mkdir(dirPath, { recursive: true });
      
      // Write with pretty formatting for readability
      await fs.writeFile(fullPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      throw new Error(`Failed to write data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieves all records
   */
  async findAll(): Promise<T[]> {
    return this.readData();
  }

  /**
   * Finds a single record by ID
   * Returns undefined if not found
   */
  async findById(id: string): Promise<T | undefined> {
    const data = await this.readData();
    return data.find(item => item.id === id);
  }

  /**
   * Creates a new record
   * Validates that ID doesn't already exist
   */
  async create(item: T): Promise<T> {
    const data = await this.readData();
    
    // Check for duplicate ID
    if (data.some(existing => existing.id === item.id)) {
      throw new Error(`Item with id ${item.id} already exists`);
    }
    
    data.push(item);
    await this.writeData(data);
    return item;
  }

  /**
   * Updates an existing record
   * Returns the updated record or undefined if not found
   */
  async update(id: string, updates: Partial<T>): Promise<T | undefined> {
    const data = await this.readData();
    const index = data.findIndex(item => item.id === id);
    
    if (index === -1) {
      return undefined;
    }
    
    // Merge updates with existing data
    data[index] = { ...data[index], ...updates };
    await this.writeData(data);
    return data[index];
  }

  /**
   * Deletes a record by ID
   * Returns true if deleted, false if not found
   */
  async delete(id: string): Promise<boolean> {
    const data = await this.readData();
    const filteredData = data.filter(item => item.id !== id);
    
    if (filteredData.length === data.length) {
      return false; // Nothing was deleted
    }
    
    await this.writeData(filteredData);
    return true;
  }

  /**
   * Finds records matching a predicate function
   * Useful for complex queries
   */
  async findWhere(predicate: (item: T) => boolean): Promise<T[]> {
    const data = await this.readData();
    return data.filter(predicate);
  }

  /**
   * Counts total records
   */
  async count(): Promise<number> {
    const data = await this.readData();
    return data.length;
  }

  /**
   * Checks if a record exists
   */
  async exists(id: string): Promise<boolean> {
    const item = await this.findById(id);
    return item !== undefined;
  }
}
```

```typescript
// src/repositories/user.repository.ts

import { User, UserQueryParams } from '@/types/user.types';
import { BaseRepository } from './base.repository';

/**
 * User-specific repository extending base repository
 * Adds custom query methods specific to user data
 */
export class UserRepository extends BaseRepository<User> {
  protected readonly filePath = 'data/users.json';

  /**
   * Finds users with advanced filtering and pagination
   * Demonstrates complex query logic in repository layer
   */
  async findWithFilters(params: UserQueryParams): Promise<User[]> {
    let users = await this.readData();

    // Apply role filter
    if (params.role) {
      users = users.filter(user => user.role === params.role);
    }

    // Apply active status filter
    if (params.isActive !== undefined) {
      users = users.filter(user => user.isActive === params.isActive);
    }

    // Apply search filter (searches in name and email)
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      users = users.filter(user => 
        user.name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    if (params.sortBy) {
      users.sort((a, b) => {
        const aVal = a[params.sortBy!];
        const bVal = b[params.sortBy!];
        
        if (aVal < bVal) return params.sortOrder === 'desc' ? 1 : -1;
        if (aVal > bVal) return params.sortOrder === 'desc' ? -1 : 1;
        return 0;
      });
    }

    // Apply pagination
    if (params.page && params.limit) {
      const startIndex = (params.page - 1) * params.limit;
      users = users.slice(startIndex, startIndex + params.limit);
    }

    return users;
  }

  /**
   * Finds user by email (unique constraint)
   */
  async findByEmail(email: string): Promise<User | undefined> {
    const users = await this.readData();
    return users.find(user => user.email === email);
  }

  /**
   * Finds all users by role
   */
  async findByRole(role: User['role']): Promise<User[]> {
    return this.findWhere(user => user.role === role);
  }

  /**
   * Finds all active users
   */
  async findActive(): Promise<User[]> {
    return this.findWhere(user => user.isActive === true);
  }

  /**
   * Bulk update operation
   * Useful for batch operations like activating/deactivating multiple users
   */
  async bulkUpdate(ids: string[], updates: Partial<User>): Promise<User[]> {
    const users = await this.readData();
    const updatedUsers: User[] = [];

    for (const id of ids) {
      const index = users.findIndex(user => user.id === id);
      if (index !== -1) {
        users[index] = { ...users[index], ...updates };
        updatedUsers.push(users[index]);
      }
    }

    await this.writeData(users);
    return updatedUsers;
  }
}
```

```typescript
// src/repositories/product.repository.ts

import { Product, ProductQueryParams } from '@/types/product.types';
import { BaseRepository } from './base.repository';

/**
 * Product repository with advanced filtering capabilities
 */
export class ProductRepository extends BaseRepository<Product> {
  protected readonly filePath = 'data/products.json';

  /**
   * Advanced product search with multiple filters
   */
  async findWithFilters(params: ProductQueryParams): Promise<Product[]> {
    let products = await this.readData();

    // Filter by category
    if (params.category) {
      products = products.filter(p => p.category.slug === params.category);
    }

    // Filter by price range
    if (params.minPrice !== undefined) {
      products = products.filter(p => p.price >= params.minPrice!);
    }
    if (params.maxPrice !== undefined) {
      products = products.filter(p => p.price <= params.maxPrice!);
    }

    // Filter by stock availability
    if (params.inStock !== undefined) {
      products = products.filter(p => p.inStock === params.inStock);
    }

    // Filter by tags (product must have ALL specified tags)
    if (params.tags && params.tags.length > 0) {
      products = products.filter(p => 
        params.tags!.every(tag => p.tags.includes(tag))
      );
    }

    // Search in name and description
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      products = products.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower)
      );
    }

    // Apply pagination
    if (params.page && params.limit) {
      const startIndex = (params.page - 1) * params.limit;
      products = products.slice(startIndex, startIndex + params.limit);
    }

    return products;
  }

  /**
   * Finds products by category with optional pagination
   */
  async findByCategory(categorySlug: string, limit?: number): Promise<Product[]> {
    const products = await this.findWhere(p => p.category.slug === categorySlug);
    return limit ? products.slice(0, limit) : products;
  }

  /**
   * Finds low stock products (for inventory management)
   */
  async findLowStock(threshold: number = 10): Promise<Product[]> {
    return this.findWhere(p => p.inventory.available < threshold);
  }

  /**
   * Updates inventory for a product
   * Recalculates available quantity
   */
  async updateInventory(
    productId: string, 
    quantity: number, 
    reserved: number
  ): Promise<Product | undefined> {
    const product = await this.findById(productId);
    if (!product) return undefined;

    return this.update(productId, {
      inventory: {
        quantity,
        reserved,
        available: quantity - reserved,
      },
      updatedAt: new Date().toISOString(),
    } as Partial<Product>);
  }
}
```

## 3. Service Layer

The service layer contains business logic and orchestrates repository operations:

```typescript
// src/services/user.service.ts

import { UserRepository } from '@/repositories/user.repository';
import { 
  User, 
  CreateUserDTO, 
  UpdateUserDTO, 
  UserQueryParams,
  PaginatedResponse 
} from '@/types/user.types';
import { nanoid } from 'nanoid'; // For generating unique IDs

/**
 * User service handling business logic for user operations
 * Singleton pattern ensures single instance across the application
 */
export class UserService {
  private static instance: UserService;
  private repository: UserRepository;

  private constructor() {
    this.repository = new UserRepository();
  }

  /**
   * Gets singleton instance of UserService
   */
  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  /**
   * Creates a new user with validation and auto-generated fields
   */
  async createUser(dto: CreateUserDTO): Promise<User> {
    // Business rule: Check if email already exists
    const existingUser = await this.repository.findByEmail(dto.email);
    if (existingUser) {
      throw new Error(`User with email ${dto.email} already exists`);
    }

    // Business rule: Validate email format
    if (!this.isValidEmail(dto.email)) {
      throw new Error('Invalid email format');
    }

    // Build complete user object with auto-generated fields
    const now = new Date().toISOString();
    const user: User = {
      id: nanoid(), // Generate unique ID
      ...dto,
      createdAt: now,
      updatedAt: now,
    };

    return this.repository.create(user);
  }

  /**
   * Updates an existing user
   */
  async updateUser(dto: UpdateUserDTO): Promise<User> {
    const existingUser = await this.repository.findById(dto.id);
    if (!existingUser) {
      throw new Error(`User with id ${dto.id} not found`);
    }

    // Business rule: If email is being changed, check for duplicates
    if (dto.email && dto.email !== existingUser.email) {
      const emailExists = await this.repository.findByEmail(dto.email);
      if (emailExists) {
        throw new Error(`Email ${dto.email} is already in use`);
      }
    }

    // Update timestamp
    const updates = {
      ...dto,
      updatedAt: new Date().toISOString(),
    };

    const updatedUser = await this.repository.update(dto.id, updates);
    if (!updatedUser) {
      throw new Error('Failed to update user');
    }

    return updatedUser;
  }

  /**
   * Retrieves user by ID
   */
  async getUserById(id: string): Promise<User> {
    const user = await this.repository.findById(id);
    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }
    return user;
  }

  /**
   * Gets paginated users with filtering
   */
  async getUsers(params: UserQueryParams = {}): Promise<PaginatedResponse<User>> {
    // Set default pagination values
    const page = params.page || 1;
    const limit = params.limit || 10;

    // Get filtered users
    const users = await this.repository.findWithFilters({
      ...params,
      page,
      limit,
    });

    // Get total count for pagination (without limit)
    const allFilteredUsers = await this.repository.findWithFilters({
      ...params,
      page: undefined,
      limit: undefined,
    });
    const total = allFilteredUsers.length;

    return {
      data: users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Deletes a user
   */
  async deleteUser(id: string): Promise<void> {
    const deleted = await this.repository.delete(id);
    if (!deleted) {
      throw new Error(`User with id ${id} not found`);
    }
  }

  /**
   * Business logic: Deactivates a user instead of deleting
   */
  async deactivateUser(id: string): Promise<User> {
    return this.updateUser({
      id,
      isActive: false,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Business logic: Activates a user
   */
  async activateUser(id: string): Promise<User> {
    return this.updateUser({
      id,
      isActive: true,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Business logic: Changes user role with validation
   */
  async changeUserRole(userId: string, newRole: User['role']): Promise<User> {
    const user = await this.getUserById(userId);

    // Business rule: Cannot demote the last admin
    if (user.role === 'admin' && newRole !== 'admin') {
      const admins = await this.repository.findByRole('admin');
      if (admins.length <= 1) {
        throw new Error('Cannot demote the last admin user');
      }
    }

    return this.updateUser({ id: userId, role: newRole });
  }

  /**
   * Private helper: Email validation
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
```

```typescript
// src/services/product.service.ts

import { ProductRepository } from '@/repositories/product.repository';
import { 
  Product, 
  CreateProductDTO, 
  ProductQueryParams,
  PaginatedResponse 
} from '@/types/product.types';
import { nanoid } from 'nanoid';

/**
 * Product service with inventory management business logic
 */
export class ProductService {
  private static instance: ProductService;
  private repository: ProductRepository;

  private constructor() {
    this.repository = new ProductRepository();
  }

  static getInstance(): ProductService {
    if (!ProductService.instance) {
      ProductService.instance = new ProductService();
    }
    return ProductService.instance;
  }

  /**
   * Creates a new product with inventory initialization
   */
  async createProduct(dto: CreateProductDTO): Promise<Product> {
    // Business rule: Validate price
    if (dto.price < 0) {
      throw new Error('Price cannot be negative');
    }

    const now = new Date().toISOString();
    const product: Product = {
      id: nanoid(),
      ...dto,
      inventory: {
        quantity: dto.quantity,
        reserved: 0,
        available: dto.quantity,
      },
      inStock: dto.quantity > 0,
      createdAt: now,
      updatedAt: now,
    };

    return this.repository.create(product);
  }

  /**
   * Gets products with pagination and filters
   */
  async getProducts(params: ProductQueryParams = {}): Promise<PaginatedResponse<Product>> {
    const page = params.page || 1;
    const limit = params.limit || 20;

    const products = await this.repository.findWithFilters({
      ...params,
      page,
      limit,
    });

    const allFiltered = await this.repository.findWithFilters({
      ...params,
      page: undefined,
      limit: undefined,
    });

    return {
      data: products,
      pagination: {
        total: allFiltered.length,
        page,
        limit,
        totalPages: Math.ceil(allFiltered.length / limit),
      },
    };
  }

  /**
   * Business logic: Reserve inventory for an order
   */
  async reserveInventory(productId: string, quantity: number): Promise<Product> {
    const product = await this.repository.findById(productId);
    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    // Business rule: Check if enough inventory available
    if (product.inventory.available < quantity) {
      throw new Error(
        `Insufficient inventory. Available: ${product.inventory.available}, Requested: ${quantity}`
      );
    }

    // Update inventory
    const newReserved = product.inventory.reserved + quantity;
    const updated = await this.repository.updateInventory(
      productId,
      product.inventory.quantity,
      newReserved
    );

    if (!updated) {
      throw new Error('Failed to reserve inventory');
    }

    return updated;
  }

  /**
   * Business logic: Release reserved inventory (e.g., cancelled order)
   */
  async releaseInventory(productId: string, quantity: number): Promise<Product> {
    const product = await this.repository.findById(productId);
    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    const newReserved = Math.max(0, product.inventory.reserved - quantity);
    const updated = await this.repository.updateInventory(
      productId,
      product.inventory.quantity,
      newReserved
    );

    if (!updated) {
      throw new Error('Failed to release inventory');
    }

    return updated;
  }

  /**
   * Business logic: Fulfill order (reduce actual inventory)
   */
  async fulfillOrder(productId: string, quantity: number): Promise<Product> {
    const product = await this.repository.findById(productId);
    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    // Business rule: Quantity must be reserved first
    if (product.inventory.reserved < quantity) {
      throw new Error('Cannot fulfill: inventory not reserved');
    }

    const newQuantity = product.inventory.quantity - quantity;
    const newReserved = product.inventory.reserved - quantity;

    const updated = await this.repository.updateInventory(
      productId,
      newQuantity,
      newReserved
    );

    if (!updated) {
      throw new Error('Failed to fulfill order');
    }

    // Update stock status
    return this.repository.update(productId, {
      inStock: newQuantity > 0,
      updatedAt: new Date().toISOString(),
    } as Partial<Product>) as Promise<Product>;
  }

  /**
   * Gets inventory alerts for low stock products
   */
  async getInventoryAlerts(threshold: number = 10): Promise<Product[]> {
    return this.repository.findLowStock(threshold);
  }
}
```

## 4. API Route Handlers (App Router)

Modern Next.js App Router API routes:

```typescript
// src/app/api/users/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/services/user.service';
import { CreateUserDTO, UserQueryParams } from '@/types/user.types';

const userService = UserService.getInstance();

/**
 * GET /api/users
 * Retrieves users with optional filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse query parameters
    const params: UserQueryParams = {
      role: searchParams.get('role') as any,
      isActive: searchParams.get('isActive') === 'true' ? true : 
                searchParams.get('isActive') === 'false' ? false : undefined,
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      sortBy: searchParams.get('sortBy') as any,
      sortOrder: searchParams.get('sortOrder') as any,
    };

    const result = await userService.getUsers(params);
    
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch users',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users
 * Creates a new user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const dto: CreateUserDTO = body;

    const user = await userService.createUser(dto);
    
    return NextResponse.json(
      {
        success: true,
        data: user,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create user',
      },
      { status: 400 }
    );
  }
}
```

```typescript
// src/app/api/users/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/services/user.service';
import { UpdateUserDTO } from '@/types/user.types';

const userService = UserService.getInstance();

/**
 * GET /api/users/[id]
 * Retrieves a single user by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await userService.getUserById(params.id);
    
    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'User not found',
      },
      { status: 404 }
    );
  }
}

/**
 * PATCH /api/users/[id]
 * Updates a user
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const dto: UpdateUserDTO = { ...body, id: params.id };

    const user = await userService.updateUser(dto);
    
    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user',
      },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/users/[id]
 * Deletes a user
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await userService.deleteUser(params.id);
    
    return NextResponse.json({
      success: true,
      data: { message: 'User deleted successfully' },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete user',
      },
      { status: 400 }
    );
  }
}
```

## 5. Server Components (Direct Service Access)

```typescript
// src/app/users/page.tsx

import { UserService } from '@/services/user.service';
import { UserList } from '@/components/user-list';

/**
 * Server Component that directly uses the service layer
 * No API route needed - services can be called directly in RSC
 */
export default async function UsersPage({
  searchParams,
}: {
  searchParams: { page?: string; search?: string };
}) {
  const userService = UserService.getInstance();
  
  // Directly call service in Server Component
  const result = await userService.getUsers({
    page: searchParams.page ? parseInt(searchParams.page) : 1,
    limit: 10,
    search: searchParams.search,
  });

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Users</h1>
      <UserList 
        users={result.data} 
        pagination={result.pagination} 
      />
    </div>
  );
}
```

## 6. Client-Side Data Fetching Hook

```typescript
// src/hooks/use-users.ts

'use client';

import { useState, useEffect } from 'react';
import { User, UserQueryParams, PaginatedResponse, ApiResponse } from '@/types/user.types';

/**
 * Custom hook for fetching users from the API
 * Handles loading states and errors
 */
export function useUsers(params?: UserQueryParams) {
  const [data, setData] = useState<PaginatedResponse<User> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true);
        setError(null);

        // Build query string
        const queryParams = new URLSearchParams();
        if (params?.role) queryParams.set('role', params.role);
        if (params?.isActive !== undefined) queryParams.set('isActive', String(params.isActive));
        if (params?.search) queryParams.set('search', params.search);
        if (params?.page) queryParams.set('page', String(params.page));
        if (params?.limit) queryParams.set('limit', String(params.limit));

        const response = await fetch(`/api/users?${queryParams.toString()}`);
        const result: ApiResponse<PaginatedResponse<User>> = await response.json();

        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError('Failed to fetch users');
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, [params?.role, params?.isActive, params?.search, params?.page, params?.limit]);

  return { data, loading, error };
}
```

## 7. Example JSON Data Files

```json
// data/users.json
[
  {
    "id": "usr_1a2b3c4d",
    "email": "admin@example.com",
    "name": "Admin User",
    "role": "admin",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "metadata": {
      "lastLogin": "2024-02-08T08:00:00.000Z"
    }
  }
]
```

```json
// data/products.json
[
  {
    "id": "prod_xyz123",
    "name": "Wireless Headphones",
    "description": "Premium noise-cancelling headphones",
    "price": 299.99,
    "category": {
      "id": "cat_electronics",
      "name": "Electronics",
      "slug": "electronics"
    },
    "tags": ["audio", "wireless", "premium"],
    "inStock": true,
    "inventory": {
      "quantity": 50,
      "reserved": 5,
      "available": 45
    },
    "images": [
      {
        "id": "img_001",
        "url": "/images/headphones-main.jpg",
        "alt": "Wireless headphones front view",
        "isPrimary": true,
        "order": 1
      }
    ],
    "createdAt": "2024-01-20T12:00:00.000Z",
    "updatedAt": "2024-02-01T14:30:00.000Z"
  }
]
```

This architecture provides **type safety**, **separation of concerns**, **reusability**, and **testability** for managing local JSON data in Next.js applications.

## Simplified ASCII Diagram

Here's a simplified `ASCII` representation of the TypeScript layers architecture:


```bash
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  • React Components (use client)  • Custom Hooks  • Forms       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    fetch('/api/users')
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                            │
│  • API Routes (/app/api/*/route.ts)                             │
│  • Server Components (direct service access)                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                  userService.createUser()
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SERVICE LAYER                                │
│  • Business Logic  • Validation  • Orchestration                │
│  • UserService  • ProductService  • ChartService                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                  repository.create()
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    REPOSITORY LAYER                              │
│  • CRUD Operations  • Queries  • File I/O                       │
│  • BaseRepository<T>  • UserRepository  • ProductRepository     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                  fs.writeFile('data/users.json')
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATA LAYER                                 │
│  • JSON Files  • File System  • Storage                         │
│  • users.json  • products.json  • orders.json                   │
└─────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════
                    TYPE SYSTEM (Cross-Cutting)
  Entities • DTOs • Query Params • API Responses • Paginated Data
═══════════════════════════════════════════════════════════════════
```

## Nextjs App Path Tree


```shell
src/
├── types/                    # TypeScript definitions
│   ├── user.types.ts        # User, CreateUserDTO, UserQueryParams
│   ├── product.types.ts     # Product, CreateProductDTO
│   └── chart.types.ts       # ChartDataPoint, PieChartSegment
│
├── repositories/             # Data access layer
│   ├── base.repository.ts   # Generic CRUD operations
│   ├── user.repository.ts   # User-specific queries
│   └── product.repository.ts
│
├── services/                 # Business logic layer
│   ├── user.service.ts      # User business rules
│   ├── product.service.ts   # Product & inventory logic
│   └── chart.service.ts     # Data transformation
│
├── hooks/                    # Client-side data fetching
│   ├── use-users.ts
│   └── use-products.ts
│
├── components/
│   ├── ui/                  # Shadcn components
│   ├── charts/              # Chart components
│   │   ├── pie-chart.tsx
│   │   ├── bar-chart.tsx
│   │   └── line-chart.tsx
│   └── user-list.tsx
│
├── app/
│   ├── api/                 # API Routes (Presentation)
│   │   ├── users/
│   │   │   ├── route.ts    # GET, POST /api/users
│   │   │   └── [id]/
│   │   │       └── route.ts # GET, PATCH, DELETE
│   │   └── products/
│   │       └── route.ts
│   │
│   ├── users/               # Pages (Server Components)
│   │   ├── page.tsx        # Direct service access
│   │   └── [id]/
│   │       └── page.tsx
│   │
│   └── dashboard/
│       └── page.tsx         # Charts & analytics
│
└── data/                    # JSON storage
    ├── users.json
    ├── products.json
    └── orders.json`}

```



This architecture ensures **clean separation**, **type safety**, and **maintainability** across your entire Next.js application!
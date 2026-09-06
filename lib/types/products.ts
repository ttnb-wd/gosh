/**
 * Shared product types for both client and server
 * 
 * These types are plain TypeScript with no Firebase imports
 * so they can be safely used in both client and server components.
 */

/**
 * Decant size pricing information
 */
export type DecantSize = {
  id: string;
  label: string;
  ml: number;
  price: number;
  stock: number;
};

/**
 * Product document structure
 */
export type Product = {
  id: string;
  name: string;
  brand: string;
  category: string;
  description?: string | null;
  
  /** Bottle price */
  price: number;
  
  /** Optional discount percentage (e.g., 20 means 20% off) */
  discount?: number | null;
  
  /** Decant size pricing */
  decant_sizes?: DecantSize[] | null;
  
  /** ImageKit URLs */
  images: string[];
  /** ImageKit file IDs for deletion */
  imageFileIds?: string[];
  
  stock: number;
  is_active: boolean;
  is_featured: boolean;
  
  notes?: {
    top?: string[];
    middle?: string[];
    base?: string[];
  } | null;
  
  volume?: string | null;
  concentration?: string | null;
  
  created_at: unknown;
  updated_at: unknown;
};

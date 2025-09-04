/**
 * Category Helper Service
 * 
 * Provides utilities for working with workflow categories
 * Loads categories from database and caches them for performance
 */

import { createClient } from '@supabase/supabase-js';
import { CategoryWithSubcategories } from '@/types/categories';
import { 
  Target, 
  Search, 
  Users, 
  MessageSquare, 
  TrendingUp, 
  Heart, 
  Zap, 
  MoreHorizontal 
} from 'lucide-react';

// Cache for categories to avoid repeated database calls
let categoriesCache: Map<string, any> = new Map();
let categoriesLoaded = false;

/**
 * Load all categories from database into cache
 */
export async function loadCategories(): Promise<Map<string, any>> {
  // Return cached data if already loaded
  if (categoriesLoaded && categoriesCache.size > 0) {
    return categoriesCache;
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables');
      return categoriesCache;
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Fetch all categories
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('level')
      .order('display_order');
    
    if (error) {
      console.error('Error loading categories:', error);
      return categoriesCache;
    }
    
    // Cache the categories
    data?.forEach(cat => {
      categoriesCache.set(cat.id, cat);
    });
    
    categoriesLoaded = true;
    console.log(`Loaded ${categoriesCache.size} categories into cache`);
    
    return categoriesCache;
  } catch (error) {
    console.error('Failed to load categories:', error);
    return categoriesCache;
  }
}

/**
 * Get human-readable name for a category ID
 */
export function getCategoryName(categoryId: string | null | undefined): string {
  if (!categoryId) return '';
  
  const category = categoriesCache.get(categoryId);
  return category?.name || '';
}

/**
 * Get human-readable name for a subcategory ID
 */
export function getSubcategoryName(subcategoryId: string | null | undefined): string {
  if (!subcategoryId) return '';
  
  const subcategory = categoriesCache.get(subcategoryId);
  return subcategory?.name || '';
}

/**
 * Get all top-level categories (level 0)
 */
export function getTopLevelCategories(): Array<{id: string, name: string}> {
  const categories: Array<{id: string, name: string}> = [];
  
  categoriesCache.forEach((cat, id) => {
    if (cat.level === 0) {
      categories.push({ id, name: cat.name });
    }
  });
  
  return categories.sort((a, b) => {
    const orderA = categoriesCache.get(a.id)?.display_order || 999;
    const orderB = categoriesCache.get(b.id)?.display_order || 999;
    return orderA - orderB;
  });
}

/**
 * Get subcategories for a given parent category
 */
export function getSubcategories(parentCategoryId: string): Array<{id: string, name: string}> {
  const subcategories: Array<{id: string, name: string}> = [];
  
  categoriesCache.forEach((cat, id) => {
    if (cat.parent_id === parentCategoryId) {
      subcategories.push({ id, name: cat.name });
    }
  });
  
  return subcategories.sort((a, b) => {
    const orderA = categoriesCache.get(a.id)?.display_order || 999;
    const orderB = categoriesCache.get(b.id)?.display_order || 999;
    return orderA - orderB;
  });
}

/**
 * Initialize categories on module load for server-side rendering
 */
if (typeof window === 'undefined') {
  // Server-side: load categories immediately
  loadCategories().catch(console.error);
}

export function getCategoryHierarchy(): CategoryWithSubcategories[] {
  const mainCategories: CategoryWithSubcategories[] = [];

  // Get all main categories (level 0)
  categoriesCache.forEach((cat) => {
    if (cat.level === 0) {
      const categoryWithSubs: CategoryWithSubcategories = {
        ...cat,
        subcategories: []
      };
      mainCategories.push(categoryWithSubs);
    }
  });

  // Sort main categories by display order
  mainCategories.sort((a, b) => a.display_order - b.display_order);

  // Add subcategories to each main category
  mainCategories.forEach(mainCat => {
    categoriesCache.forEach((cat) => {
      if (cat.parent_id === mainCat.id) {
        mainCat.subcategories!.push(cat);
      }
    });
    // Sort subcategories by display order
    mainCat.subcategories!.sort((a, b) => a.display_order - b.display_order);
  });

  return mainCategories;
}

/**
 * Get all category IDs that belong to a main category (including subcategories)
 */
export function getCategoryAndSubcategoryIds(mainCategoryId: string): string[] {
  const ids: string[] = [mainCategoryId];

  // Add all subcategory IDs
  categoriesCache.forEach((cat) => {
    if (cat.parent_id === mainCategoryId) {
      ids.push(cat.id);
    }
  });

  return ids;
}

/**
 * Category icons mapping
 */
export const categoryIcons: Record<string, any> = {
  'cat_1': Target,        // Paid Acquisition
  'cat_2': Search,        // Organic & Content Marketing
  'cat_3': Users,         // Lead Generation & Demand Capture
  'cat_4': MessageSquare, // Lead Qualification & Sales Enablement
  'cat_5': TrendingUp,    // Search & Traffic Growth
  'cat_6': Heart,         // Retention, Loyalty & Customer Success
  'cat_7': Zap,           // AI Operational Efficiency
  'cat_8': MoreHorizontal // Other
};

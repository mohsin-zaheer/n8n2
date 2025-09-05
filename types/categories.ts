/**
 * Category Types for Workflow Classification
 * 
 * Hierarchical category system for organizing workflows
 * into business-focused categories and subcategories
 */

export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  level: number;
  items: string[] | null;
  display_order: number;
  created_at: string;
}


export interface CategoryWithSubcategories extends Category {
  subcategories?: Category[];
}

export interface WorkflowCategory {
  sessionId: string;
  categoryId: string;
  categoryName: string;
  subcategoryId?: string;
  subcategoryName?: string;
  createdAt?: Date;
}

// Type for the full category hierarchy
export interface CategoryHierarchy {
  categories: CategoryWithSubcategories[];
}

// Category IDs as constants for type safety
export const CATEGORY_IDS = {
  PAID_ACQUISITION: 'cat_1',
  ORGANIC_CONTENT: 'cat_2',
  LEAD_GENERATION: 'cat_3',
  LEAD_QUALIFICATION: 'cat_4',
  SEARCH_TRAFFIC: 'cat_5',
  RETENTION_LOYALTY: 'cat_6',
  OTHER: 'cat_7'
} as const;

export type CategoryId = typeof CATEGORY_IDS[keyof typeof CATEGORY_IDS];
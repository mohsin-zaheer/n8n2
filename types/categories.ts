/**
 * Category Types for Workflow Classification
 * 
 * Hierarchical category system for organizing workflows
 * into business-focused categories and subcategories
 */

export interface Category {
  id: string;
  name: string;
  level: number;
  subcategories?: Subcategory[];
}

export interface Subcategory {
  id: string;
  name: string;
  parentId: string;
  items: string[];
  displayOrder?: number;
}

export interface WorkflowCategory {
  sessionId: string;
  categoryId: string;
  categoryName: string;
  subcategoryId: string;
  subcategoryName: string;
  createdAt?: Date;
}

// Type for the full category hierarchy
export interface CategoryHierarchy {
  categories: Array<{
    id: string;
    name: string;
    subcategories: Array<{
      id: string;
      name: string;
      items: string[];
    }>;
  }>;
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
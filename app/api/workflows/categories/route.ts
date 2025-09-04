import { NextResponse } from 'next/server'
import { loadCategories, getTopLevelCategories, getCategoryHierarchy } from '@/lib/services/category-helper.service'
import { getWorkflowQueries } from '@/lib/db/workflow-queries'

// Cache categories for 1 hour
let categoriesCache: { data: any[], timestamp: number } | null = null
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour in milliseconds

export async function GET() {
  try {
    // Check cache first
    if (categoriesCache && Date.now() - categoriesCache.timestamp < CACHE_DURATION) {
      return NextResponse.json(categoriesCache.data)
    }

    // Load fresh categories with subcategories
    await loadCategories()
    const categoryHierarchy = getCategoryHierarchy()
    
    // Also get categories from database workflows for dynamic categories
    const workflowQueries = getWorkflowQueries()
    const dbCategories = await workflowQueries.getCategories()
    
    // Merge static categories with dynamic ones from database
    const allCategories = [...categoryHierarchy, ...dbCategories.filter(dbCat => 
      !categoryHierarchy.find(staticCat => staticCat.id === dbCat.id)
    )]
    
    // Update cache
    categoriesCache = {
      data: allCategories,
      timestamp: Date.now()
    }

    return NextResponse.json(allCategories)
  } catch (error) {
    console.error('Categories API error:', error)
    return NextResponse.json(
      { error: 'Failed to load categories' },
      { status: 500 }
    )
  }
}

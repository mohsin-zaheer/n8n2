import { NextResponse } from 'next/server'
import { loadCategories, getTopLevelCategories } from '@/lib/services/category-helper.service'

// Cache categories for 1 hour
let categoriesCache: { data: any[], timestamp: number } | null = null
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour in milliseconds

export async function GET() {
  try {
    // Check cache first
    if (categoriesCache && Date.now() - categoriesCache.timestamp < CACHE_DURATION) {
      return NextResponse.json(categoriesCache.data)
    }

    // Load fresh categories
    await loadCategories()
    const categories = getTopLevelCategories()
    
    // Update cache
    categoriesCache = {
      data: categories,
      timestamp: Date.now()
    }

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Categories API error:', error)
    return NextResponse.json(
      { error: 'Failed to load categories' },
      { status: 500 }
    )
  }
}

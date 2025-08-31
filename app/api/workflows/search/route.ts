import { NextRequest, NextResponse } from 'next/server'
import { WorkflowQueries } from '@/lib/db/workflow-queries'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const category = searchParams.get('category') || 'all'
    const sortBy = searchParams.get('sortBy') || 'relevance'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    const workflowQueries = new WorkflowQueries()
    
    // Use server-side filtering instead of client-side
    const results = await workflowQueries.searchWorkflows({
      query: query.trim() || undefined,
      category: category === 'all' ? undefined : category,
      sortBy: sortBy as 'relevance' | 'recent' | 'popular',
      limit,
      offset
    })

    return NextResponse.json({
      workflows: results.workflows,
      total: results.total,
      page,
      totalPages: Math.ceil(results.total / limit),
      hasMore: offset + limit < results.total
    })
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { error: 'Failed to search workflows' },
      { status: 500 }
    )
  }
}

'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Search, Filter, X, Clock, Users, Zap } from 'lucide-react'
import { getWorkflowQueries } from '@/lib/db/workflow-queries'
import { WorkflowBySlugResponse } from '@/lib/db/types'
import { VettedBadge } from '@/components/ui/vetted-badge'
import { NodeIcon } from '@/components/NodeIcon'
import { getIconName } from '@/lib/icon-aliases'

interface WorkflowSearchResult extends WorkflowBySlugResponse {
  // Add search relevance score
  relevanceScore?: number;
}

const WorkflowDirectoryPage = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [workflows, setWorkflows] = useState<WorkflowSearchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'relevance' | 'recent' | 'popular'>('relevance')

  // Load workflows on component mount
  useEffect(() => {
    const loadWorkflows = async () => {
      try {
        setLoading(true)
        const workflowQueries = getWorkflowQueries()
        // Note: We'll need to add a method to get all workflows
        // For now, this is a placeholder structure
        const results: WorkflowSearchResult[] = []
        setWorkflows(results)
      } catch (error) {
        console.error('Failed to load workflows:', error)
      } finally {
        setLoading(false)
      }
    }

    loadWorkflows()
  }, [])

  // Search and filter logic
  const filteredWorkflows = useMemo(() => {
    let filtered = workflows

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(workflow => {
        // Search in title
        const titleMatch = workflow.state?.settings?.name?.toLowerCase().includes(query)
        
        // Search in node types and names
        const nodeMatch = workflow.state?.nodes?.some(node => 
          node.type?.toLowerCase().includes(query) ||
          node.name?.toLowerCase().includes(query)
        )

        // Search in keywords/description (if available)
        const keywordMatch = workflow.seoMetadata?.keywords?.some(keyword =>
          keyword.toLowerCase().includes(query)
        ) || workflow.seoMetadata?.description?.toLowerCase().includes(query)

        return titleMatch || nodeMatch || keywordMatch
      })

      // Add relevance scoring
      filtered = filtered.map(workflow => {
        let score = 0
        const query = searchQuery.toLowerCase()
        
        // Title match gets highest score
        if (workflow.state?.settings?.name?.toLowerCase().includes(query)) {
          score += 10
        }
        
        // Node type match
        const nodeMatches = workflow.state?.nodes?.filter(node => 
          node.type?.toLowerCase().includes(query)
        ).length || 0
        score += nodeMatches * 5

        // Keyword match
        const keywordMatches = workflow.seoMetadata?.keywords?.filter(keyword =>
          keyword.toLowerCase().includes(query)
        ).length || 0
        score += keywordMatches * 3

        return { ...workflow, relevanceScore: score }
      })
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(workflow => 
        workflow.seoMetadata?.category === selectedCategory
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'relevance':
          return (b.relevanceScore || 0) - (a.relevanceScore || 0)
        case 'recent':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        case 'popular':
          // Placeholder for popularity metric
          return 0
        default:
          return 0
      }
    })

    return filtered
  }, [workflows, searchQuery, selectedCategory, sortBy])

  const categories = [
    'all',
    'Data Integration',
    'Communication',
    'Analytics',
    'Automation',
    'Security',
    'DevOps',
    'Sales',
    'Marketing',
    'Monitoring'
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Workflow Directory
          </h1>
          <p className="text-gray-600">
            Discover and search through our collection of automation workflows
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search workflows by name, nodes, or keywords (e.g., 'leadgen', 'linkedin', 'invoice')..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="relevance">Relevance</option>
                <option value="recent">Most Recent</option>
                <option value="popular">Most Popular</option>
              </select>
            </div>

            {/* Results Count */}
            <div className="ml-auto text-sm text-gray-500">
              {loading ? 'Loading...' : `${filteredWorkflows.length} workflows found`}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading workflows...</p>
            </div>
          ) : filteredWorkflows.length === 0 ? (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No workflows found
              </h3>
              <p className="text-gray-500">
                {searchQuery 
                  ? `No workflows match "${searchQuery}". Try different keywords or browse all workflows.`
                  : 'No workflows available in this category.'
                }
              </p>
            </div>
          ) : (
            filteredWorkflows.map((workflow) => (
              <WorkflowCard key={workflow.session_id} workflow={workflow} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// Workflow Card Component
const WorkflowCard: React.FC<{ workflow: WorkflowSearchResult }> = ({ workflow }) => {
  const nodeCount = workflow.state?.nodes?.length || 0
  const mainNodes = workflow.state?.nodes?.slice(0, 5) || []

  return (
    <div className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-semibold text-gray-900">
                {workflow.state?.settings?.name || 'Untitled Workflow'}
              </h3>
              {workflow.is_vetted && <VettedBadge />}
            </div>
            
            {workflow.seoMetadata?.description && (
              <p className="text-gray-600 mb-3">
                {workflow.seoMetadata.description}
              </p>
            )}

            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Zap className="h-4 w-4" />
                <span>{nodeCount} nodes</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>Updated {new Date(workflow.updated_at).toLocaleDateString()}</span>
              </div>
              {workflow.seoMetadata?.category && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                  {workflow.seoMetadata.category}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Node Preview */}
        {mainNodes.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Key Components:</h4>
            <div className="flex flex-wrap gap-2">
              {mainNodes.map((node, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm"
                >
                  <NodeIcon
                    name={getIconName(node.type)}
                    size={16}
                  />
                  <span>{node.name || node.type}</span>
                </div>
              ))}
              {nodeCount > 5 && (
                <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-500">
                  +{nodeCount - 5} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Keywords */}
        {workflow.seoMetadata?.keywords && workflow.seoMetadata.keywords.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {workflow.seoMetadata.keywords.slice(0, 8).map((keyword, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-50 text-gray-600 rounded text-xs border"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            {workflow.seoMetadata?.businessValue && (
              <span className="text-sm font-medium text-green-600">
                {workflow.seoMetadata.businessValue}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Preview
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors">
              Use Template
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WorkflowDirectoryPage

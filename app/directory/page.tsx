'use client'

import React, { useState, useEffect, useMemo, Suspense, useCallback, memo } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Search, Filter, X, Clock, Users, Zap, User } from 'lucide-react'
import { WorkflowQueries } from '@/lib/db/workflow-queries'
import { WorkflowState } from '@/lib/db/types'
import { WorkflowSEOMetadata } from '@/types/seo'
import { VettedBadge } from '@/components/ui/vetted-badge'
import { NodeIcon } from '@/components/ui/node-icon'
import { resolveIconName } from '@/lib/icon-aliases'
import { loadCategories, getCategoryName, getSubcategoryName, getTopLevelCategories } from '@/lib/services/category-helper.service'

interface WorkflowSearchResult {
  session_id: string;
  created_at: string;
  updated_at: string;
  is_vetted?: boolean;
  state?: WorkflowState;
  seoMetadata?: WorkflowSEOMetadata;
  relevanceScore?: number;
  user?: {
    id: string;
    email: string;
    full_name?: string | null;
    avatar_url?: string | null;
  } | null;
}

// Custom hook for debounced search
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

const WorkflowDirectoryContent = () => {
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [workflows, setWorkflows] = useState<WorkflowSearchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'relevance' | 'recent' | 'popular'>('relevance')
  const [currentPage, setCurrentPage] = useState(1)
  const [dynamicCategories, setDynamicCategories] = useState<Array<{id: string, name: string}>>([])
  const itemsPerPage = 10

  // Initialize filters from URL parameters
  useEffect(() => {
    const categoryParam = searchParams.get('category')
    const searchParam = searchParams.get('search')
    
    if (categoryParam) {
      setSelectedCategory(categoryParam)
    }
    
    if (searchParam) {
      setSearchQuery(searchParam)
    }
  }, [searchParams])

  // Load categories on component mount
  useEffect(() => {
    const initCategories = async () => {
      try {
        const response = await fetch('/api/workflows/categories')
        if (response.ok) {
          const categories = await response.json()
          setDynamicCategories(categories)
        } else {
          // Fallback to client-side loading
          await loadCategories();
          const topLevel = getTopLevelCategories();
          setDynamicCategories(topLevel);
        }
      } catch (error) {
        console.error('Failed to load categories:', error)
        // Fallback to client-side loading
        await loadCategories();
        const topLevel = getTopLevelCategories();
        setDynamicCategories(topLevel);
      }
    };
    initCategories();
  }, []);

  // Load workflows with server-side search
  useEffect(() => {
    const loadWorkflows = async () => {
      try {
        setLoading(true)
        
        // Use server-side search API
        const params = new URLSearchParams({
          q: debouncedSearchQuery,
          category: selectedCategory,
          sortBy,
          page: currentPage.toString(),
          limit: itemsPerPage.toString()
        })
        
        const response = await fetch(`/api/workflows/search?${params}`)
        if (!response.ok) {
          throw new Error('Failed to fetch workflows')
        }
        
        const data = await response.json()
        
        // Transform the data to match our interface
        const transformedWorkflows: WorkflowSearchResult[] = data.workflows.map((workflow: any) => ({
          session_id: workflow.sessionId || workflow.session_id,
          created_at: workflow.createdAt || workflow.created_at,
          updated_at: workflow.updatedAt || workflow.updated_at,
          is_vetted: workflow.isVetted || workflow.is_vetted,
          state: {
            phase: 'complete' as const,
            nodes: workflow.workflow?.nodes || workflow.state?.nodes || [],
            connections: [],
            settings: workflow.workflow?.settings || workflow.state?.settings || {},
            pendingClarifications: [],
            clarificationHistory: [],
            validations: { isValid: true }
          },
          seoMetadata: workflow.seo || workflow.seoMetadata,
          user: workflow.user
        }))
        
        setWorkflows(transformedWorkflows)
        setTotalResults(data.total)
        setTotalPages(data.totalPages)
      } catch (error) {
        console.error('Failed to load workflows:', error)
        setWorkflows([]) // Set empty array on error
      } finally {
        setLoading(false)
      }
    }

    loadWorkflows()
  }, [debouncedSearchQuery, selectedCategory, sortBy, currentPage])

  // Since filtering is now done server-side, we can use workflows directly
  const filteredWorkflows = workflows
  const currentWorkflows = workflows
  
  // Pagination info will come from the API response
  const [totalPages, setTotalPages] = useState(1)
  const [totalResults, setTotalResults] = useState(0)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedCategory, sortBy])

  // Build categories list for dropdown
  const categories = [
    { id: 'all', name: 'All Categories' },
    ...dynamicCategories
  ]

  return (
    <div className="min-h-screen bg-[rgb(236,244,240)]">
      <div className="max-w-screen-xl mx-auto px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Workflow Directory
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Discover and search through our collection of automation workflows
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 mb-6 sm:mb-8">
          {/* Search Bar */}
          <div className="relative mb-4 sm:mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5" />
            <input
              type="text"
              placeholder="Search workflows by name, nodes, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 sm:pl-10 pr-10 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="flex-1 sm:flex-none border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 flex-shrink-0">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="flex-1 sm:flex-none border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="relevance">Relevance</option>
                <option value="recent">Most Recent</option>
                <option value="popular">Most Popular</option>
              </select>
            </div>

            {/* Results Count */}
            <div className="text-sm text-gray-500 sm:ml-auto">
              {loading ? 'Loading...' : `${totalResults} workflows found`}
            </div>
          </div>
        </div>

        {/* Results - Grid layout on larger screens */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {loading ? (
            <>
              {[...Array(6)].map((_, i) => (
                <WorkflowCardSkeleton key={i} />
              ))}
            </>
          ) : filteredWorkflows.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No workflows found
              </h3>
              <p className="text-gray-500 text-sm sm:text-base px-4">
                {searchQuery 
                  ? `No workflows match "${searchQuery}". Try different keywords or browse all workflows.`
                  : 'No workflows available in this category.'
                }
              </p>
            </div>
          ) : (
            <>
              {currentWorkflows.map((workflow) => (
                <WorkflowCard key={workflow.session_id} workflow={workflow} />
              ))}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-200">
                  <div className="text-sm text-gray-500">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalResults)} of {totalResults} workflows
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Previous button */}
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    
                    {/* Page numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          // Show first page, last page, current page, and pages around current
                          return page === 1 || 
                                 page === totalPages || 
                                 Math.abs(page - currentPage) <= 1
                        })
                        .map((page, index, array) => {
                          // Add ellipsis if there's a gap
                          const prevPage = array[index - 1]
                          const showEllipsis = prevPage && page - prevPage > 1
                          
                          return (
                            <React.Fragment key={page}>
                              {showEllipsis && (
                                <span className="px-2 py-2 text-sm text-gray-400">...</span>
                              )}
                              <button
                                onClick={() => setCurrentPage(page)}
                                className={`px-3 py-2 text-sm border rounded-md transition-colors ${
                                  currentPage === page
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {page}
                              </button>
                            </React.Fragment>
                          )
                        })}
                    </div>
                    
                    {/* Next button */}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Skeleton loading component
const WorkflowCardSkeleton = () => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-pulse">
    <div className="p-4 sm:p-5">
      <div className="flex gap-2 mb-3">
        <div className="h-5 bg-gray-200 rounded-full w-20"></div>
        <div className="h-5 bg-gray-200 rounded-full w-16"></div>
      </div>
      <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="flex gap-1 mb-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="w-6 h-6 bg-gray-200 rounded"></div>
        ))}
      </div>
      <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-2/3 mb-3"></div>
      <div className="flex gap-1.5 mb-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-5 bg-gray-200 rounded-full w-12"></div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-gray-200 rounded-full"></div>
          <div className="h-3 bg-gray-200 rounded w-16"></div>
        </div>
        <div className="h-3 bg-gray-200 rounded w-12"></div>
      </div>
    </div>
  </div>
)

// Helper function to extract base node name from full type
const extractNodeBaseName = (nodeType: string): string => {
  // Handle n8n-nodes-base.httpRequest -> httpRequest
  // Handle @n8n/n8n-nodes-langchain.toolWorkflow -> toolWorkflow
  const parts = nodeType.split('.');
  return parts[parts.length - 1] || nodeType;
}

// Workflow Card Component - Memoized for performance
const WorkflowCard: React.FC<{ workflow: WorkflowSearchResult }> = memo(({ workflow }) => {
  const nodeCount = workflow.state?.nodes?.length || 0
  const mainNodes = workflow.state?.nodes?.slice(0, 8) || []
  
  // Real user data from Supabase
  const user = workflow.user ? {
    name: workflow.user.full_name || workflow.user.email,
    avatar: workflow.user.avatar_url,
    initials: (() => {
      const fullName = workflow.user.full_name;
      const email = workflow.user.email;
      
      if (fullName) {
        // If full name exists, get first letter of first two words
        const words = fullName.trim().split(/\s+/);
        if (words.length >= 2) {
          return (words[0][0] + words[1][0]).toUpperCase();
        } else {
          return words[0].slice(0, 2).toUpperCase();
        }
      } else if (email) {
        // If only email, get first 2 characters before @
        const emailPrefix = email.split('@')[0];
        return emailPrefix.slice(0, 2).toUpperCase();
      }
      
      return 'AU';
    })()
  } : {
    name: 'Anonymous User',
    avatar: null,
    initials: 'AU'
  }

  const handleCardClick = () => {
    // Navigate to workflow detail page using SEO slug if available
    if (workflow.seoMetadata?.slug) {
      window.location.href = `/w/${workflow.seoMetadata.slug}`
    } else {
      window.location.href = `/workflow/${workflow.session_id}`
    }
  }

  return (
    <div 
      className={`group relative bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden ${
        workflow.is_vetted 
          ? 'border-2 border-green-400 shadow-[0_0_20px_rgba(27,200,140,0.2)]' 
          : 'border border-gray-200 hover:border-gray-300'
      }`}
      onClick={handleCardClick}
    >
      <div className="p-4 sm:p-5">
        {/* Top Pills - Category hierarchy and Vetted */}
        <div className="flex flex-wrap gap-2 mb-3">
          {/* Category hierarchy pills - only show if new data exists */}
          {workflow.seoMetadata?.category_id && (
            <>
              {/* Main category in green gradient pill */}
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white" style={{
                background: 'linear-gradient(122deg, rgba(1, 152, 115, 1) 0%, rgba(27, 200, 140, 1) 50%, rgba(1, 147, 147, 1) 100%)'
              }}>
                {getCategoryName(workflow.seoMetadata.category_id)}
              </span>
              
              {/* Subcategory - white with green border */}
              {workflow.seoMetadata?.subcategory_id && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white text-[rgb(27,200,140)] border border-[rgb(27,200,140)]">
                  {getSubcategoryName(workflow.seoMetadata.subcategory_id)}
                </span>
              )}
            </>
          )}
          
          {/* Fallback to old category field if no new data */}
          {!workflow.seoMetadata?.category_id && workflow.seoMetadata?.category && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white" style={{
              background: 'linear-gradient(122deg, rgba(1, 152, 115, 1) 0%, rgba(27, 200, 140, 1) 50%, rgba(1, 147, 147, 1) 100%)'
            }}>
              {workflow.seoMetadata.category}
            </span>
          )}
          
          {/* Vetted badge */}
          {workflow.is_vetted && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white text-[rgb(27,200,140)] border border-[rgb(27,200,140)]">
              ✓ Vetted workflow
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-gray-900 mb-2 line-clamp-1">
          {workflow.state?.settings?.name || workflow.seoMetadata?.title || 'Untitled Workflow'}
        </h3>

        {/* Node icons */}
        <div className="flex items-center gap-1 mb-3 overflow-hidden">
          {mainNodes.map((node: any, index: number) => {
            const baseName = extractNodeBaseName(node.type);
            const iconName = resolveIconName(baseName);
            return (
              <div 
                key={index} 
                className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-gray-50 rounded"
                title={node.name || baseName}
              >
                <NodeIcon
                  name={iconName}
                  size={16}
                />
              </div>
            );
          })}
          {nodeCount > 8 && (
            <span className="text-xs text-gray-500 ml-1">
              +{nodeCount - 8}
            </span>
          )}
        </div>

        {/* Description - truncated to 2 lines */}
        {workflow.seoMetadata?.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {workflow.seoMetadata.description}
          </p>
        )}

        {/* Tags as pills */}
        <div className="flex flex-wrap gap-1.5">
          {/* Keywords as pills */}
          {workflow.seoMetadata?.keywords?.slice(0, 4).map((keyword: string, index: number) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-50 text-gray-600 border border-gray-200"
            >
              {keyword}
            </span>
          ))}
        </div>

        {/* Footer with creator info */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0">
              {user.avatar ? (
                <Image 
                  src={user.avatar} 
                  alt={user.name}
                  width={20}
                  height={20}
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-600">
                    {user.initials?.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            <span className="text-xs text-gray-500 truncate max-w-[120px]">
              {user.name}
            </span>
          </div>
          <span className="text-xs text-gray-400">
            {new Date(workflow.updated_at).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  )
})

// Add display name for debugging
WorkflowCard.displayName = 'WorkflowCard'

const WorkflowDirectoryPage = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[rgb(236,244,240)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workflow directory...</p>
        </div>
      </div>
    }>
      <WorkflowDirectoryContent />
    </Suspense>
  )
}

export default WorkflowDirectoryPage

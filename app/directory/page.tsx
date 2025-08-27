'use client'

import React, { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Search, Filter, X, Clock, Users, Zap, User } from 'lucide-react'
import { WorkflowQueries } from '@/lib/db/workflow-queries'
import { WorkflowState } from '@/lib/db/types'
import { WorkflowSEOMetadata } from '@/types/seo'
import { VettedBadge } from '@/components/ui/vetted-badge'
import { NodeIcon } from '@/components/ui/node-icon'
import { resolveIconName } from '@/lib/icon-aliases'

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

const WorkflowDirectoryContent = () => {
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [workflows, setWorkflows] = useState<WorkflowSearchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'relevance' | 'recent' | 'popular'>('relevance')
  const [currentPage, setCurrentPage] = useState(1)
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

  // Load workflows on component mount
  useEffect(() => {
    const loadWorkflows = async () => {
      try {
        setLoading(true)
        
        // Fetch real workflows from Supabase
        const workflowQueries = new WorkflowQueries()
        console.log('Fetching workflows from Supabase...')
        const publicWorkflows = await workflowQueries.listPublicWorkflows(50)
        console.log('Fetched workflows:', publicWorkflows.length, publicWorkflows)
        
        // Transform the data to match our interface
        const transformedWorkflows: WorkflowSearchResult[] = publicWorkflows.map(workflow => ({
          session_id: workflow.sessionId,
          created_at: workflow.createdAt,
          updated_at: workflow.updatedAt,
          is_vetted: workflow.isVetted,
          state: {
            phase: 'complete' as const,
            nodes: workflow.workflow?.nodes || [],
            connections: [],
            settings: workflow.workflow?.settings || {},
            pendingClarifications: [],
            clarificationHistory: [],
            validations: { isValid: true }
          },
          seoMetadata: workflow.seo,
          user: workflow.user
        }))
        
        console.log('Transformed workflows:', transformedWorkflows.length, transformedWorkflows)
        setWorkflows(transformedWorkflows)
      } catch (error) {
        console.error('Failed to load workflows:', error)
        setWorkflows([]) // Set empty array on error
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
        const nodeMatch = workflow.state?.nodes?.some((node: any) => 
          node.type?.toLowerCase().includes(query) ||
          node.name?.toLowerCase().includes(query)
        )

        // Search in keywords/description (if available)
        const keywordMatch = workflow.seoMetadata?.keywords?.some((keyword: string) =>
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
        const nodeMatches = workflow.state?.nodes?.filter((node: any) => 
          node.type?.toLowerCase().includes(query)
        ).length || 0
        score += nodeMatches * 5

        // Keyword match
        const keywordMatches = workflow.seoMetadata?.keywords?.filter((keyword: string) =>
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

  // Pagination logic
  const totalPages = Math.ceil(filteredWorkflows.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentWorkflows = filteredWorkflows.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedCategory, sortBy])

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
    'Monitoring',
    'Lead Generation'
  ]

  return (
    <div className="min-h-screen bg-[rgb(236,244,240)]">
      <div className="max-w-screen-lg  mx-auto px-4 py-4 sm:py-8">
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
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
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
              {loading ? 'Loading...' : `${filteredWorkflows.length} workflows found`}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4 sm:space-y-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500 text-sm sm:text-base">Loading workflows...</p>
            </div>
          ) : filteredWorkflows.length === 0 ? (
            <div className="text-center py-12">
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
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredWorkflows.length)} of {filteredWorkflows.length} workflows
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

// Workflow Card Component
const WorkflowCard: React.FC<{ workflow: WorkflowSearchResult }> = ({ workflow }) => {
  const [isHovered, setIsHovered] = useState(false)
  const nodeCount = workflow.state?.nodes?.length || 0
  const mainNodes = workflow.state?.nodes?.slice(0, 3) || []
  
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
      className="group relative bg-white rounded-xl shadow-sm border hover:shadow-lg hover:border-gray-300 transition-all duration-200 cursor-pointer overflow-hidden "
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* Hover overlay with full description - Desktop only */}
      {isHovered && workflow.seoMetadata?.description && (
        <div className="absolute inset-0 bg-black/80 z-10 p-4 sm:p-6 flex items-center justify-center hidden md:flex">
          <div className="text-white text-center max-w-md">
            <h4 className="font-semibold mb-3 text-base sm:text-lg">About this workflow</h4>
            <p className="text-xs sm:text-sm leading-relaxed opacity-90">
              {workflow.seoMetadata.description}
            </p>
            <div className="mt-4 text-xs opacity-75">
              Click to view details
            </div>
          </div>
        </div>
      )}

      <div className={`p-4 sm:p-6 transition-all duration-200 ${isHovered ? 'bg-gray-50' : 'bg-white'}`}>
        {/* Header with title and vetted badge */}
        <div className="flex items-start justify-between mb-3 sm:mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                {workflow.state?.settings?.name || workflow.seoMetadata?.title || 'Untitled Workflow'}
              </h3>
              {workflow.is_vetted && <VettedBadge className="flex-shrink-0" />}
            </div>
          </div>
        </div>

        {/* Creator info */}
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="flex-shrink-0">
            {user.avatar ? (
              <Image 
                src={user.avatar} 
                alt={user.name}
                width={32}
                height={32}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-xs font-medium text-blue-600">
                  {user.initials}
                </span>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
              {user.name}
            </p>
            <p className="text-xs text-gray-500">
              Updated {new Date(workflow.updated_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
            <Zap className="h-3 w-3" />
            <span>{nodeCount}</span>
          </div>
        </div>

        {/* Tags section */}
        <div className="mb-3 sm:mb-4">
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {/* Category tag */}
            {workflow.seoMetadata?.category && (
              <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {workflow.seoMetadata.category}
              </span>
            )}
            
            {/* Node type tags */}
            {mainNodes.map((node: any, index: number) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <NodeIcon
                  name={resolveIconName(node.type)}
                  size={10}
                  className="sm:w-3 sm:h-3"
                />
                <span className="truncate max-w-16 sm:max-w-20">
                  {node.name?.replace(/^@n8n\/n8n-nodes-base\./, '') || node.type?.replace(/^@n8n\/n8n-nodes-base\./, '')}
                </span>
              </span>
            ))}
            
            {nodeCount > 3 && (
              <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-500 border border-gray-200">
                +{nodeCount - 3} more
              </span>
            )}
          </div>
        </div>

        {/* Keywords tags */}
        {workflow.seoMetadata?.keywords && workflow.seoMetadata.keywords.length > 0 && (
          <div className="mb-3 sm:mb-4">
            <div className="flex flex-wrap gap-1">
              {workflow.seoMetadata.keywords.slice(0, 5).map((keyword: string, index: number) => (
                <span
                  key={index}
                  className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-xs bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  #{keyword}
                </span>
              ))}
              {workflow.seoMetadata.keywords.length > 5 && (
                <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-xs text-gray-400">
                  +{workflow.seoMetadata.keywords.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Business value footer */}
        {workflow.seoMetadata?.businessValue && (
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium text-green-600 flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                {workflow.seoMetadata.businessValue}
              </span>
              <div className="text-xs text-gray-400 group-hover:text-gray-600 transition-colors hidden sm:block">
                Click to explore →
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

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

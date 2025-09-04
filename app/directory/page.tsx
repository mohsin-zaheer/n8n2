'use client'

import React, { useState, useEffect, useMemo, Suspense, useCallback, memo } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Search, Filter, X, Clock, Users, Zap, User, ChevronRight } from 'lucide-react'
import { WorkflowQueries } from '@/lib/db/workflow-queries'
import { WorkflowState } from '@/lib/db/types'
import { WorkflowSEOMetadata } from '@/types/seo'
import { VettedBadge } from '@/components/ui/vetted-badge'
import { loadCategories, getCategoryName, getSubcategoryName, getCategoryHierarchy, categoryIcons } from '@/lib/services/category-helper.service'
import { CategoryWithSubcategories } from '@/types/categories'

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
  const [onlyVetted, setOnlyVetted] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [dynamicCategories, setDynamicCategories] = useState<CategoryWithSubcategories[]>([])
  const itemsPerPage = 12

  // Initialize filters from URL parameters
  useEffect(() => {
    const categoryParam = searchParams.get('category')
    const searchParam = searchParams.get('search')
    const vettedParam = searchParams.get('vetted')
    
    if (categoryParam) {
      setSelectedCategory(categoryParam)
    }
    
    if (searchParam) {
      setSearchQuery(searchParam)
    }

    if (vettedParam === 'true') {
      setOnlyVetted(true)
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
          const hierarchy = getCategoryHierarchy();
          setDynamicCategories(hierarchy);
        }
      } catch (error) {
        console.error('Failed to load categories:', error)
        // Fallback to client-side loading
        await loadCategories();
        const hierarchy = getCategoryHierarchy();
        setDynamicCategories(hierarchy);
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
          vetted: onlyVetted.toString(),
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
          is_vetted: Boolean(workflow.isVetted || workflow.is_vetted),
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
  }, [debouncedSearchQuery, selectedCategory, onlyVetted, currentPage])

  // Since filtering is now done server-side, we can use workflows directly
  const filteredWorkflows = workflows
  const currentWorkflows = workflows
  
  // Pagination info will come from the API response
  const [totalPages, setTotalPages] = useState(1)
  const [totalResults, setTotalResults] = useState(0)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedCategory, onlyVetted])

  // Build categories list for dropdown - now with hierarchy
  const renderCategoryOptions = () => {
    const options: JSX.Element[] = [];
    
    // Add "All Categories" option
    options.push(
      <option key="all" value="all" className="font-medium">
        All Categories
      </option>
    );
    
    // Add main categories and their subcategories
    dynamicCategories.forEach(mainCategory => {
      // Add main category
      options.push(
        <option key={mainCategory.id} value={mainCategory.id} className="font-semibold">
          {mainCategory.name}
        </option>
      );
      
      // Add subcategories (indented)
      if (mainCategory.subcategories && mainCategory.subcategories.length > 0) {
        mainCategory.subcategories.forEach(subCategory => {
          options.push(
            <option key={subCategory.id} value={subCategory.id} className="pl-4">
               {subCategory.name}
            </option>
          );
        });
      }
    });
    
    return options;
  }

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
            {/* Category Filter with Icons */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="flex-1 sm:flex-none border border-gray-300 rounded-md px-3 py-1.5 pr-8 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                  style={{ minWidth: '200px' }}
                >
                  {renderCategoryOptions()}
                </select>
                <ChevronRight className="absolute right-2 top-1/2 transform -translate-y-1/2 rotate-90 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
              {/* Show selected category icon if it's a main category or subcategory */}
              {selectedCategory !== 'all' && (() => {
                // First check if it's a main category
                const mainCat = dynamicCategories.find(cat => cat.id === selectedCategory);
                if (mainCat && categoryIcons[mainCat.id]) {
                  const Icon = categoryIcons[mainCat.id];
                  
                  return (
                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-gradient-to-r from-[rgb(1,152,115)] to-[rgb(27,200,140)] text-white">
                      <Icon className="h-4 w-4" />
                    </div>
                  );
                }
            
                // Check if it's a subcategory and show parent category icon
                for (const category of dynamicCategories) {
                  const subcat = category.subcategories?.find(sub => sub.id === selectedCategory);
                  if (subcat && categoryIcons[category.id]) {
                    const Icon = categoryIcons[category.id];
                    return (
                      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-gradient-to-r from-[rgb(1,152,115)] to-[rgb(27,200,140)] text-white">
                        <Icon className="h-4 w-4" />
                      </div>
                    );
                  }
                }
            
                return null;
              })()}
            </div>

            {/* Vetted Filter Checkbox */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="vetted-filter"
                checked={onlyVetted}
                onChange={(e) => setOnlyVetted(e.target.checked)}
                className="h-4 w-4 text-[rgb(27,200,140)] focus:ring-[rgb(27,200,140)] border-gray-300 rounded"
              />
              <label htmlFor="vetted-filter" className="text-sm text-gray-700 cursor-pointer select-none">
                Only Vetted Workflows
              </label>
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
            </>
          )}
        </div>

        {/* Pagination - moved outside the grid */}
        {!loading && filteredWorkflows.length > 0 && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-200 mt-6">
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

// Workflow Card Component - Memoized for performance
const WorkflowCard: React.FC<{ workflow: WorkflowSearchResult }> = memo(({ workflow }) => {
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
        {/* Top Pills - Vetted first, then Category hierarchy */}
        <div className="flex flex-wrap gap-2 mb-3">
          
          {/* Vetted badge - first position with green gradient */}
          {workflow.is_vetted && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-white" style={{
              background: 'linear-gradient(122deg, rgba(1, 152, 115, 1) 0%, rgba(27, 200, 140, 1) 50%, rgba(1, 147, 147, 1) 100%)'
            }}>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Vetted workflow
            </span>
          )}
          
          
          {/* Category hierarchy pills - only show if new data exists */}
          {workflow.seoMetadata?.category_id && (() => {
            const categoryId = workflow.seoMetadata.category_id;
            const categoryName = getCategoryName(categoryId);
            const Icon = categoryIcons[categoryId];
            
            // Create fallback category names if getCategoryName returns empty
            const fallbackCategoryNames: { [key: string]: string } = {
              'cat_1': 'Marketing',
              'cat_2': 'Content',
              'cat_3': 'Lead Generation',
              'cat_4': 'Sales',
              'cat_5': 'SEO',
              'cat_6': 'Customer Success'
            };
            
            const displayCategoryName = categoryName || fallbackCategoryNames[categoryId] || categoryId;
            
            return (
              <>
                {/* Main category in black pill with white text and icon */}
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-black text-white">
                  {Icon && <Icon className="h-3 w-3" />}
                  {displayCategoryName}
                </span>
                
                {/* Subcategory pill */}
                {workflow.seoMetadata?.subcategory_id && (() => {
                  const subcategoryName = getSubcategoryName(workflow.seoMetadata.subcategory_id);
                  
                  // Create better fallback names based on known subcategory IDs
                  let displayName = subcategoryName;
                  if (!displayName) {
                    const subcategoryMap: { [key: string]: string } = {
                      'cat_1_sub_1': 'Paid Search',
                      'cat_1_sub_2': 'Social Media Ads',
                      'cat_2_sub_1': 'Blog Content',
                      'cat_2_sub_2': 'Video Content',
                      'cat_2_sub_3': 'SEO Content',
                      'cat_3_sub_1': 'Lead Magnets',
                      'cat_3_sub_2': 'Landing Pages',
                      'cat_4_sub_1': 'Lead Scoring',
                      'cat_4_sub_2': 'Sales Outreach',
                      'cat_5_sub_1': 'SEO Optimization',
                      'cat_5_sub_2': 'Content Marketing',
                      'cat_6_sub_1': 'Customer Support',
                      'cat_6_sub_2': 'Retention Campaigns'
                    };
                    displayName = subcategoryMap[workflow.seoMetadata.subcategory_id] || workflow.seoMetadata.subcategory_id;
                  }
                  
                  return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <ChevronRight className="h-3 w-3" />
                      {displayName}
                    </span>
                  );
                })()}
              </>
            );
          })()}
          
          {/* Fallback to old category field if no new data */}
          {!workflow.seoMetadata?.category_id && workflow.seoMetadata?.category && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-black text-white">
              <Zap className="h-3 w-3" />
              {workflow.seoMetadata.category}
            </span>
          )}
          
          {/* Default category if no category data at all */}
          {!workflow.seoMetadata?.category_id && !workflow.seoMetadata?.category && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-black text-white">
              <Zap className="h-3 w-3" />
              Automation
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-gray-900 mb-2 line-clamp-1">
          {workflow.state?.settings?.name || workflow.seoMetadata?.title || 'Untitled Workflow'}
        </h3>

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

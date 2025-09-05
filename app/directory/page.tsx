'use client'

import React, { useState, useEffect, useMemo, Suspense, useCallback, memo, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Search, Filter, X, Clock, Users, Zap, User, ChevronRight, ChevronDown, Check } from 'lucide-react'
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
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [workflows, setWorkflows] = useState<WorkflowSearchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    return searchParams.get('category') || 'all'
  })
  const [onlyVetted, setOnlyVetted] = useState(() => {
    return searchParams.get('vetted') === 'true'
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [dynamicCategories, setDynamicCategories] = useState<CategoryWithSubcategories[]>([])
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)
  const [categorySearchQuery, setCategorySearchQuery] = useState('')
  const categoryDropdownRef = useRef<HTMLDivElement>(null)
  const itemsPerPage = 12

  // Initialize filters from URL parameters - run immediately on mount
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
  }, [searchParams]) // Add searchParams back to satisfy ESLint

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

  // Close category dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setCategoryDropdownOpen(false)
        setCategorySearchQuery('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Get selected category display info
  const getSelectedCategoryInfo = () => {
    if (selectedCategory === 'all') {
      return { name: 'All Categories', icon: null, isSubcategory: false }
    }

    // Check if it's a main category
    const mainCat = dynamicCategories.find(cat => cat.id === selectedCategory)
    if (mainCat) {
      const Icon = categoryIcons[mainCat.id]
      return { name: mainCat.name, icon: Icon, isSubcategory: false }
    }

    // Check if it's a subcategory
    for (const category of dynamicCategories) {
      const subcat = category.subcategories?.find(sub => sub.id === selectedCategory)
      if (subcat) {
        const Icon = categoryIcons[category.id]
        return { 
          name: subcat.name, 
          icon: Icon, 
          isSubcategory: true,
          parentName: category.name 
        }
      }
    }

    return { name: selectedCategory, icon: null, isSubcategory: false }
  }

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!categorySearchQuery.trim()) return dynamicCategories

    const query = categorySearchQuery.toLowerCase()
    return dynamicCategories.map(category => {
      const categoryMatches = category.name.toLowerCase().includes(query)
      const matchingSubcategories = category.subcategories?.filter(sub => 
        sub.name.toLowerCase().includes(query)
      ) || []

      if (categoryMatches || matchingSubcategories.length > 0) {
        return {
          ...category,
          subcategories: categoryMatches ? category.subcategories : matchingSubcategories
        }
      }
      return null
    }).filter(Boolean) as CategoryWithSubcategories[]
  }, [dynamicCategories, categorySearchQuery])

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId)
    setCategoryDropdownOpen(false)
    setCategorySearchQuery('')
  }

  const handleVettedChange = (checked: boolean) => {
    setOnlyVetted(checked)
    
    // Update URL
    const params = new URLSearchParams(searchParams.toString())
    if (checked) {
      params.set('vetted', 'true')
    } else {
      params.delete('vetted')
    }
    
    const newUrl = params.toString() ? `/directory?${params.toString()}` : '/directory'
    router.push(newUrl, { scroll: false })
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
            {/* Modern Category Filter Dropdown */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <div className="relative" ref={categoryDropdownRef}>
                {/* Dropdown Trigger */}
                <button
                  onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-colors"
                  style={{ minWidth: '200px' }}
                >
                  {(() => {
                    const categoryInfo = getSelectedCategoryInfo()
                    return (
                      <>
                        {categoryInfo.icon && (
                          <div className="flex items-center justify-center w-5 h-5 rounded bg-gradient-to-r from-[rgb(1,152,115)] to-[rgb(27,200,140)] text-white">
                            <categoryInfo.icon className="h-3 w-3" />
                          </div>
                        )}
                        <span className="flex-1 text-left truncate">
                          {categoryInfo.isSubcategory ? (
                            <span>
                              <span className="text-gray-500">{categoryInfo.parentName}</span>
                              <ChevronRight className="inline h-3 w-3 mx-1" />
                              <span>{categoryInfo.name}</span>
                            </span>
                          ) : (
                            categoryInfo.name
                          )}
                        </span>
                        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${categoryDropdownOpen ? 'rotate-180' : ''}`} />
                      </>
                    )
                  })()}
                </button>

                {/* Dropdown Menu */}
                {categoryDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-80 overflow-hidden">
                    {/* Search Input */}
                    <div className="p-2 border-b border-gray-100">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
                        <input
                          type="text"
                          placeholder="Search categories..."
                          value={categorySearchQuery}
                          onChange={(e) => setCategorySearchQuery(e.target.value)}
                          className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Categories List */}
                    <div className="max-h-64 overflow-y-auto">
                      {/* All Categories Option */}
                      <button
                        onClick={() => handleCategorySelect('all')}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 text-sm ${
                          selectedCategory === 'all' ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                        }`}
                      >
                        {selectedCategory === 'all' && <Check className="h-3 w-3 text-blue-600" />}
                        <span className={selectedCategory === 'all' ? 'font-medium' : ''}>All Categories</span>
                      </button>

                      {/* Dynamic Categories */}
                      {filteredCategories.map((category) => (
                        <div key={category.id}>
                          {/* Main Category */}
                          <button
                            onClick={() => handleCategorySelect(category.id)}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 text-sm ${
                              selectedCategory === category.id ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                            }`}
                          >
                            {selectedCategory === category.id && <Check className="h-3 w-3 text-blue-600" />}
                            {categoryIcons[category.id] && (
                              <div className="flex items-center justify-center w-4 h-4 rounded bg-gradient-to-r from-[rgb(1,152,115)] to-[rgb(27,200,140)] text-white">
                                {React.createElement(categoryIcons[category.id], { className: "h-2.5 w-2.5" })}
                              </div>
                            )}
                            <span className={`font-medium ${selectedCategory === category.id ? 'text-blue-700' : 'text-gray-900'}`}>
                              {category.name}
                            </span>
                          </button>

                          {/* Subcategories */}
                          {category.subcategories && category.subcategories.length > 0 && (
                            <div className="bg-gray-25">
                              {category.subcategories.map((subcategory) => (
                                <button
                                  key={subcategory.id}
                                  onClick={() => handleCategorySelect(subcategory.id)}
                                  className={`w-full flex items-center gap-2 pl-8 pr-3 py-1.5 text-left hover:bg-gray-50 text-xs ${
                                    selectedCategory === subcategory.id ? 'bg-blue-50 text-blue-700' : 'text-gray-600'
                                  }`}
                                >
                                  {selectedCategory === subcategory.id && <Check className="h-3 w-3 text-blue-600" />}
                                  <ChevronRight className="h-3 w-3 text-gray-400" />
                                  <span className={selectedCategory === subcategory.id ? 'font-medium text-blue-700' : ''}>
                                    {subcategory.name}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}

                     {categorySearchQuery && filteredCategories.length === 0 && (
                      <div className="px-3 py-4 text-center text-gray-500 text-sm">
                        No categories found for &quot;{categorySearchQuery}&quot;
                      </div>
                    )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Vetted Filter Checkbox */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="vetted-filter"
                checked={onlyVetted}
                onChange={(e) => handleVettedChange(e.target.checked)}
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
                    ? <>No workflows match &quot;{searchQuery}&quot;. Try different keywords or browse all workflows.</>
                    : 'No workflows available in this category.'
                  }
              </p>
            </div>
          ) : (
            <>
              {currentWorkflows.map((workflow) => (
                <WorkflowCard key={workflow.session_id} workflow={workflow} dynamicCategories={dynamicCategories} />
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
                              ? 'text-white'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                          style={currentPage === page ? { 
                            background: 'linear-gradient(122deg, rgba(1, 152, 115, 1) 0%, rgba(27, 200, 140, 1) 50%, rgba(1, 147, 147, 1) 100%)' 
                          } : {}}
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
const WorkflowCard: React.FC<{ workflow: WorkflowSearchResult; dynamicCategories: CategoryWithSubcategories[] }> = memo(({ workflow, dynamicCategories }) => {
  // Console log SEO metadata for debugging
  
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
              <Image src="/assets/check.svg" alt='checkmark' width={20} height={20} style={{marginRight: '-5px', marginTop: '-3px'}}/>
              Vetted workflow
            </span>
          )}
          
          {/* Category hierarchy pills - show new format if category_id exists */}
          {workflow.seoMetadata?.category_id && (() => {
            const categoryId = workflow.seoMetadata.category_id;
            const Icon = categoryIcons[categoryId];
            
            // Find category name directly from dynamicCategories
            let categoryName = getCategoryName(categoryId);
            if (!categoryName && dynamicCategories.length > 0) {
              const foundCategory = dynamicCategories.find(cat => cat.id === categoryId);
              categoryName = foundCategory?.name || '';
            }
            
            return (
              <>
                {/* Main category in black pill with white text and icon */}
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-black text-white">
                  {Icon && <Icon className="h-3 w-3" />}
                  {categoryName || categoryId}
                </span>
                
                {/* Subcategory - white with black border */}
                {workflow.seoMetadata?.subcategory_id && (() => {
                  const subcategoryId = workflow.seoMetadata.subcategory_id;
                  
                  // Find subcategory name directly from dynamicCategories
                  let subcategoryName = getSubcategoryName(subcategoryId);
                  if (!subcategoryName && dynamicCategories.length > 0) {
                    for (const category of dynamicCategories) {
                      if (category.subcategories) {
                        const foundSubcat = category.subcategories.find(sub => sub.id === subcategoryId);
                        if (foundSubcat) {
                          subcategoryName = foundSubcat.name;
                          break;
                        }
                      }
                    }
                  }
                  
                  return subcategoryName ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white text-black border-2 border-gray-400">
                      <ChevronRight className="h-3 w-3" />
                      {subcategoryName}
                    </span>
                  ) : null;
                })()}
              </>
            );
          })()}
          
          {/* Fallback to old category field if no category_id */}
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

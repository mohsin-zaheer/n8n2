'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Search, Filter, X, Clock, Users, Zap, User } from 'lucide-react'
import { WorkflowQueries } from '@/lib/db/workflow-queries'
import { WorkflowState } from '@/lib/db/types'
import { WorkflowSEOMetadata } from '@/types/seo'
import { VettedBadge } from '@/components/ui/vetted-badge'
import { NodeIcon } from '@/components/ui/node-icon'
import { resolveIconName } from '@/lib/icon-aliases'

interface WorkflowSearchResult {
  session_id: string;
  created_by?: string;
  updated_at: string;
  is_vetted?: boolean;
  state?: WorkflowState;
  seoMetadata?: WorkflowSEOMetadata;
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
        
        // For now, let's add some mock data to test the UI
        // In production, this would fetch from the database
        const mockWorkflows: WorkflowSearchResult[] = [
          {
            session_id: 'wf_001',
            created_by: 'John Doe',
            updated_at: new Date().toISOString(),
            is_vetted: true,
            state: {
              phase: 'complete',
              nodes: [
                { id: '1', name: 'Gmail Trigger', type: 'gmail', purpose: 'Monitor emails', position: [0, 0], parameters: {}, isSelected: true },
                { id: '2', name: 'Slack Message', type: 'slack', purpose: 'Send notifications', position: [200, 0], parameters: {}, isSelected: true },
                { id: '3', name: 'Google Sheets', type: 'googleSheets', purpose: 'Log data', position: [400, 0], parameters: {}, isSelected: true }
              ],
              connections: [],
              settings: { name: 'Email to Slack Notifications' },
              pendingClarifications: [],
              clarificationHistory: [],
              validations: { isValid: true }
            },
            seoMetadata: {
              slug: 'email-slack-notifications',
              title: 'Email to Slack Notifications Workflow',
              description: 'Automatically forward important emails to Slack channels for team visibility',
              keywords: ['email', 'slack', 'notifications', 'gmail', 'automation'],
              businessValue: 'Team Communication',
              category: 'Communication',
              integrations: ['Gmail', 'Slack'],
              generatedAt: new Date().toISOString()
            }
          },
          {
            session_id: 'wf_002',
            created_by: 'Jane Smith',
            updated_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            is_vetted: false,
            state: {
              phase: 'complete',
              nodes: [
                { id: '1', name: 'LinkedIn Scraper', type: 'linkedin', purpose: 'Find leads', position: [0, 0], parameters: {}, isSelected: true },
                { id: '2', name: 'OpenAI GPT', type: 'openAi', purpose: 'Generate messages', position: [200, 0], parameters: {}, isSelected: true },
                { id: '3', name: 'Gmail Send', type: 'gmail', purpose: 'Send emails', position: [400, 0], parameters: {}, isSelected: true },
                { id: '4', name: 'Google Sheets', type: 'googleSheets', purpose: 'Track responses', position: [600, 0], parameters: {}, isSelected: true }
              ],
              connections: [],
              settings: { name: 'LinkedIn Lead Generation' },
              pendingClarifications: [],
              clarificationHistory: [],
              validations: { isValid: true }
            },
            seoMetadata: {
              slug: 'linkedin-lead-generation',
              title: 'LinkedIn Lead Generation Workflow',
              description: 'Automatically find LinkedIn prospects and send personalized outreach emails',
              keywords: ['linkedin', 'leadgen', 'sales', 'outreach', 'automation', 'prospecting'],
              businessValue: 'Sales Growth',
              category: 'Sales',
              integrations: ['LinkedIn', 'OpenAI', 'Gmail', 'Google Sheets'],
              generatedAt: new Date().toISOString()
            }
          },
          {
            session_id: 'wf_003',
            created_by: 'Mike Johnson',
            updated_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
            is_vetted: true,
            state: {
              phase: 'complete',
              nodes: [
                { id: '1', name: 'Webhook Trigger', type: 'webhook', purpose: 'Receive invoice data', position: [0, 0], parameters: {}, isSelected: true },
                { id: '2', name: 'PDF Generator', type: 'pdf', purpose: 'Create invoice', position: [200, 0], parameters: {}, isSelected: true },
                { id: '3', name: 'Gmail Send', type: 'gmail', purpose: 'Email invoice', position: [400, 0], parameters: {}, isSelected: true },
                { id: '4', name: 'QuickBooks', type: 'quickbooks', purpose: 'Record transaction', position: [600, 0], parameters: {}, isSelected: true }
              ],
              connections: [],
              settings: { name: 'Automated Invoice Processing' },
              pendingClarifications: [],
              clarificationHistory: [],
              validations: { isValid: true }
            },
            seoMetadata: {
              slug: 'automated-invoice-processing',
              title: 'Automated Invoice Processing Workflow',
              description: 'Generate, send, and track invoices automatically with QuickBooks integration',
              keywords: ['invoice', 'billing', 'quickbooks', 'automation', 'accounting'],
              businessValue: 'Process Efficiency',
              category: 'Automation',
              integrations: ['Webhook', 'PDF', 'Gmail', 'QuickBooks'],
              generatedAt: new Date().toISOString()
            }
          },
          {
            session_id: 'wf_004',
            created_by: 'Sarah Wilson',
            updated_at: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
            is_vetted: true,
            state: {
              phase: 'complete',
              nodes: [
                { id: '1', name: 'Google Analytics', type: 'googleAnalytics', purpose: 'Fetch metrics', position: [0, 0], parameters: {}, isSelected: true },
                { id: '2', name: 'Data Transform', type: 'transform', purpose: 'Process data', position: [200, 0], parameters: {}, isSelected: true },
                { id: '3', name: 'Notion Database', type: 'notion', purpose: 'Store reports', position: [400, 0], parameters: {}, isSelected: true },
                { id: '4', name: 'Slack Notification', type: 'slack', purpose: 'Alert team', position: [600, 0], parameters: {}, isSelected: true }
              ],
              connections: [],
              settings: { name: 'Weekly Analytics Report' },
              pendingClarifications: [],
              clarificationHistory: [],
              validations: { isValid: true }
            },
            seoMetadata: {
              slug: 'weekly-analytics-report',
              title: 'Weekly Analytics Report Workflow',
              description: 'Automatically generate and distribute weekly analytics reports to your team',
              keywords: ['analytics', 'reporting', 'google analytics', 'notion', 'automation'],
              businessValue: 'Data Insights',
              category: 'Analytics',
              integrations: ['Google Analytics', 'Notion', 'Slack'],
              generatedAt: new Date().toISOString()
            }
          }
        ]
        
        setWorkflows(mockWorkflows)
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
  const [isHovered, setIsHovered] = useState(false)
  const nodeCount = workflow.state?.nodes?.length || 0
  const mainNodes = workflow.state?.nodes?.slice(0, 3) || []
  
  // Mock user data - in real app this would come from workflow.user or similar
  const mockUser = {
    name: workflow.created_by || 'Anonymous User',
    avatar: null, // No avatar URL for now
    initials: (workflow.created_by || 'AU').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const handleCardClick = () => {
    // Navigate to workflow detail page
    window.location.href = `/workflow/${workflow.session_id}`
  }

  return (
    <div 
      className="group relative bg-white rounded-xl shadow-sm border hover:shadow-lg hover:border-gray-300 transition-all duration-200 cursor-pointer overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* Hover overlay with full description - Desktop only */}
      {isHovered && workflow.seoMetadata?.description && (
        <div className="absolute inset-0 bg-black/80 z-10 p-6 flex items-center justify-center hidden md:flex">
          <div className="text-white text-center max-w-md">
            <h4 className="font-semibold mb-3 text-lg">About this workflow</h4>
            <p className="text-sm leading-relaxed opacity-90">
              {workflow.seoMetadata.description}
            </p>
            <div className="mt-4 text-xs opacity-75">
              Click to view details
            </div>
          </div>
        </div>
      )}

      <div className={`p-6 transition-all duration-200 ${isHovered ? 'bg-gray-50' : 'bg-white'}`}>
        {/* Header with title and vetted badge */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                {workflow.state?.settings?.name || 'Untitled Workflow'}
              </h3>
              {workflow.is_vetted && <VettedBadge className="flex-shrink-0" />}
            </div>
          </div>
        </div>

        {/* Creator info */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0">
            {mockUser.avatar ? (
              <img 
                src={mockUser.avatar} 
                alt={mockUser.name}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-xs font-medium text-blue-600">
                  {mockUser.initials}
                </span>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 truncate">
              {mockUser.name}
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
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {/* Category tag */}
            {workflow.seoMetadata?.category && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {workflow.seoMetadata.category}
              </span>
            )}
            
            {/* Node type tags */}
            {mainNodes.map((node: any, index: number) => (
              <span
                key={index}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <NodeIcon
                  name={resolveIconName(node.type)}
                  size={12}
                />
                <span className="truncate max-w-20">
                  {node.name?.replace(/^@n8n\/n8n-nodes-base\./, '') || node.type?.replace(/^@n8n\/n8n-nodes-base\./, '')}
                </span>
              </span>
            ))}
            
            {nodeCount > 3 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-500 border border-gray-200">
                +{nodeCount - 3} more
              </span>
            )}
          </div>
        </div>

        {/* Keywords tags */}
        {workflow.seoMetadata?.keywords && workflow.seoMetadata.keywords.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {workflow.seoMetadata.keywords.slice(0, 5).map((keyword: string, index: number) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  #{keyword}
                </span>
              ))}
              {workflow.seoMetadata.keywords.length > 5 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs text-gray-400">
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
              <span className="text-sm font-medium text-green-600 flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                {workflow.seoMetadata.businessValue}
              </span>
              <div className="text-xs text-gray-400 group-hover:text-gray-600 transition-colors">
                Click to explore →
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default WorkflowDirectoryPage

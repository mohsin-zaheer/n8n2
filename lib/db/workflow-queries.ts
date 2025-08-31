// lib/db/workflow-queries.ts

import { createClient } from "@supabase/supabase-js";
import { WorkflowBySlugResponse } from "@/types/seo";

/**
 * Database queries for workflow operations
 */
export class WorkflowQueries {
  private supabase;

  constructor() {
    // Use environment variables directly for client-side usage
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing required Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseAnonKey);
  }

  /**
   * Find a workflow by its SEO slug
   * Searches the state.seo.slug field in JSONB
   * Option B: Selective fields for optimal performance
   */
  async findBySlug(slug: string): Promise<WorkflowBySlugResponse | null> {
    try {
      // Fetch workflow data with user information
      type Row = {
        session_id: string;
        created_at: string;
        updated_at: string;
        state: any;
        is_vetted?: boolean;
        user_id?: string;
        users?: {
          id: string;
          email: string;
          raw_user_meta_data?: {
            full_name?: string;
            avatar_url?: string;
            name?: string;
            picture?: string;
          };
        };
      };
      
      const { data, error } = await this.supabase
        .from("workflow_sessions")
        .select(`
          session_id, 
          created_at, 
          updated_at, 
          state, 
          is_vetted,
          user_id
        `)
        .eq("state->seo->>slug", slug)
        .single<Row>();

      if (error || !data) {
        console.error("Workflow not found by slug:", slug, error);
        return null;
      }

      // Parse the JSONB fields from full state
      const state = (data.state || {}) as any;
      const seo = state.seo as any;
      const nodes = state.workflow?.nodes as any[] | undefined;
      const settings = state.workflow?.settings as any;
      const userPrompt = state.userPrompt as string;
      const configAnalysis = state.configAnalysis as any;

      if (!seo) {
        console.error("Workflow found but no SEO metadata:", slug);
        return null;
      }

      // Fetch user data if user_id exists
      let user = null;
      if (data.user_id) {
        try {
          // Check if we're in a server environment
          if (typeof window === 'undefined') {
            // Server-side: use service client directly
            const { createServiceClient } = await import('@/lib/supabase');
            const serviceSupabase = createServiceClient();
            const { data: userData, error: userError } = await serviceSupabase.auth.admin.getUserById(data.user_id);
            
            if (!userError && userData.user) {
              const metaData = userData.user.user_metadata || {};
              user = {
                id: userData.user.id,
                email: userData.user.email,
                full_name: metaData.full_name || metaData.name || null,
                avatar_url: metaData.avatar_url || metaData.picture || null,
              };
            }
          } else {
            // Client-side: use API endpoint
            const response = await fetch(`/api/users/${data.user_id}`);
            if (response.ok) {
              user = await response.json();
            }
          }
        } catch (userFetchError) {
          console.error("Error fetching user data:", userFetchError);
          // Continue without user data rather than failing the whole request
        }
      }

      return {
        sessionId: data.session_id,
        workflow: {
          nodes: nodes || [],
          settings: settings || {},
        },
        seo: seo,
        configAnalysis: configAnalysis,
        userPrompt: userPrompt || "",
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        isVetted: data.is_vetted || false,
        user: user,
      };
    } catch (error) {
      console.error("Error finding workflow by slug:", error);
      return null;
    }
  }

  /**
   * Find a workflow by session ID
   */
  async findBySessionId(
    sessionId: string
  ): Promise<WorkflowBySlugResponse | null> {
    try {
      type Row = {
        session_id: string;
        created_at: string;
        updated_at: string;
        state: any;
      };
      const { data, error } = await this.supabase
        .from("workflow_sessions")
        .select("*")
        .eq("session_id", sessionId)
        .single<Row>();

      if (error || !data) {
        console.error("Workflow not found by session ID:", sessionId, error);
        return null;
      }

      const state = data.state as any;

      // Return even if no SEO metadata
      return {
        sessionId: data.session_id,
        workflow: state.workflow,
        seo: state.seo || null,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      console.error("Error finding workflow by session ID:", error);
      return null;
    }
  }

  /**
   * List recent workflows with SEO metadata
   * Useful for directory page and sitemap generation
   */
  async listPublicWorkflows(
    limit: number = 100
  ): Promise<WorkflowBySlugResponse[]> {
    try {
      console.log('Querying workflow_sessions table...');
      
      // Get all workflows (remove restrictive filters)
      const { data, error } = await this.supabase
        .from("workflow_sessions")
        .select(`
          session_id,
          created_at,
          updated_at,
          state,
          is_vetted,
          user_id,
          user_prompt,
          is_active,
          archived
        `)
        .not("state", "is", null)
        .order("created_at", { ascending: false })
        .limit(limit);

      console.log('Workflows query result:', { data, error, count: data?.length });

      if (error) {
        console.error("Error listing public workflows:", error);
        return [];
      }

      if (!data || data.length === 0) {
        console.log('No workflows found in database');
        return [];
      }

      console.log('Sample workflow data:', data[0]);

      const workflows = await Promise.all(
        data
          .map(async (row) => {
            const state = row.state as any;
            console.log('Processing workflow:', row.session_id, {
              stateKeys: Object.keys(state || {}),
              isActive: row.is_active,
              archived: row.archived,
              hasUserPrompt: !!row.user_prompt,
              stateType: typeof state
            });
            
            // Accept any workflow that has state data
            if (!state) {
              console.log('Skipping workflow - no state:', row.session_id);
              return null;
            }

            // Skip archived workflows if explicitly archived
            if (row.archived === true) {
              console.log('Skipping workflow - archived:', row.session_id);
              return null;
            }

            // Fetch user data if user_id exists
            let user = null;
            if (row.user_id) {
              try {
                // Check if we're in a server environment
                if (typeof window === 'undefined') {
                  // Server-side: use service client directly
                  const { createServiceClient } = await import('@/lib/supabase');
                  const serviceSupabase = createServiceClient();
                  const { data: userData, error: userError } = await serviceSupabase.auth.admin.getUserById(row.user_id);
                  
                  if (!userError && userData.user) {
                    const metaData = userData.user.user_metadata || {};
                    user = {
                      id: userData.user.id,
                      email: userData.user.email,
                      full_name: metaData.full_name || metaData.name || null,
                      avatar_url: metaData.avatar_url || metaData.picture || null,
                    };
                  }
                } else {
                  // Client-side: use API endpoint
                  const response = await fetch(`/api/users/${row.user_id}`);
                  if (response.ok) {
                    user = await response.json();
                  }
                }
              } catch (userFetchError) {
                console.error("Error fetching user data for workflow:", row.session_id, userFetchError);
                // Continue without user data
              }
            }

            // Extract workflow name from various possible locations
            const workflowName = 
              state.seo?.title ||
              state.workflow?.settings?.name || 
              state.settings?.name || 
              (row.user_prompt && row.user_prompt.length > 50 ? row.user_prompt.slice(0, 50) + '...' : row.user_prompt) ||
              'Untitled Workflow';

            const workflow = {
              sessionId: row.session_id,
              workflow: {
                nodes: state.workflow?.nodes || state.nodes || [],
                settings: state.workflow?.settings || state.settings || { name: workflowName },
              },
              seo: state.seo || {
                slug: row.session_id,
                title: workflowName,
                description: row.user_prompt || state.userPrompt || 'Automated workflow',
                keywords: [],
                businessValue: 'Automation',
                category: 'Automation' as any,
                integrations: [],
                generatedAt: row.created_at
              },
              configAnalysis: state.configAnalysis,
              userPrompt: row.user_prompt || state.userPrompt || "",
              createdAt: row.created_at,
              updatedAt: row.updated_at,
              isVetted: row.is_vetted || false,
              user: user,
            };
            
            console.log('Created workflow object for:', row.session_id, 'title:', workflowName);
            return workflow;
          })
      );

      const filteredWorkflows = workflows.filter(Boolean) as WorkflowBySlugResponse[];

      console.log('Final workflows array:', filteredWorkflows.length, 'workflows');
      return filteredWorkflows;
    } catch (error) {
      console.error("Error listing public workflows:", error);
      return [];
    }
  }

  /**
   * Server-side search with filtering, sorting, and pagination
   */
  async searchWorkflows(options: {
    query?: string;
    category?: string;
    sortBy?: 'relevance' | 'recent' | 'popular';
    limit?: number;
    offset?: number;
  }): Promise<{ workflows: WorkflowBySlugResponse[]; total: number }> {
    try {
      const { query, category, sortBy = 'recent', limit = 10, offset = 0 } = options;

      // Build the base query
      let supabaseQuery = this.supabase
        .from("workflow_sessions")
        .select(`
          session_id,
          created_at,
          updated_at,
          state,
          is_vetted,
          user_id,
          user_prompt,
          is_active,
          archived
        `, { count: 'exact' })
        .not("state", "is", null)
        .neq("archived", true);

      // Apply text search if query provided
      if (query && query.trim()) {
        // Search in multiple fields using OR conditions
        supabaseQuery = supabaseQuery.or(`
          state->seo->>title.ilike.%${query}%,
          state->seo->>description.ilike.%${query}%,
          state->workflow->settings->>name.ilike.%${query}%,
          user_prompt.ilike.%${query}%
        `);
      }

      // Apply category filter
      if (category && category !== 'all') {
        supabaseQuery = supabaseQuery.or(`
          state->seo->>category_id.eq.${category},
          state->seo->>category.eq.${category}
        `);
      }

      // Apply sorting
      switch (sortBy) {
        case 'recent':
          supabaseQuery = supabaseQuery.order('updated_at', { ascending: false });
          break;
        case 'popular':
          // For now, use vetted status as popularity indicator
          supabaseQuery = supabaseQuery.order('is_vetted', { ascending: false })
                                      .order('updated_at', { ascending: false });
          break;
        case 'relevance':
        default:
          // For relevance, we'll sort by updated_at for now
          // In a real implementation, you'd use full-text search ranking
          supabaseQuery = supabaseQuery.order('updated_at', { ascending: false });
          break;
      }

      // Apply pagination
      supabaseQuery = supabaseQuery.range(offset, offset + limit - 1);

      const { data, error, count } = await supabaseQuery;

      if (error) {
        console.error("Error searching workflows:", error);
        return { workflows: [], total: 0 };
      }

      if (!data || data.length === 0) {
        return { workflows: [], total: count || 0 };
      }

      // Transform results
      const workflows = await Promise.all(
        data.map(async (row) => {
          const state = row.state as any;
          
          if (!state) return null;

          // Fetch user data if user_id exists
          let user = null;
          if (row.user_id) {
            try {
              if (typeof window === 'undefined') {
                const { createServiceClient } = await import('@/lib/supabase');
                const serviceSupabase = createServiceClient();
                const { data: userData, error: userError } = await serviceSupabase.auth.admin.getUserById(row.user_id);
                
                if (!userError && userData.user) {
                  const metaData = userData.user.user_metadata || {};
                  user = {
                    id: userData.user.id,
                    email: userData.user.email,
                    full_name: metaData.full_name || metaData.name || null,
                    avatar_url: metaData.avatar_url || metaData.picture || null,
                  };
                }
              } else {
                const response = await fetch(`/api/users/${row.user_id}`);
                if (response.ok) {
                  user = await response.json();
                }
              }
            } catch (userFetchError) {
              console.error("Error fetching user data:", userFetchError);
            }
          }

          // Extract workflow name
          const workflowName = 
            state.seo?.title ||
            state.workflow?.settings?.name || 
            state.settings?.name || 
            (row.user_prompt && row.user_prompt.length > 50 ? row.user_prompt.slice(0, 50) + '...' : row.user_prompt) ||
            'Untitled Workflow';

          return {
            sessionId: row.session_id,
            workflow: {
              nodes: state.workflow?.nodes || state.nodes || [],
              settings: state.workflow?.settings || state.settings || { name: workflowName },
            },
            seo: state.seo || {
              slug: row.session_id,
              title: workflowName,
              description: row.user_prompt || state.userPrompt || 'Automated workflow',
              keywords: [],
              businessValue: 'Automation',
              category: 'Automation' as any,
              integrations: [],
              generatedAt: row.created_at
            },
            configAnalysis: state.configAnalysis,
            userPrompt: row.user_prompt || state.userPrompt || "",
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            isVetted: row.is_vetted || false,
            user: user,
          };
        })
      );

      const filteredWorkflows = workflows.filter(Boolean) as WorkflowBySlugResponse[];

      return {
        workflows: filteredWorkflows,
        total: count || 0
      };
    } catch (error) {
      console.error("Error searching workflows:", error);
      return { workflows: [], total: 0 };
    }
  }

  /**
   * Check if a slug already exists
   * Useful for ensuring unique slugs
   */
  async slugExists(slug: string): Promise<boolean> {
    try {
      const { count, error } = await this.supabase
        .from("workflow_sessions")
        .select("session_id", { count: "exact", head: true })
        .eq("state->seo->>slug", slug);

      if (error) {
        console.error("Error checking slug existence:", error);
        return false;
      }

      return (count || 0) > 0;
    } catch (error) {
      console.error("Error checking slug existence:", error);
      return false;
    }
  }
}

// Singleton instance
let workflowQueriesInstance: WorkflowQueries | null = null;

export function getWorkflowQueries(): WorkflowQueries {
  if (!workflowQueriesInstance) {
    workflowQueriesInstance = new WorkflowQueries();
  }
  return workflowQueriesInstance;
}

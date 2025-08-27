// lib/db/workflow-queries.ts

import { createClient } from "@supabase/supabase-js";
import { getEnv } from "@/lib/config/env";
import { WorkflowBySlugResponse } from "@/types/seo";

/**
 * Database queries for workflow operations
 */
export class WorkflowQueries {
  private supabase;

  constructor() {
    const env = getEnv();
    this.supabase = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
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

      // For now, we'll skip user data fetching on the client side
      // This should be handled by a server-side API endpoint
      const user = null;

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

      const workflows = data
        .map((row) => {
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

          // For now, we'll skip user data fetching on the client side
          const user = null;

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
        .filter(Boolean) as WorkflowBySlugResponse[];

      console.log('Final workflows array:', workflows.length, 'workflows');
      return workflows;
    } catch (error) {
      console.error("Error listing public workflows:", error);
      return [];
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

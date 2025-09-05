"use server";

import { createClient } from "@supabase/supabase-js";
import { normalizeNodeType } from "@/lib/utils/node-type-utils";

// Database schema for n8n_nodes table
export interface NodeMetadata {
  id: number;
  name: string;
  node_type: string;
  key_parameters?: string;
  essential_settings?: Array<{
    name: string;
    description: string;
  }>;
  documentation_url?: string;
  primary_documentation_url?: string;
  credential_documentation_url?: string;
  business_use_cases?: string[];
  requires_auth?: boolean;
  auth_methods?: string[];
  credential_types?: string[];
}

/**
 * Fetch node metadata for multiple node types from the database
 */
export async function getNodeMetadata(nodeTypes: string[]): Promise<Record<string, NodeMetadata>> {
  try {
    // Normalize all node types before querying
    const normalizedTypes = nodeTypes.map(normalizeNodeType);
    
    // Remove duplicates
    const uniqueTypes = [...new Set(normalizedTypes)];
    
    console.log('Fetching metadata for node types:', uniqueTypes);
    
    if (uniqueTypes.length === 0) {
      return {};
    }
    
    // Create Supabase client with service role key for server-side access
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    // Query the n8n_nodes table
    const { data, error } = await supabase
      .from('n8n_nodes')
      .select('id, name, node_type, key_parameters, essential_settings, documentation_url, primary_documentation_url, credential_documentation_url, business_use_cases, requires_auth, auth_methods, credential_types')
      .in('node_type', uniqueTypes);
    
    if (error) {
      console.error('Error fetching node metadata:', error);
      return {};
    }
    
    if (!data) {
      console.log('No data returned from database');
      return {};
    }
    
    console.log(`Found ${data.length} nodes in database`);
    
    // Create a map with both normalized and original keys for easy lookup
    const metadataMap: Record<string, NodeMetadata> = {};
    
    data.forEach((node) => {
      metadataMap[node.node_type] = node;
    });
    
    // Also map original (non-normalized) types to the same metadata
    nodeTypes.forEach((originalType) => {
      const normalizedType = normalizeNodeType(originalType);
      if (metadataMap[normalizedType]) {
        metadataMap[originalType] = metadataMap[normalizedType];
      }
    });
    
    console.log('Metadata map keys:', Object.keys(metadataMap));
    
    return metadataMap;
  } catch (error) {
    console.error('Error in getNodeMetadata:', error);
    return {};
  }
}

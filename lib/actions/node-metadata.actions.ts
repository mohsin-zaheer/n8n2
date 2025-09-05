import { createServiceClient } from "@/lib/supabase";

export interface NodeMetadata {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  category?: string;
  requires_auth: boolean;
  configuration_doc_url?: string;
  official_doc_url?: string;
  configuration_guide?: string;
  icon_name?: string;
  created_at: string;
  updated_at: string;
}

export async function getNodeMetadata(nodeTypes: string[]): Promise<Record<string, NodeMetadata>> {
  if (!nodeTypes.length) return {};

  try {
    const supabase = createServiceClient();
    
    // Clean node types to match database format
    const cleanNodeTypes = nodeTypes.map(type => 
      type.replace("n8n-nodes-base.", "")
          .replace("@n8n/n8n-nodes-langchain.", "")
          .replace("nodes-base.", "")
          .replace("nodes-langchain.", "")
          .split(".")[0]
    );

    const { data, error } = await supabase
      .from('n8n_nodes')
      .select('*')
      .in('name', cleanNodeTypes);

    if (error) {
      console.error('Error fetching node metadata:', error);
      return {};
    }

    // Create a lookup object keyed by original node type
    const metadataLookup: Record<string, NodeMetadata> = {};
    
    nodeTypes.forEach((originalType, index) => {
      const cleanType = cleanNodeTypes[index];
      const metadata = data?.find(node => node.name === cleanType);
      if (metadata) {
        metadataLookup[originalType] = metadata;
      }
    });

    return metadataLookup;
  } catch (error) {
    console.error('Error in getNodeMetadata:', error);
    return {};
  }
}

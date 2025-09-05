/**
 * Utility functions for node type normalization
 * These functions can be used in both client and server components
 */

/**
 * Normalize node types from workflow format to database format
 * Handles the conversion of node type prefixes
 */
export function normalizeNodeType(nodeType: string): string {
  // n8n-nodes-base.webhook -> nodes-base.webhook
  if (nodeType.startsWith('n8n-nodes-base.')) {
    return nodeType.replace('n8n-nodes-base.', 'nodes-base.');
  }
  
  // @n8n/n8n-nodes-langchain.lmChatOpenAi -> nodes-langchain.lmChatOpenAi
  if (nodeType.startsWith('@n8n/n8n-nodes-langchain.')) {
    return nodeType.replace('@n8n/n8n-nodes-langchain.', 'nodes-langchain.');
  }
  
  // Already normalized or unknown format
  return nodeType;
}

/**
 * Clean node type for consistent key matching
 */
export function cleanNodeType(nodeType: string): string {
  return nodeType
    .replace("n8n-nodes-base.", "")
    .replace("@n8n/n8n-nodes-langchain.", "")
    .replace("nodes-base.", "")
    .replace("nodes-langchain.", "")
    .split(".")[0];
}

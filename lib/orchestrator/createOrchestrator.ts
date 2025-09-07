// lib/orchestrator/createOrchestrator.ts

import { WorkflowOrchestrator } from "@/lib/workflow-orchestrator";
import { MCPClient } from "@/lib/mcp-client";
import { PhaseManager } from "@/lib/phase-manager";
import { SessionRepo } from "@/lib/orchestrator/context/SessionRepo";
import { NodeContextService } from "@/lib/orchestrator/context/NodeContextService";
import { OrchestratorDeps } from "@/lib/orchestrator/contracts/OrchestratorDeps";

// Global MCP client instance - persists across warm serverless invocations
let globalMCPClient: MCPClient | null = null;

/**
 * Factory function to create a WorkflowOrchestrator with default dependencies
 * This maintains backward compatibility while allowing for dependency injection
 */
export function createOrchestrator(overrides?: Partial<OrchestratorDeps>): WorkflowOrchestrator {
  // Reuse global MCP client if available (warm start), otherwise create new (cold start)
  const mcpClient = overrides?.mcpClient || (() => {
    if (!globalMCPClient) {
      console.log('[MCP] Creating new global MCP client instance (cold start)');
      globalMCPClient = MCPClient.getInstance({
        serverUrl: process.env.MCP_SERVER_URL || "https://n8ngrowthagents.ghostteam.ai/mcp/",
        authToken: process.env.MCP_AUTH_TOKEN || "28d8026f-fad7-4bc6-87c5-9fcacba57fde",
      });
    } else {
      console.log('[MCP] Reusing existing MCP client (warm start)');
    }
    return globalMCPClient;
  })();

  const deps: OrchestratorDeps = {
    claudeService: overrides?.claudeService || null, // Claude service now optional
    mcpClient,
    phaseManager: overrides?.phaseManager || new PhaseManager(),
    sessionRepo: overrides?.sessionRepo || new SessionRepo(),
    nodeContextService: overrides?.nodeContextService || new NodeContextService(mcpClient),
  };

  return new WorkflowOrchestrator(deps);
}

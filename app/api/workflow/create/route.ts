import { NextResponse } from "next/server";
import { isMockEnabled, mockCreateResponse } from "@/lib/mocks/workflow";
import { WorkflowOrchestrator } from "@/lib/workflow-orchestrator";
import { nanoid } from "nanoid";
import { logger } from "@/lib/utils/logger";
import { perfTracker } from "@/lib/utils/performance-tracker";
import { createServerClientInstance } from "@/lib/supabase";

/**
 * POST /api/workflow/create
 * Creates a new workflow session and starts the discovery phase
 * Requires authentication
 */
export async function POST(request: Request) {
  const apiStartTime = Date.now();
  
  try {
    // Check authentication
    const supabase = await perfTracker.measure('API_Auth_Check', async () => {
      return await createServerClientInstance();
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    if (isMockEnabled()) {
      return NextResponse.json(mockCreateResponse());
    }

    const { prompt, sessionId: providedSessionId } = await request.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Use provided session ID if available, otherwise generate new one
    const sessionId = providedSessionId || (() => {
      const timestamp = Date.now();
      const random = nanoid(10);
      return `wf_${timestamp}_${random}`;
    })();

    // Create orchestrator
    const orchestrator = new WorkflowOrchestrator();

    // Start discovery phase asynchronously
    // Don't await - let it run in background
    orchestrator
      .runDiscoveryPhase(sessionId, prompt, user.id)
      .then(async (result) => {
        logger.info(`Discovery phase result for ${sessionId}:`, {
          success: result.success,
          selectedNodeIds: result.selectedNodeIds,
          pendingClarification: result.pendingClarification,
          phase: result.phase,
        });

        // After discovery, continue with other phases automatically
        if (
          !result.pendingClarification &&
          result.selectedNodeIds?.length > 0
        ) {
          logger.info(
            `Starting configuration phase for ${sessionId} with ${result.selectedNodeIds.length} nodes`
          );
          // Continue processing phases in background with timeout protection
          try {
            await orchestrator.runConfigurationPhase(sessionId);
            await orchestrator.runBuildingPhase(sessionId);
            
            // Add timeout for validation phase to prevent infinite loops
            const validationTimeout = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Validation phase timeout')), 120000); // 2 minutes
            });
            
            const validationPromise = orchestrator.runValidationPhase(sessionId);
            
            try {
              await Promise.race([validationPromise, validationTimeout]);
              await orchestrator.runDocumentationPhase(sessionId);
            } catch (validationError) {
              logger.warn(`Validation phase failed/timeout for ${sessionId}, continuing to documentation:`, validationError);
              // Continue to documentation even if validation fails
              await orchestrator.runDocumentationPhase(sessionId);
            }
            
            // Log total workflow completion time
            perfTracker.end('Workflow_Total', { sessionId });
          } catch (phaseError) {
            logger.error(
              `Phase processing failed for ${sessionId}:`,
              phaseError
            );
          }
        } else {
          logger.info(
            `Skipping automatic phase progression for ${sessionId}: pendingClarification=${!!result.pendingClarification}, selectedNodes=${
              result.selectedNodeIds?.length || 0
            }`
          );
        }
      })
      .catch((error) => {
        logger.error(`Background processing failed for ${sessionId}:`, error);
      });

    // Start tracking total workflow time
    perfTracker.start('Workflow_Total', { sessionId, prompt: prompt.substring(0, 100) });
    
    // Log API response time
    const apiDuration = Date.now() - apiStartTime;
    logger.info(`[PERF] API_Create_Response: ${apiDuration}ms`, { sessionId });

    return NextResponse.json({
      sessionId,
      message: "Workflow creation started",
      status: "processing",
    });
  } catch (error) {
    logger.error("Failed to create workflow:", error);
    return NextResponse.json(
      { error: "Failed to create workflow session" },
      { status: 500 }
    );
  }
}

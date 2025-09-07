import { NextResponse } from "next/server";
import { workflowDb } from "@/lib/db/client";
import { getEnv } from "@/lib/config/env";
import { logger } from "@/lib/utils/logger";
import { isMCPConfigured } from "@/lib/config/mcp";
import MCPClient from "@/lib/mcp-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  logger.info("Health check requested");
  try {
    // Check environment variables
    let envStatus = "ok";
    let envMessage = "All required environment variables are set";

    try {
      getEnv();
      logger.info("Environment variables validated successfully");
    } catch (error) {
      envStatus = "error";
      envMessage =
        error instanceof Error
          ? error.message
          : "Environment validation failed";
      logger.error("Environment validation failed:", error);
    }

    // Check database connection
    let dbStatus = "ok";
    let dbMessage = "Database connection is healthy";
    let dbResponseTime: number | null = null;

    const startTime = Date.now();
    try {
      const isHealthy = await workflowDb.healthCheck();
      dbResponseTime = Date.now() - startTime;

      if (!isHealthy) {
        dbStatus = "error";
        dbMessage = "Database health check failed";
        logger.error("Database health check returned unhealthy status");
      } else {
        logger.info(`Database health check passed (${dbResponseTime}ms)`);
      }
    } catch (error) {
      dbStatus = "error";
      dbMessage =
        error instanceof Error ? error.message : "Database connection failed";
      dbResponseTime = Date.now() - startTime;
      logger.error("Database connection failed:", error);
    }

    // Check MCP (Smithery) connection
    let mcpStatus: "ok" | "error" | "skipped" = "skipped";
    let mcpMessage = "MCP not configured";
    let mcpResponseTime: number | null = null;

    if (isMCPConfigured()) {
      const mcpStart = Date.now();
      try {
        const { MCP_SERVER_URL, MCP_AUTH_TOKEN } = getEnv();
        const client = MCPClient.getInstance({
          serverUrl: MCP_SERVER_URL,
          authToken: MCP_AUTH_TOKEN,
          connectionTimeout: 5000,
          maxRetries: 1,
          retryDelay: 500,
        });

        // bounded-time health check so endpoint never hangs
        await Promise.race([
          client.healthCheck(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("MCP timeout")), 5000)
          ),
        ]);

        mcpStatus = "ok";
        mcpMessage = "MCP reachable";
      } catch (e) {
        mcpStatus = "error";
        mcpMessage = e instanceof Error ? e.message : "MCP check failed";
      } finally {
        mcpResponseTime = Date.now() - mcpStart;
      }
    }

    // Overall status
    const overallStatus =
      envStatus === "ok" &&
      dbStatus === "ok" &&
      (mcpStatus === "ok" || mcpStatus === "skipped")
        ? "healthy"
        : "unhealthy";

    if (overallStatus === "healthy") {
      logger.info("Health check completed: System is healthy");
    } else {
      logger.warn(
        `Health check completed: System is unhealthy (env: ${envStatus}, db: ${dbStatus}, mcp: ${mcpStatus})`
      );
    }

    // Build response
    const response = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: {
        environment: {
          status: envStatus,
          message: envMessage,
        },
        database: {
          status: dbStatus,
          message: dbMessage,
          responseTime: dbResponseTime ? `${dbResponseTime}ms` : null,
        },
        mcp: {
          status: mcpStatus,
          message: mcpMessage,
          responseTime: mcpResponseTime ? `${mcpResponseTime}ms` : null,
        },
      },
      version: process.env.npm_package_version || "0.1.0",
    };

    return NextResponse.json(response, {
      status: overallStatus === "healthy" ? 200 : 503,
    });
  } catch (error) {
    // Catastrophic failure
    logger.error("Health check catastrophic failure:", error);
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        services: {
          environment: { status: "unknown" },
          database: { status: "unknown" },
          mcp: { status: "unknown" },
        },
      },
      { status: 500 }
    );
  }
}

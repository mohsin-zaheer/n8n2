import { getEnv } from './env';

// Helper to check if MCP is configured
export function isMCPConfigured(): boolean {
  try {
    const env = getEnv();
    return !!(env.MCP_SERVER_URL && env.MCP_AUTH_TOKEN);
  } catch {
    return false;
  }
}

/**
 * Get the URL for the current environment
 * Following Supabase best practices for handling redirects across environments
 * 
 * @returns The base URL with protocol and trailing slash
 */
export const getURL = (): string => {
  // In production, always use the production domain
  if (process.env.NODE_ENV === 'production') {
    return 'https://n8n.geniusai.biz/';
  }
  
  // Check for explicit site URL first (useful for staging/testing)
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    let url = process.env.NEXT_PUBLIC_SITE_URL;
    // Make sure to include `https://` when not localhost
    url = url.startsWith('http') ? url : `https://${url}`;
    // Make sure to include trailing `/`
    url = url.endsWith('/') ? url : `${url}/`;
    return url;
  }
  
  // Vercel deployment URL
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}/`;
  }
  
  // Development fallback
  return 'http://localhost:3000/';
}

/**
 * Check if we're in development environment
 */
export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development' || 
         !process.env.NEXT_PUBLIC_SITE_URL
}

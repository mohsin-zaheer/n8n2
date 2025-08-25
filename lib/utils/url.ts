/**
 * Get the URL for the current environment
 * Following Supabase best practices for handling redirects across environments
 * 
 * @returns The base URL with protocol and trailing slash
 */
export const getURL = (): string => {
  let url = 
    process?.env?.NEXTAUTH_URL ?? // Set this in production
    process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel
    'http://localhost:3000/' // Local development fallback
  
  // Make sure to include `https://` when not localhost
  url = url.startsWith('http') ? url : `https://${url}`
  
  // Make sure to include trailing `/`
  url = url.endsWith('/') ? url : `${url}/`
  
  return url
}

/**
 * Check if we're in development environment
 */
export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development' || 
         !process.env.NEXTAUTH_URL
}
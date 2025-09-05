import { createServerClientInstance } from '@/lib/supabase';
import { getURL } from '@/lib/utils/url';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  let origin: string = '';
  
  try {
    const { searchParams, origin: requestOrigin } = new URL(request.url);
    
    // Check for forwarded host from nginx proxy
    const forwardedHost = request.headers.get('x-forwarded-host');
    const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
    
    if (forwardedHost) {
      origin = `${forwardedProto}://${forwardedHost}`;
      console.log('Using forwarded host:', origin);
    } else {
      origin = requestOrigin;
      console.log('Using request origin:', origin);
    }
    const redirectTo = searchParams.get('redirectTo') || '/';

    console.log('Login route - redirectTo:', redirectTo);
    console.log('Login route - origin:', origin);

    // Add timeout to prevent hanging requests
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 10000);
    });

    const authPromise = (async () => {
      const supabase = await createServerClientInstance();

      // Validate environment variables
      const baseUrl = getURL();
      if (!baseUrl) {
        throw new Error('Base URL not configured');
      }

      console.log('Login route - base URL:', baseUrl);

      // Supabase will handle /auth/v1/callback internally
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // Send user back to the correct page after login
          redirectTo: `${baseUrl}/api/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('OAuth error:', error);
        throw error;
      }

      if (!data?.url) {
        throw new Error('No OAuth URL returned from Supabase');
      }

      return data.url;
    })();

    const oauthUrl = await Promise.race([authPromise, timeoutPromise]) as string;
    
    console.log('Login route - OAuth URL:', oauthUrl);
    
    // Create the redirect response with explicit headers
    const response = NextResponse.redirect(oauthUrl, { status: 302 });
    
    // Ensure proper headers for nginx
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;

  } catch (err: any) {
    console.error('Login route error:', err);
    
    // Ensure we have an origin for redirect
    if (!origin) {
      try {
        origin = new URL(request.url).origin;
      } catch {
        origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      }
    }

    const errorMessage = err?.message || 'server_error';
    const encodedMessage = encodeURIComponent(errorMessage);
    
    // Create the error redirect response with explicit headers
    const response = NextResponse.redirect(`${origin}/?auth=error&message=${encodedMessage}`, { status: 302 });
    
    // Ensure proper headers for nginx
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  }
}

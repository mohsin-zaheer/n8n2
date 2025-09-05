import { createServerClientInstance } from '@/lib/supabase';
import { getURL } from '@/lib/utils/url';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  let origin: string = '';
  
  try {
    const { searchParams, origin: requestOrigin } = new URL(request.url);
    origin = requestOrigin;
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
    return NextResponse.redirect(oauthUrl);

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
    
    return NextResponse.redirect(`${origin}/?auth=error&message=${encodedMessage}`);
  }
}

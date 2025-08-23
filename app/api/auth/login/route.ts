import { createServerClientInstance } from '@/lib/supabase';
import { getURL } from '@/lib/utils/url';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function GET(request: Request) {
  console.log('OAuth login route hit at:', new Date().toISOString());
  
  const { searchParams } = new URL(request.url);
  const redirectTo = searchParams.get('redirectTo') || '/';
  
  // Use getURL() for consistent origin handling
  const baseURL = getURL();
  const origin = baseURL.slice(0, -1); // Remove trailing slash for origin
  
  // Validate and sanitize redirect URL
  const safeRedirectTo = redirectTo.startsWith('/') ? redirectTo : '/';
  
  console.log('OAuth login initiated:', {
    origin,
    redirectTo: safeRedirectTo,
    baseURL,
    nodeEnv: process.env.NODE_ENV,
    fullCallbackURL: `${baseURL}api/auth/callback?redirectTo=${encodeURIComponent(safeRedirectTo)}`
  });
  
  try {
    const supabase = await createServerClientInstance();
    console.log('Supabase client created for OAuth');
    
    // Use getURL() for proper environment-aware redirect handling
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${baseURL}api/auth/callback?redirectTo=${encodeURIComponent(safeRedirectTo)}`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    
    console.log('OAuth request result:', {
      hasUrl: !!data?.url,
      hasError: !!error,
      errorMessage: error?.message
    });
    
    if (data?.url && !error) {
      console.log('Redirecting to OAuth provider:', data.url.substring(0, 100) + '...');
      return NextResponse.redirect(data.url);
    }

    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(`${origin}/?auth=error&reason=oauth_init_failed`);
    }

    // Fallback redirect
    console.error('No OAuth URL returned from Supabase');
    return NextResponse.redirect(`${origin}/?auth=error&reason=no_oauth_url`);
    
  } catch (supabaseError) {
    console.error('Supabase client creation failed:', supabaseError);
    return NextResponse.redirect(`${origin}/?auth=error&reason=supabase_error`);
  }
}



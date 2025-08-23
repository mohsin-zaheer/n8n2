import { createServerClientInstance } from '@/lib/supabase';
import { getURL } from '@/lib/utils/url';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const redirectTo = searchParams.get('redirectTo') || '/';
  
  // Use getURL() for consistent origin handling
  const baseURL = getURL();
  const origin = baseURL.slice(0, -1); // Remove trailing slash for origin
  
  // Validate and sanitize redirect URL
  const safeRedirectTo = redirectTo.startsWith('/') ? redirectTo : '/';
  
  // Log OAuth initiation in development
  if (process.env.NODE_ENV === 'development') {
    console.log('OAuth login initiated:', {
      origin,
      redirectTo: safeRedirectTo,
      baseURL,
      fullCallbackURL: `${baseURL}api/auth/callback?redirectTo=${encodeURIComponent(safeRedirectTo)}`
    });
  }
  
  const supabase = await createServerClientInstance();
  
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
  
  if (data?.url && !error) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Redirecting to OAuth provider:', data.url.substring(0, 100) + '...');
    }
    return NextResponse.redirect(data.url);
  }

  if (error) {
    console.error('OAuth error:', error);
    return NextResponse.redirect(`${origin}/?auth=error`);
  }

  // Fallback redirect
  console.error('No OAuth URL returned from Supabase');
  return NextResponse.redirect(`${origin}/?auth=error`);
}



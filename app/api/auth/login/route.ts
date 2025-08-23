import { createServerClientInstance } from '@/lib/supabase';
import { getURL } from '@/lib/utils/url';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const redirectTo = searchParams.get('redirectTo') || '/';
  
  // Use getURL() for consistent origin handling
  const baseURL = getURL();
  const origin = baseURL.slice(0, -1); // Remove trailing slash for origin
  
  // Log OAuth initiation in development
  if (process.env.NODE_ENV === 'development') {
    console.log('OAuth login initiated:', {
      origin,
      redirectTo,
      baseURL,
      fullCallbackURL: `${baseURL}api/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`
    });
  }
  
  const supabase = await createServerClientInstance();
  
  // Use getURL() for proper environment-aware redirect handling
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${baseURL}api/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    console.error('OAuth error:', error);
    return NextResponse.redirect(`${origin}/?auth=error`);
  }

  if (data.url) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Redirecting to OAuth provider:', data.url.substring(0, 100) + '...');
    }
    return NextResponse.redirect(data.url);
  }

  // Fallback redirect
  console.error('No OAuth URL returned from Supabase');
  return NextResponse.redirect(`${origin}/?auth=error`);
}


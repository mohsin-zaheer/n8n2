import { createServerClientInstance } from '@/lib/supabase';
import { getURL } from '@/lib/utils/url';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const redirectTo = searchParams.get('redirectTo') || '/';
  
  // Log OAuth initiation in development
  if (process.env.NODE_ENV === 'development') {
    console.log('OAuth login initiated:', {
      origin,
      redirectTo,
      baseURL: getURL(),
      fullCallbackURL: `${getURL()}api/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`
    });
  }
  
  const supabase = await createServerClientInstance();
  
  // Use getURL() for proper environment-aware redirect handling
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${getURL()}api/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
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

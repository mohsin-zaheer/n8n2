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
  
  // Generate PKCE code verifier and challenge
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  
  // Store code verifier in httpOnly cookie
  const cookieStore = await cookies();
  
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
  
  // If OAuth URL was generated successfully, store the code verifier
  if (data?.url && !error) {
    const response = NextResponse.redirect(data.url);
    response.cookies.set('pkce_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/'
    });
    
    if (process.env.NODE_ENV === 'development') {
      console.log('PKCE verifier stored, redirecting to OAuth provider');
    }
    
    return response;
  }

  if (error) {
    console.error('OAuth error:', error);
    return NextResponse.redirect(`${origin}/?auth=error`);
  }

  // Fallback redirect
  console.error('No OAuth URL returned from Supabase');
  return NextResponse.redirect(`${origin}/?auth=error`);
}

// PKCE helper functions
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}


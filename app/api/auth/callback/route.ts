import { createServerClientInstance } from '@/lib/supabase';
import { getURL } from '@/lib/utils/url';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const redirectTo = searchParams.get('redirectTo') || '/';
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Use getURL() for consistent origin handling
  const baseURL = getURL();
  const origin = baseURL.slice(0, -1); // Remove trailing slash for origin

  // Log all parameters for debugging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Auth callback received:', {
      code: code ? `${code.substring(0, 10)}...` : null,
      codeLength: code?.length || 0,
      redirectTo,
      error,
      errorDescription,
      origin,
      fullUrl: request.url,
      allParams: Object.fromEntries(searchParams.entries())
    });
  }

  // Handle OAuth errors from the provider
  if (error) {
    console.error('OAuth provider error:', { error, errorDescription });
    return NextResponse.redirect(`${origin}/?auth=error&reason=${encodeURIComponent(error)}`);
  }

  if (code) {
    try {
      // Check if we've already processed this code recently
      const cookieStore = await cookies();
      const processedCode = cookieStore.get('processed_auth_code')?.value;
      
      if (processedCode === code) {
        console.log('Auth code already processed, redirecting to success');
        return NextResponse.redirect(`${origin}${redirectTo}`);
      }
      
      const supabase = await createServerClientInstance();
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Attempting to exchange code for session...');
      }
      
      // Retrieve the PKCE code verifier from cookies
      const codeVerifier = cookieStore.get('pkce_verifier')?.value;
      
      if (!codeVerifier) {
        console.error('PKCE code verifier not found in cookies');
        return NextResponse.redirect(`${origin}/?auth=error&reason=missing_verifier`);
      }
      
      const { data: authData, error: authError } = await supabase.auth.exchangeCodeForSession({
        authCode: code,
        codeVerifier
      });
      
      if (!authError && authData?.user) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Auth successful for user:', authData.user.id);
        }
        
        // Create response first
        const response = NextResponse.redirect(`${origin}${redirectTo}`);
        
        // Then set cookies on the response
        try {
          response.cookies.set('processed_auth_code', code, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 300, // 5 minutes expiry
            path: '/'
          });
          
          // Clear the PKCE verifier cookie since it's no longer needed
          response.cookies.delete('pkce_verifier');
          
          // Check if this is a user returning from login with a pending workflow
          if (redirectTo.startsWith('/workflow/')) {
            response.cookies.set('just_authenticated', 'true', {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 60, // 1 minute expiry
              path: '/'
            });
          }
        } catch (cookieError) {
          console.warn('Failed to set cookies:', cookieError);
          // Continue anyway - auth was successful
        }
        
        return response;
      }
      
      console.error('Auth callback error:', authError);
      return NextResponse.redirect(`${origin}/?auth=error&reason=exchange_failed`);
    } catch (err) {
      console.error('Auth callback exception:', err);
      return NextResponse.redirect(`${origin}/?auth=error&reason=exception`);
    }
  }

  // No code provided
  console.error('Auth callback: No code parameter provided');
  return NextResponse.redirect(`${origin}/?auth=error&reason=no_code`);
}

import { createServerClientInstance } from '@/lib/supabase';
import { getURL } from '@/lib/utils/url';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

// Simple in-memory cache to prevent code reuse (Edge Runtime compatible)
const processedCodes = new Set<string>();

export async function GET(request: Request) {
  console.log('Auth callback route hit at:', new Date().toISOString());
  
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const redirectTo = searchParams.get('redirectTo') || '/';
  const error = searchParams.get('error');

  // Use getURL() for consistent origin handling (same as login route)
  const baseURL = getURL();
  const origin = baseURL.slice(0, -1); // Remove trailing slash for origin

  console.log('Callback params:', {
    hasCode: !!code,
    codeLength: code?.length,
    redirectTo,
    hasError: !!error,
    origin,
    allParams: Object.fromEntries(searchParams.entries())
  });

  // Handle OAuth provider errors
  if (error) {
    console.error('OAuth provider error:', error);
    return NextResponse.redirect(`${origin}/?auth=error&reason=${encodeURIComponent(error)}`);
  }

  if (code) {
    // Check if this code has already been processed
    if (processedCodes.has(code)) {
      console.log('Auth code already processed, redirecting to success');
      const safeRedirectTo = redirectTo.startsWith('/') ? redirectTo : '/';
      return NextResponse.redirect(`${origin}${safeRedirectTo}`);
    }

    console.log('Processing auth code...');
    
    try {
      const supabase = await createServerClientInstance();
      console.log('Supabase client created successfully');
      
      const { data: authData, error } = await supabase.auth.exchangeCodeForSession(code);
      
      console.log('Code exchange result:', {
        hasData: !!authData,
        hasUser: !!authData?.user,
        hasError: !!error,
        errorCode: error?.code,
        errorMessage: error?.message
      });
      
      if (!error && authData?.user) {
        console.log('Auth successful for user:', authData.user.id);
        
        // Mark this code as processed
        processedCodes.add(code);
        
        // Clean up old codes (keep only last 100)
        if (processedCodes.size > 100) {
          const codesArray = Array.from(processedCodes);
          processedCodes.clear();
          codesArray.slice(-50).forEach(c => processedCodes.add(c));
        }
        
        // Ensure we don't redirect back to auth routes to prevent loops
        let safeRedirectTo = redirectTo;
        if (redirectTo.startsWith('/api/auth/') || redirectTo.includes('/auth/')) {
          safeRedirectTo = '/';
          console.log('Prevented auth route redirect loop, using home page instead');
        }
        
        const finalRedirectUrl = `${origin}${safeRedirectTo}`;
        console.log('Redirecting to:', finalRedirectUrl);
        
        // Use a simple HTTP redirect instead of HTML to avoid double requests
        const response = NextResponse.redirect(finalRedirectUrl);
        
        // Set cookies via response headers for Edge Runtime compatibility
        if (safeRedirectTo.startsWith('/workflow/')) {
          console.log('Setting just_authenticated cookie for workflow redirect');
          response.cookies.set('just_authenticated', 'true', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60, // 1 minute expiry
            path: '/'
          });
        }
        
        return response;
      }
      
      console.error('Auth callback error:', error);
      return NextResponse.redirect(`${origin}/?auth=error&reason=exchange_failed`);
      
    } catch (exchangeError) {
      console.error('Code exchange exception:', exchangeError);
      return NextResponse.redirect(`${origin}/?auth=error&reason=exception`);
    }
  }

  // Authentication failed or no code provided
  console.error('No auth code provided');
  return NextResponse.redirect(`${origin}/?auth=error&reason=no_code`);
}

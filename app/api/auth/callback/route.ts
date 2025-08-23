import { createServerClientInstance } from '@/lib/supabase';
import { getURL } from '@/lib/utils/url';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

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
        
        // Ensure we don't redirect back to auth routes to prevent loops
        let safeRedirectTo = redirectTo;
        if (redirectTo.startsWith('/api/auth/') || redirectTo.includes('/auth/')) {
          safeRedirectTo = '/';
          console.log('Prevented auth route redirect loop, using home page instead');
        }
        
        const finalRedirectUrl = `${origin}${safeRedirectTo}`;
        console.log('Redirecting to:', finalRedirectUrl);
        
        // Create response with cookies set in headers (Edge Runtime compatible)
        const htmlRedirect = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Authentication Successful</title>
  <meta http-equiv="refresh" content="0; url=${finalRedirectUrl}">
  <script>
    setTimeout(function() {
      window.location.href = "${finalRedirectUrl}";
    }, 100);
  </script>
</head>
<body>
  <p>Authentication successful. Redirecting...</p>
  <p>If you are not redirected automatically, <a href="${finalRedirectUrl}">click here</a>.</p>
</body>
</html>`;
        
        console.log('Returning HTML redirect response');
        
        const response = new NextResponse(htmlRedirect, {
          status: 200,
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
        
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

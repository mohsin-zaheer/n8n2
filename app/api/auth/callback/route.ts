import { createServerClientInstance } from '@/lib/supabase';
import { getURL } from '@/lib/utils/url';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Helper function to create safe HTML redirect
function createHtmlRedirect(url: string): string {
  const safeUrl = url.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting...</title>
  <meta http-equiv="refresh" content="0; url=${safeUrl}">
  <script>
    setTimeout(function() {
      window.location.href = "${safeUrl}";
    }, 100);
  </script>
</head>
<body>
  <p>Authentication successful. Redirecting...</p>
  <p>If you are not redirected automatically, <a href="${safeUrl}">click here</a>.</p>
</body>
</html>`;
}

// Helper function to create error redirect
function createErrorRedirect(origin: string, reason: string): NextResponse {
  const errorUrl = `${origin}/?auth=error&reason=${encodeURIComponent(reason)}`;
  return new NextResponse(createHtmlRedirect(errorUrl), {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  });
}

export async function GET(request: Request) {
  const startTime = Date.now();
  console.log('Auth callback started at:', new Date().toISOString());
  
  let origin: string;
  let redirectTo: string;
  
  try {
    // Parse URL and get basic parameters
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    redirectTo = searchParams.get('redirectTo') || '/';
    const error = searchParams.get('error');
    
    // Get origin URL
    const baseURL = getURL();
    origin = baseURL.slice(0, -1);
    
    // Validate redirect URL
    const safeRedirectTo = redirectTo.startsWith('/') ? redirectTo : '/';
    const finalRedirectUrl = `${origin}${safeRedirectTo}`;
    
    console.log('Callback params:', { 
      hasCode: !!code, 
      redirectTo: safeRedirectTo, 
      hasError: !!error 
    });
    
    // Handle OAuth provider errors
    if (error) {
      console.error('OAuth provider error:', error);
      return createErrorRedirect(origin, error);
    }
    
    // Handle missing code
    if (!code) {
      console.error('No auth code provided');
      return createErrorRedirect(origin, 'no_code');
    }
    
    // Process the auth code
    console.log('Processing auth code...');
    
    let supabase;
    try {
      supabase = await createServerClientInstance();
    } catch (supabaseError) {
      console.error('Supabase client creation failed:', supabaseError);
      return createErrorRedirect(origin, 'supabase_error');
    }
    
    // Exchange code for session
    let authResult;
    try {
      authResult = await supabase.auth.exchangeCodeForSession(code);
    } catch (exchangeError) {
      console.error('Code exchange failed:', exchangeError);
      return createErrorRedirect(origin, 'exchange_failed');
    }
    
    // Check auth result
    if (authResult.error || !authResult.data?.user) {
      console.error('Auth failed:', authResult.error);
      return createErrorRedirect(origin, 'auth_failed');
    }
    
    // Success - create redirect
    console.log('Auth successful for user:', authResult.data.user.id);
    console.log('Redirecting to:', finalRedirectUrl);
    console.log('Callback completed in:', Date.now() - startTime, 'ms');
    
    return new NextResponse(createHtmlRedirect(finalRedirectUrl), {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
    });
    
  } catch (error) {
    console.error('Auth callback fatal error:', error);
    
    // Fallback error response
    const fallbackUrl = origin ? `${origin}/?auth=error&reason=server_error` : 'https://n8n.geniusai.biz/?auth=error&reason=server_error';
    
    return new NextResponse(createHtmlRedirect(fallbackUrl), {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

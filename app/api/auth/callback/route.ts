import { createServerClientInstance } from '@/lib/supabase';
import { getURL } from '@/lib/utils/url';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Basic health check - log that we reached the route
  console.log('Auth callback route hit at:', new Date().toISOString());
  
  try {
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
        console.log('Processing auth code...');
        
        // Check if we've already processed this code recently
        const cookieStore = await cookies();
        console.log('Got cookie store');
        
        const processedCode = cookieStore.get('processed_auth_code')?.value;
        
        if (processedCode === code) {
          console.log('Auth code already processed, redirecting to success');
          const safeRedirectTo = redirectTo.startsWith('/') ? redirectTo : '/';
          return NextResponse.redirect(`${origin}${safeRedirectTo}`);
        }
        
        console.log('Creating Supabase client...');
        let supabase;
        try {
          supabase = await createServerClientInstance();
          console.log('Supabase client created successfully');
        } catch (supabaseError) {
          console.error('Failed to create Supabase client:', supabaseError);
          return NextResponse.redirect(`${origin}/?auth=error&reason=supabase_client_error`);
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log('Attempting to exchange code for session...');
        }
        
        let authData, authError;
        try {
          const result = await supabase.auth.exchangeCodeForSession(code);
          authData = result.data;
          authError = result.error;
          console.log('Code exchange completed', { hasData: !!authData, hasError: !!authError });
        } catch (exchangeError) {
          console.error('Code exchange threw exception:', exchangeError);
          return NextResponse.redirect(`${origin}/?auth=error&reason=code_exchange_exception`);
        }
        
        if (!authError && authData?.user) {
          if (process.env.NODE_ENV === 'development') {
            console.log('Auth successful for user:', authData.user.id);
          }
          
          // Validate and sanitize redirect URL
          const safeRedirectTo = redirectTo.startsWith('/') ? redirectTo : '/';
          const redirectUrl = `${origin}${safeRedirectTo}`;
          
          console.log('Creating redirect response to:', redirectUrl);
          
          // Create response first
          const response = NextResponse.redirect(redirectUrl);
          
          console.log('Setting cookies on response...');
          
          try {
            // Set cookies with error handling
            response.cookies.set('processed_auth_code', code, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 300,
              path: '/'
            });
            
            // Check if this is a user returning from login with a pending workflow
            if (safeRedirectTo.startsWith('/workflow/')) {
              response.cookies.set('just_authenticated', 'true', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60,
                path: '/'
              });
            }
            console.log('All cookies set successfully');
          } catch (cookieError) {
            console.error('Cookie setting error:', cookieError);
            // Continue without cookies if they fail
          }
          
          console.log('Cookies set successfully, returning response');
          console.log('About to return redirect response');
          
          // Add a small delay to ensure logs are flushed
          await new Promise(resolve => setTimeout(resolve, 10));
          
          console.log('Returning response now');
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
  } catch (outerErr) {
    console.error('Auth callback outer exception:', outerErr);
    // Fallback redirect in case of complete failure
    try {
      const baseURL = getURL();
      const origin = baseURL.slice(0, -1);
      return NextResponse.redirect(`${origin}/?auth=error&reason=server_error`);
    } catch (fallbackErr) {
      console.error('Fallback redirect failed:', fallbackErr);
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  }
}

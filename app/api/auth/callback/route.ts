import { createServerClientInstance } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  let origin: string = '';
  
  try {
    console.log('=== AUTH CALLBACK START ===');
    console.log('Request URL (internal):', request.url);
    
    const { searchParams, origin: requestOrigin } = new URL(request.url);
    
    // Check for forwarded host from nginx proxy
    const forwardedHost = request.headers.get('x-forwarded-host');
    const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
    const forwardedFor = request.headers.get('x-forwarded-for');
    
    console.log('Headers:', {
      'x-forwarded-host': forwardedHost,
      'x-forwarded-proto': forwardedProto,
      'x-forwarded-for': forwardedFor,
      'host': request.headers.get('host')
    });
    
    if (forwardedHost) {
      origin = `${forwardedProto}://${forwardedHost}`;
      console.log('Using forwarded host:', origin);
    } else {
      origin = requestOrigin;
      console.log('Using request origin:', origin);
    }
    
    // Construct the external URL that users would see
    const externalUrl = forwardedHost 
      ? `${forwardedProto}://${forwardedHost}${new URL(request.url).pathname}${new URL(request.url).search}`
      : request.url;
    console.log('External URL (what users see):', externalUrl);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const redirectTo = searchParams.get('redirectTo') || '/';

    console.log('Callback route - code present:', !!code);
    console.log('Callback route - error:', error);
    console.log('Callback route - redirectTo:', redirectTo);
    console.log('Callback route - origin:', origin);

    // Handle OAuth errors from provider
    if (error) {
      console.error('OAuth provider error:', error);
      return NextResponse.redirect(`${origin}/?auth=error&message=${encodeURIComponent(error)}`);
    }

    if (!code) {
      console.error('No authorization code provided');
      return NextResponse.redirect(`${origin}/?auth=error&message=no_code`);
    }

    console.log('Creating Supabase client...');
    let supabase;
    try {
      supabase = await createServerClientInstance();
      console.log('Supabase client created successfully');
    } catch (supabaseError) {
      console.error('Failed to create Supabase client:', supabaseError);
      throw new Error('Supabase client creation failed');
    }

    console.log('Exchanging code for session...');
    let authData;
    try {
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (exchangeError) {
        console.error('Auth exchange error:', exchangeError);
        throw exchangeError;
      }
      
      if (!data?.user) {
        console.error('No user data after successful exchange');
        throw new Error('No user data returned');
      }

      authData = data;
      console.log('Auth exchange successful, user ID:', authData.user.id);
    } catch (exchangeError) {
      console.error('Exchange process failed:', exchangeError);
      throw exchangeError;
    }

    // Handle workflow redirect cookie
    if (redirectTo.startsWith('/workflow/')) {
      console.log('Setting workflow authentication cookie...');
      try {
        const cookieStore = await cookies();
        cookieStore.set('just_authenticated', 'true', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60,
          path: '/'
        });
        console.log('Workflow cookie set successfully');
      } catch (cookieError) {
        console.error('Error setting authentication cookie:', cookieError);
        // Continue without the cookie - not critical
      }
    }
    
    const redirectUrl = `${origin}${redirectTo}`;
    console.log('Redirecting to:', redirectUrl);
    console.log('=== AUTH CALLBACK SUCCESS ===');
    
    // Create the redirect response with explicit headers
    const response = NextResponse.redirect(redirectUrl, { status: 302 });
    
    // Ensure proper headers for nginx
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
    
  } catch (err: any) {
    console.error('=== AUTH CALLBACK ERROR ===');
    console.error('Error details:', {
      message: err?.message,
      stack: err?.stack,
      name: err?.name,
      cause: err?.cause
    });
    
    // Ensure we have an origin for redirect
    if (!origin) {
      try {
        origin = new URL(request.url).origin;
        console.log('Fallback origin from request URL:', origin);
      } catch (urlError) {
        origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        console.log('Using environment fallback origin:', origin);
      }
    }
    
    // Clear any potentially corrupted cookies
    try {
      console.log('Clearing potentially corrupted cookies...');
      const cookieStore = await cookies();
      const allCookies = cookieStore.getAll();
      let clearedCount = 0;
      allCookies.forEach(cookie => {
        if (cookie.name.startsWith('sb-') || cookie.name === 'just_authenticated') {
          cookieStore.delete(cookie.name);
          clearedCount++;
        }
      });
      console.log(`Cleared ${clearedCount} cookies`);
    } catch (cookieError) {
      console.error('Error clearing cookies:', cookieError);
    }
    
    const errorMessage = err?.message || 'server_error';
    const encodedMessage = encodeURIComponent(errorMessage);
    const errorRedirectUrl = `${origin}/?auth=error&message=${encodedMessage}`;
    
    console.log('Error redirect URL:', errorRedirectUrl);
    console.log('=== AUTH CALLBACK ERROR END ===');
    
    // Create the error redirect response with explicit headers
    const response = NextResponse.redirect(errorRedirectUrl, { status: 302 });
    
    // Ensure proper headers for nginx
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  }
}

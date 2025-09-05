import { createServerClientInstance } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  let origin: string = '';
  
  try {
    const { searchParams, origin: requestOrigin } = new URL(request.url);
    origin = requestOrigin;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const redirectTo = searchParams.get('redirectTo') || '/';

    console.log('Callback route - code present:', !!code);
    console.log('Callback route - error:', error);
    console.log('Callback route - redirectTo:', redirectTo);

    // Handle OAuth errors from provider
    if (error) {
      console.error('OAuth provider error:', error);
      return NextResponse.redirect(`${origin}/?auth=error&message=${encodeURIComponent(error)}`);
    }

    if (!code) {
      console.error('No authorization code provided');
      return NextResponse.redirect(`${origin}/?auth=error&message=no_code`);
    }

    // Add timeout to prevent hanging requests
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Auth exchange timeout')), 15000);
    });

    const exchangePromise = (async () => {
      const supabase = await createServerClientInstance();
      
      const { data: authData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (exchangeError) {
        console.error('Auth callback error:', exchangeError);
        throw exchangeError;
      }
      
      if (!authData?.user) {
        console.error('No user data after successful exchange');
        throw new Error('No user data returned');
      }

      return authData;
    })();

    const authData = await Promise.race([exchangePromise, timeoutPromise]) as any;
    
    console.log('Callback route - user authenticated:', authData.user?.id);

    // Check if this is a user returning from login with a pending workflow
    // The redirectTo will be like /workflow/wf_123456_abc
    if (redirectTo.startsWith('/workflow/')) {
      try {
        // Store a flag in cookies to indicate user just authenticated
        const cookieStore = await cookies();
        cookieStore.set('just_authenticated', 'true', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60, // 1 minute expiry
          path: '/'
        });
      } catch (cookieError) {
        console.error('Error setting authentication cookie:', cookieError);
        // Continue without the cookie - not critical
      }
    }
    
    // Redirect to the intended destination (will be /workflow/[sessionId])
    console.log('Callback route - redirecting to:', `${origin}${redirectTo}`);
    return NextResponse.redirect(`${origin}${redirectTo}`);
    
  } catch (err: any) {
    console.error('Callback route error:', err);
    
    // Ensure we have an origin for redirect
    if (!origin) {
      try {
        origin = new URL(request.url).origin;
      } catch {
        origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      }
    }
    
    // Clear any potentially corrupted cookies
    try {
      const cookieStore = await cookies();
      const allCookies = cookieStore.getAll();
      allCookies.forEach(cookie => {
        if (cookie.name.startsWith('sb-') || cookie.name === 'just_authenticated') {
          cookieStore.delete(cookie.name);
        }
      });
    } catch (cookieError) {
      console.error('Error clearing cookies:', cookieError);
    }
    
    const errorMessage = err?.message || 'server_error';
    const encodedMessage = encodeURIComponent(errorMessage);
    
    return NextResponse.redirect(`${origin}/?auth=error&message=${encodedMessage}`);
  }
}

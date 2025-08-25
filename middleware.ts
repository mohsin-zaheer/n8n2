import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

interface LogContext {
  requestId: string
  method: string
  path: string
  sessionId?: string
  timestamp: string
}

/**
 * Extracts session ID from URL path if present
 */
function extractSessionId(pathname: string): string | undefined {
  const match = pathname.match(/\/api\/workflow\/([^\/]+)/)
  return match ? match[1] : undefined
}

/**
 * Authentication wrapper (replaces updateSession import)
 */
async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  let response = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect workflow routes
  if (request.nextUrl.pathname.startsWith('/workflow') && !user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/auth/login'
    redirectUrl.searchParams.set('returnUrl', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

/**
 * Middleware for authentication and logging API requests
 */
export async function middleware(request: NextRequest) {
  try {
    const authResponse = await updateSession(request)

    if (authResponse.status === 307 || authResponse.status === 302) {
      return authResponse
    }

    if (!request.nextUrl.pathname.startsWith('/api/')) {
      return authResponse
    }

    const requestId =
      request.headers.get('x-request-id') ||
      `req-${Date.now()}-${Math.random().toString(36).substring(7)}`
    const isDebugMode =
      request.headers.get('x-debug-logs') === 'true' ||
      process.env.NODE_ENV === 'test'

    const logContext: LogContext = {
      requestId,
      method: request.method,
      path: request.nextUrl.pathname,
      sessionId: extractSessionId(request.nextUrl.pathname),
      timestamp: new Date().toISOString(),
    }

    if (isDebugMode) {
      console.log(`[API] Request started`, logContext)
    }

    const response = NextResponse.next({
      request,
      headers: authResponse.headers,
    })

    response.headers.set('x-request-id', requestId)
    response.headers.set('x-request-timestamp', logContext.timestamp)

    if (isDebugMode) {
      response.headers.set('x-debug-mode', 'true')
      response.headers.set('x-session-id', logContext.sessionId || 'none')
    }

    return response
  } catch (error) {
    console.error('Middleware error:', error)
    return NextResponse.next({ request })
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

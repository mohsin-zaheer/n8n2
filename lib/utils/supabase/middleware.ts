import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  // Authentication disabled - just pass through all requests
  return NextResponse.next({
    request,
  });
}

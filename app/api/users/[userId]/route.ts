import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    
    // Get user data from auth.users using service role
    const { data: userData, error } = await supabase.auth.admin.getUserById(userId);
    
    if (error || !userData.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userData.user;
    const metaData = user.user_metadata || {};
    
    return NextResponse.json({
      id: user.id,
      email: user.email,
      full_name: metaData.full_name || metaData.name || null,
      avatar_url: metaData.avatar_url || metaData.picture || null,
    });
    
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

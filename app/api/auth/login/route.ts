import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    // Find user
    const { data: user, error } = await supabase
      .from('user')
      .select('id, email, password')
      .eq('email', email)
      .single();
    
    if (error || !user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // Return user data (in production, you'd set a session cookie here)
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

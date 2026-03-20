import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/comments?billId=123 - Fetch all comments for a bill
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const billId = searchParams.get('billId');
    
    if (!billId) {
      return NextResponse.json(
        { error: 'billId is required' },
        { status: 400 }
      );
    }
    
    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        id,
        comment_text,
        created_at,
        updated_at,
        user_id,
        users!inner(username)
      `)
      .eq('bill_id', billId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching comments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch comments' },
        { status: 500 }
      );
    }
    
    // Format comments with explicit type casting
    const formattedComments = (comments || []).map((comment: any) => {
      const userData = comment.users as { username: string } | null;
      return {
        id: comment.id,
        text: comment.comment_text,
        username: userData?.username || 'Anonymous',
        userId: comment.user_id,
        createdAt: comment.created_at,
        updatedAt: comment.updated_at
      };
    });
    
    return NextResponse.json({ comments: formattedComments });
    
  } catch (error) {
    console.error('Comments fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/comments - Create a new comment
export async function POST(request: NextRequest) {
  try {
    const { userId, billId, text } = await request.json();
    
    if (!userId || !billId || !text) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    if (text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Comment cannot be empty' },
        { status: 400 }
      );
    }
    
    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        user_id: userId,
        bill_id: billId,
        comment_text: text.trim()
      })
      .select(`
        id,
        comment_text,
        created_at,
        updated_at,
        user_id,
        users!inner(username)
      `)
      .single();
    
    if (error) {
      console.error('Comment insert error:', error);
      return NextResponse.json(
        { error: 'Failed to post comment' },
        { status: 500 }
      );
    }
    
    const userData = (comment as any).users as { username: string } | null;
    const formattedComment = {
      id: comment.id,
      text: comment.comment_text,
      username: userData?.username || 'Anonymous',
      userId: comment.user_id,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at
    };
    
    return NextResponse.json({ comment: formattedComment });
    
  } catch (error) {
    console.error('Comment post error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/comments - Update a comment
export async function PUT(request: NextRequest) {
  try {
    const { commentId, userId, text } = await request.json();
    
    if (!commentId || !userId || !text) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    if (text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Comment cannot be empty' },
        { status: 400 }
      );
    }
    
    // Verify user owns the comment
    const { data: existingComment } = await supabase
      .from('comments')
      .select('user_id')
      .eq('id', commentId)
      .single();
    
    if (!existingComment || existingComment.user_id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    const { data: comment, error } = await supabase
      .from('comments')
      .update({
        comment_text: text.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .select(`
        id,
        comment_text,
        created_at,
        updated_at,
        user_id,
        users!inner(username)
      `)
      .single();
    
    if (error) {
      console.error('Comment update error:', error);
      return NextResponse.json(
        { error: 'Failed to update comment' },
        { status: 500 }
      );
    }
    
    const userData = (comment as any).users as { username: string } | null;
    const formattedComment = {
      id: comment.id,
      text: comment.comment_text,
      username: userData?.username || 'Anonymous',
      userId: comment.user_id,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at
    };
    
    return NextResponse.json({ comment: formattedComment });
    
  } catch (error) {
    console.error('Comment update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/comments - Delete a comment
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');
    const userId = searchParams.get('userId');
    
    if (!commentId || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Verify user owns the comment
    const { data: existingComment } = await supabase
      .from('comments')
      .select('user_id')
      .eq('id', commentId)
      .single();
    
    if (!existingComment || existingComment.user_id !== parseInt(userId)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);
    
    if (error) {
      console.error('Comment delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete comment' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Comment delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

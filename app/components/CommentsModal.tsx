'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

type Comment = {
  id: number;
  text: string;
  username: string;
  userId: number;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  billId: number;
  billTitle: string;
};

export default function CommentsModal({ isOpen, onClose, billId, billTitle }: Props) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchComments();
    }
  }, [isOpen, billId]);

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/comments?billId=${billId}`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          billId,
          text: newComment
        })
      });

      if (response.ok) {
        const data = await response.json();
        setComments([data.comment, ...comments]);
        setNewComment('');
      } else {
        setError('Failed to post comment');
      }
    } catch (error) {
      setError('Failed to post comment');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (commentId: number) => {
    if (!user || !editText.trim()) return;

    try {
      const response = await fetch('/api/comments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId,
          userId: user.id,
          text: editText
        })
      });

      if (response.ok) {
        const data = await response.json();
        setComments(comments.map(c => c.id === commentId ? data.comment : c));
        setEditingId(null);
        setEditText('');
      }
    } catch (error) {
      console.error('Error editing comment:', error);
    }
  };

  const handleDelete = async (commentId: number) => {
    if (!user || !confirm('Delete this comment?')) return;

    try {
      const response = await fetch(`/api/comments?commentId=${commentId}&userId=${user.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setComments(comments.filter(c => c.id !== commentId));
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-[#1a1f2e] rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col border border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex justify-between items-start">
          <div className="flex-1 pr-4">
            <h2 className="text-lg font-semibold text-white mb-1">Comments</h2>
            <p className="text-sm text-gray-400 line-clamp-2">{billTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {comments.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No comments yet. {user ? 'Be the first to comment!' : 'Log in to comment.'}
            </p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="bg-gray-800/40 rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white text-sm">{comment.username}</span>
                    <span className="text-xs text-gray-500">
                      {formatTime(comment.createdAt)}
                      {comment.updatedAt !== comment.createdAt && ' (edited)'}
                    </span>
                  </div>
                  {user && user.id === comment.userId && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingId(comment.id);
                          setEditText(comment.text);
                        }}
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {editingId === comment.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm resize-none"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(comment.id)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditText('');
                        }}
                        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-300 text-sm whitespace-pre-wrap">{comment.text}</p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Comment Input */}
        {user ? (
          <div className="p-4 border-t border-gray-800">
            {error && (
              <div className="mb-3 p-2 bg-red-900/20 border border-red-900/50 rounded text-red-400 text-xs">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-3">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 text-sm resize-none focus:outline-none focus:border-blue-500"
                rows={3}
              />
              <button
                type="submit"
                disabled={loading || !newComment.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Posting...' : 'Post Comment'}
              </button>
            </form>
          </div>
        ) : (
          <div className="p-4 border-t border-gray-800 text-center">
            <p className="text-gray-400 text-sm">Log in to leave a comment</p>
          </div>
        )}
      </div>
    </div>
  );
}

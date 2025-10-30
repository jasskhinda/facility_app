'use client';

import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import DashboardLayout from '../../components/DashboardLayout';

export default function MessagingPage() {
  const [loading, setLoading] = useState(true);
  const [conversation, setConversation] = useState(null);
  const [dispatcherInfo, setDispatcherInfo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const messagesEndRef = useRef(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    loadUserAndConversation();
  }, []);

  useEffect(() => {
    if (!conversation) return;

    // Subscribe to new messages
    const messagesSubscription = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new]);
          scrollToBottom();

          if (payload.new.sender_type === 'dispatcher') {
            markMessageAsRead(payload.new.id);
          }
        }
      )
      .subscribe();

    // Subscribe to conversation updates (for dispatcher assignment)
    const conversationSubscription = supabase
      .channel('conversation-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `id=eq.${conversation.id}`
        },
        (payload) => {
          setConversation(payload.new);
          if (payload.new.assigned_dispatcher_id) {
            loadDispatcherInfo(payload.new.assigned_dispatcher_id);
          }
        }
      )
      .subscribe();

    // Load dispatcher info if already assigned
    if (conversation.assigned_dispatcher_id) {
      loadDispatcherInfo(conversation.assigned_dispatcher_id);
    }

    return () => {
      messagesSubscription.unsubscribe();
      conversationSubscription.unsubscribe();
    };
  }, [conversation]);

  const loadUserAndConversation = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUser(user);

      // Get user profile with facility
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*, facilities(*)')
        .eq('id', user.id)
        .single();

      if (!profileData?.facility_id) {
        alert('No facility associated with this account');
        return;
      }
      setProfile(profileData);

      // Get or create conversation
      let { data: existingConv } = await supabase
        .from('conversations')
        .select('*')
        .eq('facility_id', profileData.facility_id)
        .single();

      if (!existingConv) {
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({
            facility_id: profileData.facility_id,
            subject: 'General Support'
          })
          .select()
          .single();
        existingConv = newConv;
      }

      setConversation(existingConv);

      // Load messages
      const { data: messagesData } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', existingConv.id)
        .order('created_at', { ascending: true });

      setMessages(messagesData || []);

      // Mark unread as read
      const unread = messagesData?.filter(m => m.sender_type === 'dispatcher' && !m.read_by_facility);
      if (unread?.length > 0) {
        await supabase
          .from('messages')
          .update({ read_by_facility: true })
          .in('id', unread.map(m => m.id));
      }

      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error loading:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDispatcherInfo = async (dispatcherId) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', dispatcherId)
        .single();
      setDispatcherInfo(data);
    } catch (error) {
      console.error('Error loading dispatcher:', error);
    }
  };

  const markMessageAsRead = async (messageId) => {
    await supabase
      .from('messages')
      .update({ read_by_facility: true })
      .eq('id', messageId);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      await supabase.from('messages').insert({
        conversation_id: conversation.id,
        sender_id: user.id,
        sender_type: 'facility',
        message_text: newMessage.trim(),
        read_by_facility: true,
        read_by_dispatcher: false
      });
      setNewMessage('');
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleResolveConversation = () => {
    if (conversation?.rating) {
      alert('You have already rated this conversation.');
      return;
    }
    setShowRatingModal(true);
  };

  const submitRating = async () => {
    if (selectedRating === 0) {
      alert('Please select a rating');
      return;
    }

    try {
      await supabase
        .from('conversations')
        .update({
          rating: selectedRating,
          feedback: ratingFeedback.trim() || null,
          rated_at: new Date().toISOString(),
          status: 'resolved'
        })
        .eq('id', conversation.id);

      setShowRatingModal(false);
      alert('Thank you for your feedback!');
      loadUserAndConversation();
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to submit rating');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <DashboardLayout user={user} activeTab="messaging">
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} activeTab="messaging">
      <div className="max-w-5xl mx-auto h-[calc(100vh-8rem)]">
        <div className="bg-white rounded-lg shadow-sm border h-full flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-500 to-teal-600 p-4 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Dispatcher Support</h2>
                <p className="text-white text-sm opacity-90">
                  {dispatcherInfo
                    ? `Chatting with ${dispatcherInfo.full_name}`
                    : conversation?.status === 'open'
                    ? 'Waiting for dispatcher to join...'
                    : 'Get help from our dispatch team'
                  }
                </p>
              </div>
              {conversation?.status === 'active' && dispatcherInfo && !conversation?.rating && (
                <button
                  onClick={handleResolveConversation}
                  className="px-4 py-2 bg-white text-teal-600 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Mark as Resolved
                </button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <div className="text-6xl mb-4">💬</div>
                <p className="text-lg font-medium">No messages yet</p>
                <p className="text-sm">Start a conversation with our dispatch team</p>
              </div>
            ) : (
              messages.map(msg => {
                const isFacility = msg.sender_type === 'facility';
                return (
                  <div key={msg.id} className={`flex mb-4 ${isFacility ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                      isFacility
                        ? 'bg-teal-500 text-white rounded-br-sm'
                        : 'bg-white text-gray-900 shadow-sm rounded-bl-sm'
                    }`}>
                      <p className="text-sm leading-relaxed">{msg.message_text}</p>
                      <p className={`text-xs mt-1 ${isFacility ? 'text-teal-100' : 'text-gray-500'}`}>
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          {conversation?.status !== 'resolved' ? (
            <form onSubmit={sendMessage} className="p-4 border-t bg-white rounded-b-lg">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-teal-500"
                  maxLength={500}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="px-6 py-2 bg-teal-500 text-white rounded-full hover:bg-teal-600 disabled:bg-gray-300 transition font-medium"
                >
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-gray-100 border-t p-4 text-center rounded-b-lg">
              <p className="text-sm text-gray-600">
                ✓ This conversation has been resolved
                {conversation.rating && ` • You rated it ${conversation.rating}/5 stars`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-gray-900 text-center mb-2">
              Rate Your Experience
            </h3>
            <p className="text-gray-600 text-center mb-6">
              How satisfied are you with the support you received?
            </p>

            {/* Stars */}
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setSelectedRating(star)}
                  className="text-5xl hover:scale-110 transition"
                >
                  {selectedRating >= star ? '⭐' : '☆'}
                </button>
              ))}
            </div>

            <p className="text-center text-teal-600 font-semibold mb-6 h-6">
              {selectedRating === 1 && 'Poor'}
              {selectedRating === 2 && 'Fair'}
              {selectedRating === 3 && 'Good'}
              {selectedRating === 4 && 'Very Good'}
              {selectedRating === 5 && 'Excellent'}
            </p>

            <textarea
              value={ratingFeedback}
              onChange={(e) => setRatingFeedback(e.target.value)}
              placeholder="Tell us more about your experience (optional)"
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 mb-6"
              rows={4}
              maxLength={500}
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRatingModal(false);
                  setSelectedRating(0);
                  setRatingFeedback('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={submitRating}
                className="flex-1 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 font-medium"
              >
                Submit Rating
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

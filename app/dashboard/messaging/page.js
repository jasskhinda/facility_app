'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';

export default function MessagingPage() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (!conversation) return;

    // Subscribe to new messages
    const channel = supabase
      .channel('messages-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversation.id}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
        // Mark message as read if it's from dispatcher
        if (payload.new.sender_type === 'dispatcher') {
          markMessageAsRead(payload.new.id);
        }
        // Scroll to bottom
        setTimeout(() => {
          const messagesContainer = document.getElementById('messages-container');
          if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          }
        }, 100);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation]);

  const checkUser = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.push('/');
        return;
      }

      setUser(session.user);

      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*, facilities(*)')
        .eq('id', session.user.id)
        .single();

      if (profileError) throw profileError;

      if (profileData.role !== 'facility') {
        router.push('/dashboard');
        return;
      }

      setProfile(profileData);

      // Get or create conversation
      await getOrCreateConversation(profileData.facility_id);

    } catch (error) {
      console.error('Error checking user:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const getOrCreateConversation = async (facilityId) => {
    try {
      // Check if conversation exists
      let { data: existingConv, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('facility_id', facilityId)
        .single();

      if (convError && convError.code !== 'PGRST116') {
        throw convError;
      }

      if (!existingConv) {
        // Create new conversation
        const { data: newConv, error: createError } = await supabase
          .from('conversations')
          .insert({
            facility_id: facilityId,
            subject: 'Facility Support'
          })
          .select()
          .single();

        if (createError) throw createError;
        existingConv = newConv;
      }

      setConversation(existingConv);

      // Load messages
      await loadMessages(existingConv.id);

    } catch (error) {
      console.error('Error getting conversation:', error);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          profiles:sender_id (
            email,
            full_name
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);

      // Mark unread messages as read
      const unreadMessages = data?.filter(m =>
        m.sender_type === 'dispatcher' && !m.read_by_facility
      ) || [];

      for (const msg of unreadMessages) {
        await markMessageAsRead(msg.id);
      }

      // Scroll to bottom after messages load
      setTimeout(() => {
        const messagesContainer = document.getElementById('messages-container');
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }, 100);

    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const markMessageAsRead = async (messageId) => {
    try {
      await supabase
        .from('messages')
        .update({ read_by_facility: true })
        .eq('id', messageId);
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim() || !conversation || sending) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: user.id,
          sender_type: 'facility',
          message_text: newMessage.trim(),
          read_by_facility: true,
          read_by_dispatcher: false
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout user={user} activeTab="messaging">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#7CCFD0]"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} activeTab="messaging">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[calc(100vh-12rem)] flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#7CCFD0] to-[#6AB9BA] p-4 rounded-t-lg">
            <h2 className="text-xl font-bold text-white">Dispatcher Support</h2>
            <p className="text-white text-sm opacity-90">Send messages to our dispatch team</p>
          </div>

          {/* Messages Area */}
          <div
            id="messages-container"
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
          >
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-lg font-medium">No messages yet</p>
                <p className="text-sm">Start a conversation with the dispatch team</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_type === 'facility' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      message.sender_type === 'facility'
                        ? 'bg-[#7CCFD0] text-white'
                        : 'bg-white border border-gray-200 text-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium opacity-75">
                        {message.sender_type === 'facility' ? 'You' : 'Dispatcher'}
                      </span>
                      <span className="text-xs opacity-60">
                        {new Date(message.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap break-words">{message.message_text}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input Area */}
          <form onSubmit={sendMessage} className="p-4 bg-white border-t border-gray-200 rounded-b-lg">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7CCFD0] focus:border-transparent"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="px-6 py-2 bg-[#7CCFD0] text-white rounded-lg font-medium hover:bg-[#6AB9BA] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending...
                  </span>
                ) : (
                  'Send'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}

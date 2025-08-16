'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User, ChatConversation, ChatMessage } from '@/types/database';
import LoadingAnimation from '@/components/ui/LoadingAnimation';
import { Send } from 'lucide-react';

interface ChatConversationViewProps {
  conversation: ChatConversation;
  currentUser: User | null;
  onConversationUpdate: (conversation: ChatConversation) => void;
}

const ChatConversationView: React.FC<ChatConversationViewProps> = ({
  conversation,
  currentUser,
  onConversationUpdate,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (conversation.id) {
      loadMessages();
      markMessagesAsRead();
      
      // Subscribe to new messages for real-time updates
      const subscription = supabase
        .channel(`conversation_${conversation.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `conversation_id=eq.${conversation.id}`
          },
          (payload) => {
            const newMessage = payload.new as ChatMessage;
            
            // Check if this message already exists (to avoid duplicates from optimistic updates)
            setMessages(prev => {
              const exists = prev.some(msg => 
                msg.id === newMessage.id || 
                (msg.message_text === newMessage.message_text && 
                 msg.sender_id === newMessage.sender_id && 
                 Math.abs(new Date(msg.created_at).getTime() - new Date(newMessage.created_at).getTime()) < 5000)
              );
              
              if (exists) return prev;
              return [...prev, newMessage];
            });
            
            scrollToBottom();
            
            // Mark as read if not sent by current user
            if (newMessage.sender_id !== currentUser?.id) {
              markMessagesAsRead();
            }
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [conversation.id, currentUser?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      const { data: messagesData } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:users(*)
        `)
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });

      if (messagesData) {
        setMessages(messagesData);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    if (!currentUser) return;

    try {
      await supabase.rpc('mark_messages_read', {
        conversation_id_param: conversation.id,
        reader_id: currentUser.id
      });

      // Update the conversation unread count locally
      const updatedConversation = { ...conversation };
      if (currentUser.role === 'admin') {
        updatedConversation.admin_unread_count = 0;
      } else {
        updatedConversation.tenant_unread_count = 0;
      }
      onConversationUpdate(updatedConversation);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUser || sending) return;

    try {
      setSending(true);
      const messageText = newMessage.trim();
      setNewMessage(''); // Clear input immediately for better UX

      // Create optimistic message for immediate UI update
      const optimisticMessage: ChatMessage = {
        id: Date.now(), // Temporary ID
        conversation_id: conversation.id,
        sender_id: currentUser.id,
        message_text: messageText,
        is_read: false,
        created_at: new Date().toISOString(),
        sender: currentUser,
      };

      // Add message to UI immediately
      setMessages(prev => [...prev, optimisticMessage]);
      scrollToBottom();

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: currentUser.id,
          message_text: messageText,
        })
        .select('*')
        .single();

      if (error) {
        console.error('Error sending message:', error);
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        setNewMessage(messageText); // Restore message on error
      } else if (data) {
        // Replace optimistic message with real message
        setMessages(prev => 
          prev.map(msg => 
            msg.id === optimisticMessage.id 
              ? { ...data, sender: currentUser } 
              : msg
          )
        );
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(newMessage); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const shouldShowDateHeader = (currentMessage: ChatMessage, previousMessage?: ChatMessage) => {
    if (!previousMessage) return true;
    
    const currentDate = new Date(currentMessage.created_at).toDateString();
    const previousDate = new Date(previousMessage.created_at).toDateString();
    
    return currentDate !== previousDate;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingAnimation 
          size={60} 
          message="" 
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <Send className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-sm">No messages yet</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Start the conversation!</p>
            </div>
          </div>
        ) : (
          messages.map((message, index) => {
            const isCurrentUser = message.sender_id === currentUser?.id;
            const showDateHeader = shouldShowDateHeader(message, messages[index - 1]);

            return (
              <div key={message.id}>
                {/* Date header */}
                {showDateHeader && (
                  <div className="text-center my-3">
                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                      {formatMessageDate(message.created_at)}
                    </span>
                  </div>
                )}

                {/* Message */}
                <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                    isCurrentUser
                      ? 'bg-blue-600 dark:bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap break-words">{message.message_text}</p>
                    <p className={`text-xs mt-1 ${
                      isCurrentUser ? 'text-blue-100 dark:text-blue-200' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {formatMessageTime(message.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <div className="border-t border-gray-200 dark:border-gray-600 p-3 bg-white dark:bg-gray-800">
        <div className="flex items-start space-x-2">
          <div className="flex-1">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              rows={1}
              className="w-full resize-none border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              style={{ minHeight: '40px', maxHeight: '80px' }}
              disabled={sending}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-lg transition-colors ${
              !newMessage.trim() || sending
                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
            }`}
            style={{ height: '40px' }}
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatConversationView;

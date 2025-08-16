'use client';

import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ChatConversation } from '@/types/database';
import { MessageCircle, X } from 'lucide-react';

interface ChatButtonProps {
  onToggleChat: () => void;
  isOpen: boolean;
}

interface ChatButtonRef {
  checkUnreadMessages: () => void;
}

const ChatButton = forwardRef<ChatButtonRef, ChatButtonProps>(({ onToggleChat, isOpen }, ref) => {
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    checkUnreadMessages();
    
    // Subscribe to conversation updates for real-time unread count
    const subscription = supabase
      .channel('chat_conversations_button')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_conversations'
        },
        () => {
          // Add a small delay to prevent rapid re-checks
          setTimeout(() => {
            checkUnreadMessages();
          }, 200);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Expose checkUnreadMessages function to parent component
  useImperativeHandle(ref, () => ({
    checkUnreadMessages
  }));

  const checkUnreadMessages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUnreadCount(0);
        setHasUnreadMessages(false);
        return;
      }

      // Get user role to determine which unread count to check
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!userData) {
        setUnreadCount(0);
        setHasUnreadMessages(false);
        return;
      }

      let query = supabase
        .from('chat_conversations')
        .select('*');

      if (userData.role === 'tenant') {
        // For tenants, check their own conversations
        query = query.eq('tenant_id', user.id);
      }
      // For admins, get all conversations

      const { data: conversations, error } = await query;

      if (error) {
        console.error('Error fetching conversations:', error);
        setUnreadCount(0);
        setHasUnreadMessages(false);
        return;
      }

      let totalUnread = 0;
      if (conversations && conversations.length > 0) {
        conversations.forEach((conv: ChatConversation) => {
          const unreadCount = userData.role === 'tenant' 
            ? (conv.tenant_unread_count || 0)
            : (conv.admin_unread_count || 0);
          totalUnread += unreadCount;
        });
      }

      // Force update state
      setUnreadCount(totalUnread);
      setHasUnreadMessages(totalUnread > 0);
      
      // Double check - if no unread, force hide red dot
      if (totalUnread === 0) {
        setHasUnreadMessages(false);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error checking unread messages:', error);
      setUnreadCount(0);
      setHasUnreadMessages(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={onToggleChat}
        className="relative flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-300 hover:scale-105 mr-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white focus:outline-none"
      >
        {/* Chat Icon */}
        {isOpen ? (
          <X className="w-6 h-6 transition-transform duration-300" />
        ) : (
          <MessageCircle className="w-6 h-6 transition-transform duration-300" />
        )}

        {/* Unread messages indicator */}
        {hasUnreadMessages && unreadCount > 0 && !isOpen && (
          <div className="absolute -top-2 -right-2 flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-500 dark:bg-red-600 rounded-full border-2 border-white dark:border-gray-800">
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}

        {/* Notification pulse animation */}
        {hasUnreadMessages && unreadCount > 0 && !isOpen && (
          <div className="absolute inset-0 rounded-full bg-blue-600 dark:bg-blue-500 animate-ping opacity-20"></div>
        )}
      </button>
    </div>
  );
});

ChatButton.displayName = 'ChatButton';

export default ChatButton;

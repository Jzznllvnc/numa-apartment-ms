'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User, ChatConversation } from '@/types/database';
import TenantList from '@/components/chat/TenantList';
import ChatConversationView from '@/components/chat/ChatConversationView';
import LoadingAnimation from '@/components/ui/LoadingAnimation';
import { MessageCircleMore, ArrowLeft, X, MoreHorizontal } from 'lucide-react';

interface ChatPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onMarkAsRead?: () => void;
}

const ChatPopup: React.FC<ChatPopupProps> = ({ isOpen, onClose, onMarkAsRead }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'loading' | 'tenant-list' | 'conversation'>('loading');
  const [showDropdown, setShowDropdown] = useState(false);
  const [clearing, setClearing] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setView('loading');
      setSelectedConversation(null);
      setShowDropdown(false);
      getCurrentUser();
    } else {
      setShowDropdown(false);
    }
  }, [isOpen]);

  // Close dropdown when view changes
  useEffect(() => {
    setShowDropdown(false);
  }, [view]);

  // Mark messages as read when conversation is selected
  useEffect(() => {
    if (selectedConversation && currentUser) {
      // Mark messages as read when viewing a conversation
      const timer = setTimeout(() => {
        markAllMessagesAsRead();
      }, 1000); // Increased delay for better reliability
      
      return () => clearTimeout(timer);
    }
  }, [selectedConversation?.id, currentUser?.id]);

  const markAllMessagesAsRead = async () => {
    if (!selectedConversation || !currentUser) return;
    
    try {
      const { error } = await supabase.rpc('mark_messages_read', {
        conversation_id_param: selectedConversation.id,
        reader_id: currentUser.id
      });
      
      if (error) {
        console.error('RPC Error:', error);
        return;
      }
      
      // Force trigger conversation updates by updating the conversation record
      // This will trigger the ChatButton subscription
      await supabase
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedConversation.id);
        
      // Update local state
      const updatedConversation = { ...selectedConversation };
      if (currentUser.role === 'admin') {
        updatedConversation.admin_unread_count = 0;
      } else {
        updatedConversation.tenant_unread_count = 0;
      }
      setSelectedConversation(updatedConversation);
      
      // Trigger the callback to update chat button
      if (onMarkAsRead) {
        onMarkAsRead();
      }
      
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userData) {
        setCurrentUser(userData);
        
        if (userData.role === 'admin') {
          // For admin, show tenant list by default
          setView('tenant-list');
        } else {
          // For tenant, automatically get or create conversation with admin
          await getOrCreateTenantConversation(userData.id);
          setView('conversation');
        }
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    } finally {
      setLoading(false);
    }
  };

  const getOrCreateTenantConversation = async (tenantId: string) => {
    try {
      // Try to find existing conversation
      let { data: conversation } = await supabase
        .from('chat_conversations')
        .select(`
          *,
          tenant:users!chat_conversations_tenant_id_fkey(*),
          admin:users!chat_conversations_admin_id_fkey(*)
        `)
        .eq('tenant_id', tenantId)
        .single();

      if (!conversation) {
        // Create new conversation by calling the database function
        const { data: conversationId } = await supabase
          .rpc('get_or_create_conversation', {
            tenant_id_param: tenantId
          });

        if (conversationId) {
          // Fetch the created conversation
          const { data: newConversation } = await supabase
            .from('chat_conversations')
            .select(`
              *,
              tenant:users!chat_conversations_tenant_id_fkey(*),
              admin:users!chat_conversations_admin_id_fkey(*)
            `)
            .eq('id', conversationId)
            .single();

          conversation = newConversation;
        }
      }

      if (conversation) {
        setSelectedConversation(conversation);
      }
    } catch (error) {
      console.error('Error getting/creating tenant conversation:', error);
    }
  };

  const handleSelectConversation = (conversation: ChatConversation) => {
    setSelectedConversation(conversation);
    setView('conversation');
  };

  const handleBackToList = () => {
    // Mark messages as read before going back
    if (selectedConversation && currentUser) {
      markAllMessagesAsRead();
    }
    
    // Clear conversation and go back to tenant list
    setSelectedConversation(null);
    setView('tenant-list');
  };

  const clearChat = async () => {
    if (!selectedConversation || !currentUser || clearing) return;

    try {
      setClearing(true);
      setShowDropdown(false);

      // Clear messages using the database function
      const { error } = await supabase.rpc('clear_conversation_messages', {
        conversation_id_param: selectedConversation.id
      });

      if (error) {
        console.error('Error clearing chat messages:', error);
        return;
      }

      // Update local conversation state
      const updatedConversation = {
        ...selectedConversation,
        tenant_unread_count: 0,
        admin_unread_count: 0,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setSelectedConversation(updatedConversation);

      // Trigger the callback to update chat button
      if (onMarkAsRead) {
        onMarkAsRead();
      }

    } catch (error) {
      console.error('Error clearing chat:', error);
    } finally {
      setClearing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 right-6 z-40">
      <div className="w-96 h-[32rem] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {view === 'conversation' && currentUser?.role === 'admin' && (
              <button
                onClick={handleBackToList}
                className="hover:bg-blue-700 dark:hover:bg-blue-600 p-1 rounded transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <MessageCircleMore className="w-5 h-5" />
            <h3 className="font-medium text-white">
              {loading
                ? 'Loading...'
                : view === 'conversation' && selectedConversation
                ? currentUser?.role === 'admin'
                  ? selectedConversation.tenant?.full_name || 'Tenant'
                  : 'Chat with Owner'
                : currentUser?.role === 'admin'
                ? 'Messages'
                : 'Chat with Tenant'
              }
            </h3>
          </div>
          <div className="flex items-center space-x-1 relative">
            {view === 'conversation' && selectedConversation && (
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="hover:bg-blue-700 dark:hover:bg-blue-600 p-1 rounded transition-colors"
                  disabled={clearing}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                
                {showDropdown && (
                  <>
                    {/* Backdrop to close dropdown */}
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowDropdown(false)}
                    />
                    
                    {/* Dropdown menu */}
                    <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-700 rounded-md shadow-lg border border-gray-200 dark:border-gray-600 z-20 min-w-[120px]">
                      <button
                        onClick={clearChat}
                        disabled={clearing}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {clearing ? 'Clearing...' : 'Clear chat'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
            <button
              onClick={onClose}
              className="hover:bg-blue-700 dark:hover:bg-blue-600 p-1 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-h-0">
          {view === 'loading' ? (
            <div className="flex-1 flex items-center justify-center">
              <LoadingAnimation 
                size={60} 
                message="" 
              />
            </div>
          ) : view === 'conversation' && selectedConversation ? (
            <ChatConversationView
              conversation={selectedConversation}
              currentUser={currentUser}
              onConversationUpdate={setSelectedConversation}
            />
          ) : view === 'tenant-list' && currentUser?.role === 'admin' ? (
            <TenantList
              onSelectConversation={handleSelectConversation}
              currentUser={currentUser}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-4 text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <MessageCircleMore className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm">Loading chat...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPopup;

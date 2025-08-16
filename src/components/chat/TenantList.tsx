'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User, ChatConversation } from '@/types/database';
import { Users } from 'lucide-react';

interface TenantListProps {
  onSelectConversation: (conversation: ChatConversation) => void;
  currentUser: User | null;
}

const TenantList: React.FC<TenantListProps> = ({ onSelectConversation, currentUser }) => {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [tenants, setTenants] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantAvatars, setTenantAvatars] = useState<Record<string, string>>({});
  const supabase = createClient();

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      loadTenantsAndConversations();
    }
  }, [currentUser]);

  useEffect(() => {
    // Subscribe to conversation updates for real-time updates
    const subscription = supabase
      .channel('admin_chat_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_conversations'
        },
        () => {
          loadTenantsAndConversations();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadTenantAvatars = async (tenants: User[]) => {
    const avatarPromises = tenants.map(async (tenant) => {
      if (tenant.avatar_url) {
        try {
          const { data, error } = await supabase.storage
            .from('avatars')
            .createSignedUrl(tenant.avatar_url, 3600); // 1 hour expiry
          
          if (error) throw error;
          return { id: tenant.id, url: data.signedUrl };
        } catch (err) {
          console.error(`Error loading avatar for tenant ${tenant.id}:`, err);
          return { id: tenant.id, url: null };
        }
      }
      return { id: tenant.id, url: null };
    });

    const avatarResults = await Promise.all(avatarPromises);
    const avatarMap: Record<string, string> = {};
    
    avatarResults.forEach(({ id, url }) => {
      if (url) {
        avatarMap[id] = url;
      }
    });

    setTenantAvatars(avatarMap);
  };

  const loadTenantsAndConversations = async () => {
    try {
      setLoading(true);

      // Get all tenants
      const { data: allTenants } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'tenant')
        .order('full_name');

      // Get all conversations with tenant and latest message info
      const { data: allConversations } = await supabase
        .from('chat_conversations')
        .select(`
          *,
          tenant:users!chat_conversations_tenant_id_fkey(*),
          admin:users!chat_conversations_admin_id_fkey(*)
        `)
        .order('last_message_at', { ascending: false });

      if (allTenants) {
        setTenants(allTenants);
        // Load avatars for all tenants
        await loadTenantAvatars(allTenants);
      }

      if (allConversations) {
        setConversations(allConversations);
      }
    } catch (error) {
      console.error('Error loading tenants and conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNewConversation = async (tenant: User) => {
    try {
      // Create new conversation using the database function
      const { data: conversationId } = await supabase
        .rpc('get_or_create_conversation', {
          tenant_id_param: tenant.id,
          admin_id_param: currentUser?.id
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

        if (newConversation) {
          onSelectConversation(newConversation);
        }
      }
    } catch (error) {
      console.error('Error creating new conversation:', error);
    }
  };

  const formatLastMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const getTenantConversation = (tenantId: string) => {
    return conversations.find(conv => conv.tenant_id === tenantId);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  if (tenants.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <Users className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
          <p className="text-sm">No tenants found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-3 border-b border-gray-200 dark:border-gray-600">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Tenants</h4>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {tenants.map((tenant) => {
          const conversation = getTenantConversation(tenant.id);
          const hasUnreadMessages = conversation && conversation.admin_unread_count > 0;

          return (
            <div
              key={tenant.id}
              onClick={() => {
                if (conversation) {
                  onSelectConversation(conversation);
                } else {
                  createNewConversation(tenant);
                }
              }}
              className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-600 transition-colors"
            >
              {/* Avatar */}
              <div className="flex-shrink-0 mr-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center overflow-hidden">
                  {tenantAvatars[tenant.id] ? (
                    <img
                      src={tenantAvatars[tenant.id]}
                      alt={tenant.full_name || 'Tenant'}
                      className="w-10 h-10 rounded-full object-cover"
                      onError={(e) => {
                        // Hide broken image and show initials instead
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-blue-600 dark:text-blue-300 font-medium text-sm">
                      {(tenant.full_name || 'T')[0].toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {tenant.full_name || 'Unnamed Tenant'}
                  </p>
                  {conversation && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                      {formatLastMessageTime(conversation.last_message_at)}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {conversation ? 'Tap to view conversation' : 'Tap to start conversation'}
                  </p>
                  
                  {/* Unread badge */}
                  {hasUnreadMessages && (
                    <span className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 dark:bg-red-600 rounded-full">
                      {conversation.admin_unread_count > 99 ? '99+' : conversation.admin_unread_count}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TenantList;

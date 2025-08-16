-- Chat System Database Schema
-- Creates tables for real-time messaging between admin and tenants

-- 1. Chat Conversations Table
-- Tracks conversations between admin and tenants
CREATE TABLE chat_conversations (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    tenant_unread_count INT DEFAULT 0,
    admin_unread_count INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comment on Chat Conversations Table
COMMENT ON TABLE chat_conversations IS 'Tracks chat conversations between admin and tenants with unread counts.';

-- 2. Chat Messages Table
-- Stores individual messages in conversations
CREATE TABLE chat_messages (
    id SERIAL PRIMARY KEY,
    conversation_id INT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comment on Chat Messages Table
COMMENT ON TABLE chat_messages IS 'Stores individual chat messages within conversations.';

-- 3. Indexes for better performance
CREATE INDEX idx_chat_conversations_tenant_id ON chat_conversations(tenant_id);
CREATE INDEX idx_chat_conversations_admin_id ON chat_conversations(admin_id);
CREATE INDEX idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- 4. Enable RLS for chat tables
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for Chat Conversations
-- Tenants can view their own conversations
CREATE POLICY "Tenants can view their own conversations" 
ON chat_conversations FOR SELECT 
USING (auth.uid() = tenant_id);

-- Admins can view all conversations
CREATE POLICY "Admins can view all conversations" 
ON chat_conversations FOR SELECT 
TO authenticated 
USING (public.get_user_role(auth.uid()) = 'admin');

-- Tenants can update their own conversations (for unread counts)
CREATE POLICY "Tenants can update their own conversations" 
ON chat_conversations FOR UPDATE 
USING (auth.uid() = tenant_id);

-- Admins can manage all conversations
CREATE POLICY "Admins can manage all conversations" 
ON chat_conversations FOR ALL 
USING (public.get_user_role(auth.uid()) = 'admin');

-- Auto-create conversations when tenant sends first message
CREATE POLICY "Auto-create conversations for tenants" 
ON chat_conversations FOR INSERT 
WITH CHECK (auth.uid() = tenant_id);

-- 6. RLS Policies for Chat Messages
-- Users can view messages in their own conversations
CREATE POLICY "Users can view messages in their conversations" 
ON chat_messages FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM chat_conversations 
        WHERE id = chat_messages.conversation_id 
        AND (tenant_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin')
    )
);

-- Users can send messages in their own conversations
CREATE POLICY "Users can send messages in their conversations" 
ON chat_messages FOR INSERT 
WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
        SELECT 1 FROM chat_conversations 
        WHERE id = chat_messages.conversation_id 
        AND (tenant_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin')
    )
);

-- Users can update messages they sent (for read status)
CREATE POLICY "Users can update their own messages" 
ON chat_messages FOR UPDATE 
USING (auth.uid() = sender_id);

-- 7. Function to update conversation when new message is sent
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
DECLARE
    sender_role user_role;
BEGIN
    -- Get sender role
    SELECT role INTO sender_role FROM users WHERE id = NEW.sender_id;
    
    -- Update conversation timestamp and unread counts
    IF sender_role = 'admin' THEN
        -- Admin sent message, increment tenant unread count
        UPDATE chat_conversations 
        SET 
            last_message_at = NEW.created_at,
            tenant_unread_count = tenant_unread_count + 1,
            updated_at = NOW()
        WHERE id = NEW.conversation_id;
    ELSE
        -- Tenant sent message, increment admin unread count
        UPDATE chat_conversations 
        SET 
            last_message_at = NEW.created_at,
            admin_unread_count = admin_unread_count + 1,
            updated_at = NOW()
        WHERE id = NEW.conversation_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Trigger to update conversation on new message
CREATE TRIGGER on_chat_message_created
    AFTER INSERT ON chat_messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();

-- 9. Function to mark messages as read and update unread counts
CREATE OR REPLACE FUNCTION mark_messages_read(
    conversation_id_param INT,
    reader_id UUID
)
RETURNS VOID AS $$
DECLARE
    reader_role user_role;
BEGIN
    -- Get reader role
    SELECT role INTO reader_role FROM users WHERE id = reader_id;
    
    -- Mark messages as read (messages not sent by the reader)
    UPDATE chat_messages 
    SET is_read = TRUE 
    WHERE conversation_id = conversation_id_param 
    AND sender_id != reader_id 
    AND is_read = FALSE;
    
    -- Reset unread count for the reader
    IF reader_role = 'admin' THEN
        UPDATE chat_conversations 
        SET admin_unread_count = 0 
        WHERE id = conversation_id_param;
    ELSE
        UPDATE chat_conversations 
        SET tenant_unread_count = 0 
        WHERE id = conversation_id_param;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Function to get or create conversation between admin and tenant
CREATE OR REPLACE FUNCTION get_or_create_conversation(
    tenant_id_param UUID,
    admin_id_param UUID DEFAULT NULL
)
RETURNS INT AS $$
DECLARE
    conversation_id INT;
    default_admin_id UUID;
BEGIN
    -- If no admin_id provided, get the first admin user
    IF admin_id_param IS NULL THEN
        SELECT id INTO default_admin_id 
        FROM users 
        WHERE role = 'admin' 
        LIMIT 1;
        admin_id_param := default_admin_id;
    END IF;
    
    -- Try to find existing conversation
    SELECT id INTO conversation_id 
    FROM chat_conversations 
    WHERE tenant_id = tenant_id_param;
    
    -- If no conversation exists, create one
    IF conversation_id IS NULL THEN
        INSERT INTO chat_conversations (tenant_id, admin_id)
        VALUES (tenant_id_param, admin_id_param)
        RETURNING id INTO conversation_id;
    END IF;
    
    RETURN conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

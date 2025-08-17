-- Clear Chat Function and Policies
-- Adds functionality to clear all messages in a conversation safely

-- 1. Add DELETE policy for chat messages
-- Allow users to delete messages in conversations they have access to
CREATE POLICY "Users can delete messages in their conversations" 
ON chat_messages FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM chat_conversations 
        WHERE id = chat_messages.conversation_id 
        AND (tenant_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin')
    )
);

-- 2. Function to clear all messages in a conversation
CREATE OR REPLACE FUNCTION clear_conversation_messages(
    conversation_id_param INT
)
RETURNS VOID AS $$
DECLARE
    user_role user_role;
    conversation_exists BOOLEAN;
    user_has_access BOOLEAN;
BEGIN
    -- Get current user role
    SELECT role INTO user_role FROM users WHERE id = auth.uid();
    
    -- Check if conversation exists
    SELECT EXISTS(
        SELECT 1 FROM chat_conversations 
        WHERE id = conversation_id_param
    ) INTO conversation_exists;
    
    IF NOT conversation_exists THEN
        RAISE EXCEPTION 'Conversation not found';
    END IF;
    
    -- Check if user has access to this conversation
    IF user_role = 'admin' THEN
        -- Admins can clear any conversation
        user_has_access := TRUE;
    ELSE
        -- Tenants can only clear their own conversations
        SELECT EXISTS(
            SELECT 1 FROM chat_conversations 
            WHERE id = conversation_id_param 
            AND tenant_id = auth.uid()
        ) INTO user_has_access;
    END IF;
    
    IF NOT user_has_access THEN
        RAISE EXCEPTION 'Access denied: You do not have permission to clear this conversation';
    END IF;
    
    -- Delete all messages in the conversation
    DELETE FROM chat_messages 
    WHERE conversation_id = conversation_id_param;
    
    -- Reset unread counts and update timestamp
    UPDATE chat_conversations 
    SET 
        tenant_unread_count = 0,
        admin_unread_count = 0,
        last_message_at = NOW(),
        updated_at = NOW()
    WHERE id = conversation_id_param;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION clear_conversation_messages(INT) TO authenticated;

-- Comment on the function
COMMENT ON FUNCTION clear_conversation_messages(INT) IS 'Clears all messages in a conversation. Admins can clear any conversation, tenants can only clear their own.';

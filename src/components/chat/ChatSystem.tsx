'use client';

import React, { useState, useRef } from 'react';
import ChatButton from '@/components/chat/ChatButton';
import ChatPopup from '@/components/chat/ChatPopup';

const ChatSystem: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const chatButtonRef = useRef<{ checkUnreadMessages: () => void }>(null);

  const handleToggleChat = () => {
    setIsOpen(!isOpen);
  };

  const handleCloseChat = () => {
    setIsOpen(false);
    // Trigger immediate check for unread messages when closing
    setTimeout(() => {
      chatButtonRef.current?.checkUnreadMessages();
    }, 500);
  };

  const handleMarkAsRead = () => {
    chatButtonRef.current?.checkUnreadMessages();
  };

  return (
    <>
      <ChatButton ref={chatButtonRef} onToggleChat={handleToggleChat} isOpen={isOpen} />
      {isOpen && <ChatPopup isOpen={isOpen} onClose={handleCloseChat} onMarkAsRead={handleMarkAsRead} />}
    </>
  );
};

export default ChatSystem;

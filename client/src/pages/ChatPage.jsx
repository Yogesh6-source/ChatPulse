import React, { useState } from 'react';
import { Sidebar } from '../components/chat/Sidebar';
import { ChatPanel } from '../components/chat/ChatPanel';
import { EmptyState } from '../components/chat/EmptyState';
import { UserSearchModal } from '../components/chat/UserSearchModal';
import { ProfileModal } from '../components/chat/ProfileModal';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';

export const ChatPage = () => {
  const { user } = useAuth();
  const {
    conversations,
    activeConversation,
    setActiveConversation,
    messages,
    loadingConversations,
    loadingMessages,
    onlineUsers,
    typingUsers,
    sendMessage,
    deleteMessage,
    emitTyping,
    openConversationWithUser,
  } = useChat();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <div className="fixed inset-0 h-[100dvh] w-full flex bg-gray-100 dark:bg-gray-950 overflow-hidden select-none">
      {/* Search Users Modal */}
      <UserSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectUser={openConversationWithUser}
        onlineUsers={onlineUsers}
      />

      {/* Edit Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      {/* Main Container */}
      <div className="w-full h-full flex overflow-hidden relative">
        {/* Left Sidebar */}
        <div
          className={`${
            activeConversation ? 'hidden md:flex' : 'flex'
          } w-full md:w-80 lg:w-96 flex-shrink-0 h-full`}
        >
          <Sidebar
            conversations={conversations}
            activeConversation={activeConversation}
            onlineUsers={onlineUsers}
            loading={loadingConversations}
            onSelectConversation={setActiveConversation}
            onOpenSearch={() => setIsSearchOpen(true)}
            onOpenProfile={() => setIsProfileOpen(true)}
          />
        </div>

        {/* Right Chat Panel or Empty State */}
        <div
          className={`${
            activeConversation ? 'flex' : 'hidden md:flex'
          } w-full md:w-auto flex-1 h-full overflow-hidden`}
        >
          {activeConversation ? (
            <ChatPanel
              conversation={activeConversation}
              messages={messages}
              currentUserId={user?._id}
              onlineUsers={onlineUsers}
              typingUsers={typingUsers}
              loadingMessages={loadingMessages}
              onBack={() => setActiveConversation(null)}
              onSendMessage={sendMessage}
              onDeleteMessage={deleteMessage}
              onTyping={emitTyping}
            />
          ) : (
            <EmptyState onOpenSearch={() => setIsSearchOpen(true)} />
          )}
        </div>
      </div>
    </div>
  );
};

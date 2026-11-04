import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import { useAuth } from './AuthContext';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState({}); // { [conversationId]: { [userId]: userObject } }
  const [hasMoreMessages, setHasMoreMessages] = useState(false);

  const activeConvRef = useRef(activeConversation);
  useEffect(() => {
    activeConvRef.current = activeConversation;
  }, [activeConversation]);

  // Load conversations
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingConversations(true);
      const res = await api.get('/conversations');
      if (res.data.success) {
        setConversations(res.data.conversations);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchConversations();
    } else {
      setConversations([]);
      setActiveConversation(null);
      setMessages([]);
    }
  }, [user, fetchConversations]);

  // Load messages when active conversation changes
  const fetchMessages = useCallback(async (conversationId) => {
    if (!conversationId) return;
    try {
      setLoadingMessages(true);
      const res = await api.get(`/messages/${conversationId}?limit=50`);
      if (res.data.success) {
        setMessages(res.data.messages);
        setHasMoreMessages(res.data.hasMore);

        // Mark unread as read in UI & backend
        setConversations((prev) =>
          prev.map((c) => (c._id === conversationId ? { ...c, unreadCount: 0 } : c))
        );

        const socket = getSocket();
        if (socket && socket.connected) {
          socket.emit('mark_read', { conversationId });
        }
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // When active conversation changes, join socket room and fetch messages
  useEffect(() => {
    if (!activeConversation) {
      setMessages([]);
      return;
    }

    const socket = getSocket();

    const joinRoom = () => {
      if (socket && socket.connected) {
        socket.emit('join_conversation', { conversationId: activeConversation._id });
      }
    };

    // Join now if already connected, also re-join on reconnect
    joinRoom();
    socket?.on('connect', joinRoom);

    fetchMessages(activeConversation._id);

    return () => {
      socket?.off('connect', joinRoom);
      if (socket && socket.connected) {
        socket.emit('leave_conversation', { conversationId: activeConversation._id });
      }
    };
  }, [activeConversation, fetchMessages]);

  // Socket event listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user) return;

    // Online users list initial
    const handleInitialOnlineUsers = (userIds) => {
      setOnlineUsers(new Set(userIds));
    };

    // User came online
    const handleUserOnline = ({ userId }) => {
      setOnlineUsers((prev) => new Set([...prev, userId]));
      setConversations((prev) =>
        prev.map((c) => ({
          ...c,
          participants: c.participants.map((p) =>
            p._id === userId ? { ...p, isOnline: true } : p
          ),
        }))
      );
    };

    // User went offline
    const handleUserOffline = ({ userId, lastSeen }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      setConversations((prev) =>
        prev.map((c) => ({
          ...c,
          participants: c.participants.map((p) =>
            p._id === userId ? { ...p, isOnline: false, lastSeen } : p
          ),
        }))
      );
    };

    // Receive message (from conversation room — sender + receiver both in room)
    const handleReceiveMessage = (incomingMsg) => {
      const isForCurrent =
        activeConvRef.current && activeConvRef.current._id === incomingMsg.conversationId;

      if (isForCurrent) {
        setMessages((prev) => {
          // Replace optimistic message if tempId matches
          if (incomingMsg.tempId) {
            const index = prev.findIndex((m) => m._id === incomingMsg.tempId);
            if (index !== -1) {
              const updated = [...prev];
              updated[index] = incomingMsg;
              return updated;
            }
          }
          // Avoid duplicates
          if (prev.some((m) => m._id === incomingMsg._id)) return prev;
          return [...prev, incomingMsg];
        });

        // Mark as read immediately if received while in conversation
        if (incomingMsg.sender._id !== user._id) {
          socket.emit('mark_read', { conversationId: incomingMsg.conversationId });
        }
      }

      // Update sidebar conversation item & unread count
      setConversations((prev) => {
        const exists = prev.some((c) => c._id === incomingMsg.conversationId);
        if (!exists) {
          fetchConversations();
          return prev;
        }
        return prev
          .map((c) => {
            if (c._id === incomingMsg.conversationId) {
              const shouldIncrement = !isForCurrent && incomingMsg.sender._id !== user._id;
              return {
                ...c,
                lastMessage: incomingMsg,
                lastMessageAt: incomingMsg.createdAt,
                unreadCount: shouldIncrement ? (c.unreadCount || 0) + 1 : 0,
              };
            }
            return c;
          })
          .sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
      });
    };

    // New message notification pushed to user's personal room (receiver not in convo room)
    const handleNewMessageNotification = ({ conversationId, message: incomingMsg }) => {
      const isForCurrent =
        activeConvRef.current && activeConvRef.current._id === conversationId;
      if (isForCurrent) return; // already handled by receive_message in convo room

      setConversations((prev) => {
        const exists = prev.some((c) => c._id === conversationId);
        if (!exists) {
          fetchConversations();
          return prev;
        }
        return prev
          .map((c) => {
            if (c._id === conversationId) {
              return {
                ...c,
                lastMessage: incomingMsg,
                lastMessageAt: incomingMsg.createdAt,
                unreadCount: (c.unreadCount || 0) + 1,
              };
            }
            return c;
          })
          .sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
      });
    };

    // A new conversation was created (other user started it, or we started it on another tab)
    const handleNewConversation = (conv) => {
      setConversations((prev) => {
        if (prev.some((c) => c._id === conv._id)) return prev;
        return [conv, ...prev];
      });
    };

    // Typing events
    const handleUserTyping = ({ conversationId, userId: typingId, fullName, username }) => {
      if (typingId === user._id) return;
      setTypingUsers((prev) => ({
        ...prev,
        [conversationId]: {
          ...(prev[conversationId] || {}),
          [typingId]: { fullName, username },
        },
      }));
    };

    const handleUserStopTyping = ({ conversationId, userId: typingId }) => {
      setTypingUsers((prev) => {
        const currentConvTypers = { ...(prev[conversationId] || {}) };
        delete currentConvTypers[typingId];
        return { ...prev, [conversationId]: currentConvTypers };
      });
    };

    // Read receipt
    const handleMessagesReadReceipt = ({ conversationId, readBy }) => {
      if (readBy !== user._id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.conversationId === conversationId && m.sender._id === user._id
              ? { ...m, status: 'read' }
              : m
          )
        );
      }
    };

    // Message delivered status
    const handleMessageDelivered = ({ messageId, conversationId }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId || (m.conversationId === conversationId && m.status === 'sent')
            ? { ...m, status: 'delivered' }
            : m
        )
      );
    };

    // Message deleted
    const handleMessageDeleted = ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId
            ? {
                ...m,
                deletedForEveryone: true,
                content: 'This message was deleted',
                fileUrl: null,
                fileName: null,
              }
            : m
        )
      );
    };

    const registerListeners = () => {
      socket.on('get_online_users', handleInitialOnlineUsers);
      socket.on('user_online', handleUserOnline);
      socket.on('user_offline', handleUserOffline);
      socket.on('receive_message', handleReceiveMessage);
      socket.on('new_message_notification', handleNewMessageNotification);
      socket.on('new_conversation', handleNewConversation);
      socket.on('user_typing', handleUserTyping);
      socket.on('user_stop_typing', handleUserStopTyping);
      socket.on('messages_read_receipt', handleMessagesReadReceipt);
      socket.on('message_delivered', handleMessageDelivered);
      socket.on('message_deleted', handleMessageDeleted);
    };

    const unregisterListeners = () => {
      socket.off('get_online_users', handleInitialOnlineUsers);
      socket.off('user_online', handleUserOnline);
      socket.off('user_offline', handleUserOffline);
      socket.off('receive_message', handleReceiveMessage);
      socket.off('new_message_notification', handleNewMessageNotification);
      socket.off('new_conversation', handleNewConversation);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stop_typing', handleUserStopTyping);
      socket.off('messages_read_receipt', handleMessagesReadReceipt);
      socket.off('message_delivered', handleMessageDelivered);
      socket.off('message_deleted', handleMessageDeleted);
    };

    // Register immediately (socket may already be connected)
    registerListeners();

    // Re-register on reconnect to fix stale closure / missed events after disconnect
    socket.on('connect', () => {
      unregisterListeners();
      registerListeners();
      // Re-fetch conversations on reconnect to sync any missed updates
      fetchConversations();
    });

    return () => {
      unregisterListeners();
      socket.off('connect');
    };
  }, [user, fetchConversations]);

  // Send message function (optimistic for text via socket, or multipart for attachments via REST)
  const sendMessage = async ({ content, file = null, messageType = 'text' }) => {
    if (!activeConversation) return;

    const socket = getSocket();

    // If sending file attachment, use REST endpoint
    if (file) {
      const formData = new FormData();
      formData.append('conversationId', activeConversation._id);
      if (content) formData.append('content', content);
      formData.append('attachment', file);
      formData.append('messageType', file.type.startsWith('image/') ? 'image' : 'file');

      const res = await api.post('/messages', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        return res.data.message;
      }
      throw new Error(res.data.message || 'Failed to upload attachment');
    }

    // Text message via Socket.IO
    if (!content.trim()) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      _id: tempId,
      conversationId: activeConversation._id,
      sender: user,
      content: content.trim(),
      messageType: 'text',
      status: 'sent',
      createdAt: new Date().toISOString(),
      optimistic: true,
    };

    // Add optimistic message to list
    setMessages((prev) => [...prev, optimisticMessage]);

    if (socket && socket.connected) {
      socket.emit('send_message', {
        conversationId: activeConversation._id,
        content: content.trim(),
        messageType: 'text',
        tempId,
      });
    } else {
      // Fallback to REST API if socket temporarily disconnected
      const res = await api.post('/messages', {
        conversationId: activeConversation._id,
        content: content.trim(),
        messageType: 'text',
      });
      if (res.data.success) {
        setMessages((prev) =>
          prev.map((m) => (m._id === tempId ? res.data.message : m))
        );
      }
    }
  };

  // Delete message
  const deleteMessage = async (messageId) => {
    try {
      const res = await api.delete(`/messages/${messageId}`);
      if (res.data.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === messageId
              ? {
                  ...m,
                  deletedForEveryone: true,
                  content: 'This message was deleted',
                  fileUrl: null,
                }
              : m
          )
        );
      }
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Failed to delete message');
    }
  };

  // Emit typing indicator
  const emitTyping = (isTyping) => {
    if (!activeConversation) return;
    const socket = getSocket();
    if (!socket || !socket.connected) return;

    if (isTyping) {
      socket.emit('typing', { conversationId: activeConversation._id });
    } else {
      socket.emit('stop_typing', { conversationId: activeConversation._id });
    }
  };

  // Start or open conversation with another user
  const openConversationWithUser = async (otherUserId) => {
    try {
      const res = await api.post('/conversations', { participantId: otherUserId });
      if (res.data.success) {
        const conv = res.data.conversation;
        setConversations((prev) => {
          const index = prev.findIndex((c) => c._id === conv._id);
          if (index !== -1) {
            const updated = [...prev];
            updated[index] = conv;
            return updated;
          }
          return [conv, ...prev];
        });
        setActiveConversation(conv);
        return conv;
      }
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Could not start conversation');
    }
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversation,
        setActiveConversation,
        messages,
        loadingConversations,
        loadingMessages,
        onlineUsers,
        typingUsers,
        hasMoreMessages,
        sendMessage,
        deleteMessage,
        emitTyping,
        openConversationWithUser,
        fetchConversations,
        fetchMessages,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within ChatProvider');
  return context;
};

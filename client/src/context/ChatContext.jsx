import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  createConversation,
  deleteConversationMessage,
  listenConversations,
  listenMessages,
  listenUsersPresence,
  listenTyping,
  listenUserProfile,
  sendConversationMessage,
  setTyping,
  toggleMessageReaction,
} from '../services/firebaseData';
import { setupForegroundNotifications } from '../services/firebaseNotifications';
import { useAuth } from './AuthContext';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [conversationRecords, setConversationRecords] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [presence, setPresence] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const typingHeartbeatRef = useRef(null);

  const conversations = useMemo(
    () =>
      conversationRecords.map((conversation) => ({
        ...conversation,
        participants: conversation.participants
          .map((participantId) => {
            const profile =
              participantId === user?._id ? user : profiles[participantId];
            const status = presence[participantId];
            return profile
              ? {
                  ...profile,
                  isOnline: Boolean(status?.isOnline),
                  lastSeen: status?.lastSeen || profile.lastSeen,
                }
              : { _id: participantId, fullName: 'Loading...', username: '' };
          })
          .filter(Boolean),
      })),
    [conversationRecords, presence, profiles, user]
  );

  const activeConversation =
    conversations.find((conversation) => conversation._id === activeConversationId) || null;

  // Listen for browser popstate (e.g. mobile back gesture or back button)
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const convId = urlParams.get('c');
      setActiveConversationId(convId || null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!user) {
      setConversationRecords([]);
      setProfiles({});
      setActiveConversationId(null);
      setMessages([]);
      setOnlineUsers(new Set());
      setPresence({});
      setTypingUsers({});
      setLoadingConversations(false);
      return undefined;
    }

    setLoadingConversations(true);
    const unsubscribeConversations = listenConversations(
      user._id,
      (records) => {
        setConversationRecords(records);
        setLoadingConversations(false);
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const convId = urlParams.get('c');
          if (convId && records.some((r) => r._id === convId)) {
            setActiveConversationId((prev) => prev || convId);
          }
        }
      },
      (error) => {
        console.error('Failed to listen for Firebase conversations:', error);
        setLoadingConversations(false);
      }
    );

    return () => {
      unsubscribeConversations();
    };
  }, [user]);

  // Handle incoming foreground notifications
  useEffect(() => {
    if (!user) return undefined;
    let unsub = () => {};
    setupForegroundNotifications((payload) => {
      const title = payload.notification?.title || payload.data?.title || 'New Message';
      const body = payload.notification?.body || payload.data?.body || '';
      if (document.hidden && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          new Notification(title, {
            body,
            icon: '/pwa-192x192.png',
            tag: payload.data?.conversationId ? `conv_${payload.data.conversationId}` : 'chatpulse',
          });
        } catch (e) {
          console.error('Foreground notification error:', e);
        }
      }
    }).then((cleanup) => {
      unsub = cleanup;
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;
    const participantIds = new Set(
      conversationRecords.flatMap((conversation) => conversation.participants)
    );
    participantIds.delete(user._id);
    const otherUids = [...participantIds];

    // Listen to profiles for all conversation participants
    const profileUnsubs = otherUids.map((uid) =>
      listenUserProfile(
        uid,
        (profile) => {
          if (profile) {
            setProfiles((current) => ({ ...current, [uid]: profile }));
          }
        },
        (error) => console.error(`Failed to listen for Firebase profile ${uid}:`, error)
      )
    );

    // Subscribe to presence for ONLY the users we actually chat with.
    // Much lighter than listening to the entire /status tree.
    const unsubscribePresence = listenUsersPresence(
      otherUids,
      (statuses) => {
        setPresence((prev) => {
          const merged = { ...prev, ...statuses };
          return merged;
        });
        setOnlineUsers(
          new Set(
            Object.entries(statuses)
              .filter(([, status]) => status?.isOnline)
              .map(([uid]) => uid)
          )
        );
      },
      (error) => console.error('Failed to listen for Firebase presence:', error)
    );

    return () => {
      profileUnsubs.forEach((unsub) => unsub());
      unsubscribePresence();
    };
  }, [conversationRecords, user]);

  useEffect(() => {
    if (!activeConversation || !user) {
      setMessages([]);
      setLoadingMessages(false);
      return undefined;
    }

    setLoadingMessages(true);
    const unsubscribe = listenMessages(
      activeConversation._id,
      user._id,
      (nextMessages, hasMore) => {
        // Replace optimistic messages with real server messages
        setMessages((prev) => {
          const hasOptimistic = prev.some((m) => m.isOptimistic);
          if (!hasOptimistic) return nextMessages;
          // Keep optimistic messages that haven't arrived from server yet
          const serverIds = new Set(nextMessages.map((m) => m._id));
          const stillPending = prev.filter((m) => m.isOptimistic && !serverIds.has(m._id));
          return [...nextMessages, ...stillPending];
        });
        setHasMoreMessages(hasMore);
        setLoadingMessages(false);
      },
      (error) => {
        console.error('Failed to listen for Firebase messages:', error);
        setLoadingMessages(false);
      }
    );
    return () => unsubscribe();
  }, [activeConversation?._id, user]);

  useEffect(() => {
    if (!activeConversation || !user) return undefined;
    const unsubscribe = listenTyping(
      activeConversation._id,
      (typingByUser) => {
        const typers = Object.fromEntries(
          Object.entries(typingByUser).filter(([uid]) => uid !== user._id)
        );
        setTypingUsers((current) => ({ ...current, [activeConversation._id]: typers }));
      },
      (error) => console.error('Failed to listen for Firebase typing state:', error)
    );
    return () => {
      unsubscribe();
      if (typingHeartbeatRef.current) {
        clearInterval(typingHeartbeatRef.current);
        typingHeartbeatRef.current = null;
      }
      setTyping(activeConversation._id, user, false).catch((error) => {
        console.error('Failed to clear typing state:', error);
      });
    };
  }, [activeConversation?._id, user]);

  useEffect(() => {
    if (!activeConversation) return undefined;
    const intervalId = setInterval(() => {
      setTypingUsers((current) => {
        const currentTypers = current[activeConversation._id] || {};
        const activeTypers = Object.fromEntries(
          Object.entries(currentTypers).filter(([, typingUser]) => {
            const timestamp = typingUser.updatedAt;
            const updatedAt =
              typeof timestamp?.toMillis === 'function'
                ? timestamp.toMillis()
                : Number(timestamp) || 0;
            return updatedAt > Date.now() - 6000;
          })
        );
        if (Object.keys(activeTypers).length === Object.keys(currentTypers).length) {
          return current;
        }
        return { ...current, [activeConversation._id]: activeTypers };
      });
    }, 2000);
    return () => clearInterval(intervalId);
  }, [activeConversation?._id]);

  const selectConversation = useCallback((conversation) => {
    const id = conversation?._id || (typeof conversation === 'string' ? conversation : null);
    setActiveConversationId(id);
    setReplyingTo(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (id) {
        url.searchParams.set('c', id);
        if (new URLSearchParams(window.location.search).get('c') !== id) {
          window.history.pushState({ c: id }, '', url);
        }
      } else {
        url.searchParams.delete('c');
        if (new URLSearchParams(window.location.search).has('c')) {
          window.history.replaceState({}, '', url);
        }
      }
    }
  }, []);

  const sendMessage = useCallback(async ({ content, file = null, replyTo = null }) => {
    if (!activeConversation || !user) return;
    const targetReply = replyTo !== null ? replyTo : replyingTo;

    // Optimistically append the message so the UI feels instant.
    // The real message (with server timestamp) will arrive via the Firestore
    // listener and replace this placeholder automatically.
    if (!file) {
      const optimisticId = `optimistic_${Date.now()}`;
      const optimisticMsg = {
        _id: optimisticId,
        conversationId: activeConversation._id,
        senderId: user._id,
        sender: { _id: user._id, fullName: user.fullName, username: user.username, profilePicture: user.profilePicture || '' },
        content: content.trim(),
        messageType: 'text',
        status: 'sending',
        replyTo: targetReply
          ? {
              _id: targetReply._id,
              senderId: targetReply.senderId || targetReply.sender?._id || '',
              senderName: targetReply.sender?.fullName || targetReply.senderName || 'User',
              content: targetReply.content || '',
              messageType: targetReply.messageType || 'text',
            }
          : null,
        reactions: {},
        deletedForEveryone: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isOptimistic: true,
      };
      setMessages((prev) => [...prev, optimisticMsg]);
    }

    setReplyingTo(null);

    try {
      await sendConversationMessage(activeConversation._id, user, content, file, targetReply);
    } catch (error) {
      // Remove the optimistic message on failure so the user sees the error
      setMessages((prev) => prev.filter((m) => !m.isOptimistic));
      throw error;
    }
  }, [activeConversation, user, replyingTo]);

  const deleteMessage = useCallback(async (messageId) => {
    if (!activeConversation || !user) return;
    await deleteConversationMessage(activeConversation._id, messageId, user._id);
  }, [activeConversation, user]);

  const toggleReaction = useCallback(async (messageId, emoji) => {
    if (!activeConversation || !user) return;
    await toggleMessageReaction(activeConversation._id, messageId, user._id, emoji);
  }, [activeConversation, user]);

  const emitTyping = useCallback((isTyping) => {
    if (!activeConversation || !user) return;
    if (typingHeartbeatRef.current) {
      clearInterval(typingHeartbeatRef.current);
      typingHeartbeatRef.current = null;
    }
    setTyping(activeConversation._id, user, isTyping).catch((error) => {
      console.error('Failed to update Firebase typing state:', error);
    });
    if (isTyping) {
      typingHeartbeatRef.current = setInterval(() => {
        setTyping(activeConversation._id, user, true).catch((error) => {
          console.error('Failed to refresh Firebase typing state:', error);
        });
      }, 3000);
    }
  }, [activeConversation, user]);

  const openConversationWithUser = async (otherUserId) => {
    if (!user) throw new Error('You must be signed in to start a conversation.');
    const result = await createConversation(user, otherUserId);
    const conversation = result?.conversation || result;
    const otherProfile = result?.otherProfile;
    if (otherProfile) {
      setProfiles((current) => ({ ...current, [otherUserId]: otherProfile }));
    }
    setConversationRecords((current) => {
      if (current.some((c) => c._id === conversation._id)) return current;
      return [conversation, ...current];
    });
    selectConversation(conversation._id);
    return conversation;
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversation,
        setActiveConversation: selectConversation,
        messages,
        loadingConversations,
        loadingMessages,
        onlineUsers,
        typingUsers,
        hasMoreMessages,
        replyingTo,
        setReplyingTo,
        cancelReply: () => setReplyingTo(null),
        toggleReaction,
        sendMessage,
        deleteMessage,
        emitTyping,
        openConversationWithUser,
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

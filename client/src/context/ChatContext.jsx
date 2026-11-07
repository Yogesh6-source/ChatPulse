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
  listenPresence,
  listenTyping,
  listenUserProfile,
  sendConversationMessage,
  setTyping,
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
    const unsubscribePresence = listenPresence(
      (statuses) => {
        setPresence(statuses);
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
      unsubscribeConversations();
      unsubscribePresence();
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
    const unsubscribers = [...participantIds].map((uid) =>
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
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
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
        setMessages(nextMessages);
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

  const sendMessage = async ({ content, file = null }) => {
    if (!activeConversation || !user) return;
    await sendConversationMessage(activeConversation._id, user, content, file);
  };

  const deleteMessage = async (messageId) => {
    if (!activeConversation || !user) return;
    await deleteConversationMessage(activeConversation._id, messageId, user._id);
  };

  const emitTyping = (isTyping) => {
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
  };

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

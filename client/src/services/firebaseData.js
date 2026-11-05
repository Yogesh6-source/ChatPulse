import {
  createUserWithEmailAndPassword,
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  onDisconnect,
  onValue,
  push,
  ref as databaseRef,
  remove,
  serverTimestamp as databaseTimestamp,
  set,
} from 'firebase/database';
import { auth, db, realtimeDb, requireFirebase } from './firebase';
import { requireSupabase, supabase } from './supabase';

const USERNAME_PATTERN = /^[a-zA-Z0-9_.-]{3,30}$/;
const DEFAULT_BIO = 'Hey there! I am using RealTime Chat.';
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const AVATAR_BUCKET = 'chatpulse-avatars';
const ATTACHMENT_BUCKET = 'chatpulse-files';
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const signedUrlCache = new Map();

const makeStorageFileName = (file) =>
  `${crypto.randomUUID()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

const getSignedUrlCacheKey = (path) => `${auth.currentUser.uid}:${path}`;

const uploadFile = async (bucket, path, file) => {
  requireSupabase();
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type || 'application/octet-stream' });
  if (error) throw error;
};

const removeFile = async (bucket, path) => {
  requireSupabase();
  signedUrlCache.delete(getSignedUrlCacheKey(path));
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
};

const getAvatarUrl = (path) => {
  requireSupabase();
  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return data.publicUrl;
};

const getAttachmentUrl = async (path) => {
  requireSupabase();
  const cacheKey = getSignedUrlCacheKey(path);
  const cached = signedUrlCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  const { data, error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) throw error;

  const url = data.signedUrl;
  signedUrlCache.set(cacheKey, {
    url,
    expiresAt: Date.now() + (SIGNED_URL_TTL_SECONDS - 30) * 1000,
  });
  return url;
};

export const toSafeUser = (uid, data, email = '') => ({
  _id: uid,
  fullName: data.fullName || '',
  username: data.username || '',
  email,
  profilePicture: data.profilePicture || '',
  bio: data.bio || DEFAULT_BIO,
  isOnline: Boolean(data.isOnline),
  lastSeen: data.lastSeen || null,
});

const profileFields = (profile) => ({
  _id: profile._id,
  fullName: profile.fullName,
  username: profile.username,
  profilePicture: profile.profilePicture || '',
});

const timestampToIso = (value) => {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return value;
};

const mapMessage = (snapshot) => {
  const data = snapshot.data();
  return {
    ...data,
    _id: snapshot.id,
    createdAt: timestampToIso(data.createdAt) || new Date().toISOString(),
    updatedAt: timestampToIso(data.updatedAt),
    readAt: timestampToIso(data.readAt),
  };
};

const mapConversation = (snapshot, uid) => {
  const data = snapshot.data();
  const lastMessage = data.lastMessage
    ? {
        ...data.lastMessage,
        createdAt: timestampToIso(data.lastMessage.createdAt),
      }
    : null;

  return {
    ...data,
    _id: snapshot.id,
    participants: data.participantIds || [],
    lastMessage,
    lastMessageAt: timestampToIso(data.lastMessageAt),
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
    unreadCount: data.unreadCounts?.[uid] || 0,
  };
};

const toError = (error) => {
  const messages = {
    'auth/email-already-in-use': 'An account already exists for this email.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/user-not-found': 'Invalid email or password.',
    'auth/wrong-password': 'Invalid email or password.',
    'auth/weak-password': 'Choose a password with at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'permission-denied': 'You do not have permission to perform this action.',
  };
  return new Error(messages[error.code] || error.message || 'Request failed.');
};

export const registerUser = async ({
  email,
  password,
  fullName,
  username,
  bio,
  avatarFile,
}) => {
  requireFirebase();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedUsername = username.trim().toLowerCase();
  if (!USERNAME_PATTERN.test(normalizedUsername)) {
    throw new Error('Username must be 3–30 characters and use letters, numbers, underscores, dashes, or periods.');
  }
  if (!fullName.trim() || fullName.trim().length > 60) {
    throw new Error('Enter a full name of no more than 60 characters.');
  }
  if (password.length < 6) {
    throw new Error('Choose a password with at least 6 characters.');
  }

  let credential;
  let avatarPath = '';
  try {
    credential =
      auth.currentUser?.email?.toLowerCase() === normalizedEmail
        ? { user: auth.currentUser }
        : await createUserWithEmailAndPassword(auth, normalizedEmail, password);
    let profilePicture = '';
    if (avatarFile) {
      if (!avatarFile.type.startsWith('image/')) {
        throw new Error('Please select an image file.');
      }
      if (avatarFile.size > MAX_UPLOAD_BYTES) {
        throw new Error('Image size exceeds the 10MB limit.');
      }
      avatarPath = `avatars/${credential.user.uid}/${makeStorageFileName(avatarFile)}`;
      await uploadFile(AVATAR_BUCKET, avatarPath, avatarFile);
      profilePicture = getAvatarUrl(avatarPath);
    }

    const uid = credential.user.uid;
    const usernameRef = doc(db, 'usernames', normalizedUsername);
    const userRef = doc(db, 'users', uid);
    const userData = {
      fullName: fullName.trim(),
      fullNameLowercase: fullName.trim().toLowerCase(),
      username: normalizedUsername,
      profilePicture,
      bio: bio?.trim().slice(0, 200) || DEFAULT_BIO,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await runTransaction(db, async (transaction) => {
      const userSnapshot = await transaction.get(userRef);
      const usernameSnapshot = await transaction.get(usernameRef);
      if (usernameSnapshot.exists()) {
        if (usernameSnapshot.data().uid === uid) {
          if (!userSnapshot.exists()) {
            transaction.set(userRef, userData);
          }
          return;
        }
        throw new Error('That username is already taken.');
      }
      transaction.set(usernameRef, { uid });
      transaction.set(userRef, userData);
    });

    return toSafeUser(uid, userData, normalizedEmail);
  } catch (error) {
    if (credential?.user) {
      if (avatarPath) {
        try {
          await removeFile(AVATAR_BUCKET, avatarPath);
        } catch (cleanupError) {
          console.error('Failed to clean up an incomplete profile image upload:', cleanupError);
        }
      }
    }
    throw toError(error);
  }
};

export const signIn = async (email, password, rememberMe) => {
  requireFirebase();
  try {
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
    return await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  } catch (error) {
    throw toError(error);
  }
};

export const sendPasswordReset = async (email) => {
  requireFirebase();
  try {
    await sendPasswordResetEmail(auth, email.trim().toLowerCase());
  } catch (error) {
    throw toError(error);
  }
};

export const updateUserProfile = async (user, { fullName, username, bio, avatarFile }) => {
  requireFirebase();
  const normalizedUsername = username.trim().toLowerCase();
  if (!USERNAME_PATTERN.test(normalizedUsername)) {
    throw new Error('Username must be 3–30 characters and use letters, numbers, underscores, dashes, or periods.');
  }
  if (!fullName.trim() || fullName.trim().length > 60) {
    throw new Error('Enter a full name of no more than 60 characters.');
  }
  if (bio.trim().length > 200) {
    throw new Error('Bio cannot exceed 200 characters.');
  }

  let uploadedAvatarPath = null;
  try {
    let profilePicture = user.profilePicture || '';
    if (avatarFile) {
      if (!avatarFile.type.startsWith('image/')) {
        throw new Error('Please select an image file.');
      }
      if (avatarFile.size > MAX_UPLOAD_BYTES) {
        throw new Error('Image size exceeds the 10MB limit.');
      }
      uploadedAvatarPath = `avatars/${user._id}/${makeStorageFileName(avatarFile)}`;
      await uploadFile(AVATAR_BUCKET, uploadedAvatarPath, avatarFile);
      profilePicture = getAvatarUrl(uploadedAvatarPath);
    }

    const userRef = doc(db, 'users', user._id);
    const nextUserData = {
      fullName: fullName.trim(),
      fullNameLowercase: fullName.trim().toLowerCase(),
      username: normalizedUsername,
      profilePicture,
      bio: bio.trim() || DEFAULT_BIO,
      updatedAt: serverTimestamp(),
    };
    const oldUsernameRef = doc(db, 'usernames', user.username);
    const newUsernameRef = doc(db, 'usernames', normalizedUsername);

    await runTransaction(db, async (transaction) => {
      const newUsernameSnapshot = await transaction.get(newUsernameRef);
      if (normalizedUsername !== user.username && newUsernameSnapshot.exists()) {
        throw new Error('That username is already taken.');
      }
      transaction.update(userRef, nextUserData);
      if (normalizedUsername !== user.username) {
        transaction.delete(oldUsernameRef);
        transaction.set(newUsernameRef, { uid: user._id });
      }
    });

    return { ...user, ...nextUserData, profilePicture, username: normalizedUsername };
  } catch (error) {
    if (uploadedAvatarPath) {
      try {
        await removeFile(AVATAR_BUCKET, uploadedAvatarPath);
      } catch (cleanupError) {
        console.error('Failed to clean up an incomplete profile image upload:', cleanupError);
      }
    }
    throw toError(error);
  }
};

export const searchUsers = async (searchText, currentUserId) => {
  requireFirebase();
  try {
    const usersRef = collection(db, 'users');
    const term = searchText.trim().toLowerCase();
    const searches = term
      ? [
          getDocs(query(usersRef, where('username', '>=', term), where('username', '<=', `${term}\uf8ff`), limit(20))),
          getDocs(query(usersRef, where('fullNameLowercase', '>=', term), where('fullNameLowercase', '<=', `${term}\uf8ff`), limit(20))),
        ]
      : [getDocs(query(usersRef, orderBy('username'), limit(20)))];
    const results = await Promise.all(searches);
    const uniqueUsers = new Map();
    results.forEach((result) => {
      result.docs.forEach((snapshot) => {
        if (snapshot.id !== currentUserId) {
          uniqueUsers.set(snapshot.id, toSafeUser(snapshot.id, snapshot.data()));
        }
      });
    });
    return [...uniqueUsers.values()].slice(0, 20);
  } catch (error) {
    throw toError(error);
  }
};

export const listenConversations = (uid, onChange, onError) => {
  const conversationsQuery = query(
    collection(db, 'conversations'),
    where('participantIds', 'array-contains', uid)
  );
  return onSnapshot(
    conversationsQuery,
    (snapshot) => {
      const conversations = snapshot.docs
        .map((item) => mapConversation(item, uid))
        .sort((a, b) => new Date(b.lastMessageAt || b.createdAt || 0) - new Date(a.lastMessageAt || a.createdAt || 0));
      conversations.forEach((conversation) => {
        const message = conversation.lastMessage;
        if (message?.receiverId === uid && message.status === 'sent') {
          markMessageDelivered(conversation._id, message._id, uid).catch((error) => {
            console.error('Failed to update message delivery status:', error);
          });
        }
      });
      onChange(conversations);
    },
    onError
  );
};

const markMessageDelivered = async (conversationId, messageId, uid) => {
  const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(messageRef);
    if (!snapshot.exists()) return;
    const message = snapshot.data();
    if (message.receiverId !== uid || message.status !== 'sent') return;
    transaction.update(messageRef, {
      status: 'delivered',
      updatedAt: serverTimestamp(),
    });
  });
};

export const listenUserProfile = (uid, onChange, onError) =>
  onSnapshot(doc(db, 'users', uid), (snapshot) => {
    onChange(snapshot.exists() ? toSafeUser(uid, snapshot.data()) : null);
  }, onError);

export const listenMessages = (conversationId, uid, onChange, onError) => {
  const messagesQuery = query(
    collection(db, 'conversations', conversationId, 'messages'),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  let latestSnapshot = 0;
  return onSnapshot(
    messagesQuery,
    async (snapshot) => {
      const currentSnapshot = ++latestSnapshot;
      const messages = snapshot.docs.map(mapMessage).reverse();
      try {
        const messagesWithUrls = await Promise.all(
          messages.map(async (message) => {
            if (message.filePath) {
              message.fileUrl = await getAttachmentUrl(message.filePath);
            }
            return message;
          })
        );
        if (currentSnapshot === latestSnapshot) {
          onChange(messagesWithUrls, snapshot.size === 50);
        }
      } catch (error) {
        if (currentSnapshot === latestSnapshot) onError(error);
      }
      markMessagesRead(conversationId, uid, messages).catch((error) => {
        console.error('Failed to mark messages as read:', error);
      });
    },
    onError
  );
};

const markMessagesRead = async (conversationId, uid, messages) => {
  const unreadMessages = messages.filter(
    (message) => message.receiverId === uid && message.status !== 'read'
  );
  if (!unreadMessages.length) return;

  const batch = writeBatch(db);
  unreadMessages.forEach((message) => {
    batch.update(
      doc(db, 'conversations', conversationId, 'messages', message._id),
      { status: 'read', readAt: serverTimestamp(), updatedAt: serverTimestamp() }
    );
  });
  batch.update(doc(db, 'conversations', conversationId), {
    [`unreadCounts.${uid}`]: 0,
  });
  await batch.commit();
};

export const createConversation = async (currentUser, otherUserId) => {
  requireFirebase();
  if (currentUser._id === otherUserId) {
    throw new Error('You cannot start a conversation with yourself.');
  }
  try {
    const [currentSnapshot, otherSnapshot] = await Promise.all([
      getDoc(doc(db, 'users', currentUser._id)),
      getDoc(doc(db, 'users', otherUserId)),
    ]);
    if (!currentSnapshot.exists() || !otherSnapshot.exists()) {
      throw new Error('Could not find that user.');
    }

    const participantIds = [currentUser._id, otherUserId].sort();
    const conversationId = participantIds.join('_');
    const conversationRef = doc(db, 'conversations', conversationId);
    await runTransaction(db, async (transaction) => {
      const existing = await transaction.get(conversationRef);
      if (!existing.exists()) {
        transaction.set(conversationRef, {
          participantIds,
          unreadCounts: { [currentUser._id]: 0, [otherUserId]: 0 },
          lastMessage: null,
          lastMessageAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    });
    const snapshot = await getDoc(conversationRef);
    return mapConversation(snapshot, currentUser._id);
  } catch (error) {
    throw toError(error);
  }
};

export const sendConversationMessage = async (conversationId, user, content, file) => {
  requireFirebase();
  const normalizedContent = content.trim();
  if (!normalizedContent && !file) return null;
  if (file && file.size > MAX_UPLOAD_BYTES) {
    throw new Error('File size exceeds the 10MB limit.');
  }

  const conversationRef = doc(db, 'conversations', conversationId);
  const conversationSnapshot = await getDoc(conversationRef);
  if (!conversationSnapshot.exists()) throw new Error('Conversation no longer exists.');
  const conversation = conversationSnapshot.data();
  const receiverId = conversation.participantIds.find((id) => id !== user._id);
  if (!receiverId) throw new Error('This conversation has no other participant.');

  let filePath = null;
  if (file) {
    requireSupabase();
    const participants = [...conversation.participantIds].sort();
    filePath = `attachments/${participants[0]}/${participants[1]}/${conversationId}/${makeStorageFileName(file)}`;
    try {
      await uploadFile(ATTACHMENT_BUCKET, filePath, file);
    } catch (error) {
      try {
        await removeFile(ATTACHMENT_BUCKET, filePath);
      } catch (cleanupError) {
        console.error('Failed to clean up an incomplete message attachment upload:', cleanupError);
      }
      throw toError(error);
    }
  }

  const messageRef = doc(collection(db, 'conversations', conversationId, 'messages'));
  const messageType = file ? (file.type.startsWith('image/') ? 'image' : 'file') : 'text';
  const messageData = {
    conversationId,
    senderId: user._id,
    receiverId,
    sender: profileFields(user),
    content: normalizedContent,
    messageType,
    fileUrl: null,
    filePath,
    fileName: file?.name || null,
    fileSize: file?.size || null,
    status: 'sent',
    deletedForEveryone: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const batch = writeBatch(db);
  batch.set(messageRef, messageData);
  batch.update(conversationRef, {
    lastMessage: { ...messageData, _id: messageRef.id, createdAt: new Date().toISOString() },
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    [`unreadCounts.${receiverId}`]: increment(1),
  });
  try {
    await batch.commit();
  } catch (error) {
    if (filePath) {
      try {
        await removeFile(ATTACHMENT_BUCKET, filePath);
      } catch (cleanupError) {
        console.error('Failed to clean up an incomplete message attachment:', cleanupError);
      }
    }
    throw toError(error);
  }
  return { ...messageData, _id: messageRef.id, createdAt: new Date().toISOString() };
};

export const deleteConversationMessage = async (conversationId, messageId, uid) => {
  requireFirebase();
  const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
  const messageSnapshot = await getDoc(messageRef);
  if (!messageSnapshot.exists()) throw new Error('Message no longer exists.');
  const message = messageSnapshot.data();
  if (message.senderId !== uid) throw new Error('You can only delete your own messages.');

  const updates = {
    deletedForEveryone: true,
    content: 'This message was deleted',
    fileUrl: null,
    filePath: null,
    fileName: null,
    fileSize: null,
    updatedAt: serverTimestamp(),
  };
  const batch = writeBatch(db);
  batch.update(messageRef, updates);
  const conversationRef = doc(db, 'conversations', conversationId);
  const conversationSnapshot = await getDoc(conversationRef);
  if (conversationSnapshot.exists() && conversationSnapshot.data().lastMessage?._id === messageId) {
    batch.update(conversationRef, {
      lastMessage: {
        ...conversationSnapshot.data().lastMessage,
        ...updates,
      },
      updatedAt: serverTimestamp(),
    });
  }
  await batch.commit();
  if (message.filePath) {
    try {
      await removeFile(ATTACHMENT_BUCKET, message.filePath);
    } catch (error) {
      throw toError(error);
    }
  }
};

export const listenPresence = (onChange, onError) => {
  requireFirebase();
  return onValue(
    databaseRef(realtimeDb, 'status'),
    (snapshot) => {
      const users = snapshot.val() || {};
      const statuses = Object.fromEntries(
        Object.entries(users).map(([uid, status]) => [
          uid,
          {
            isOnline: Object.keys(status?.connections || {}).length > 0,
            lastSeen: status?.lastSeen || null,
          },
        ])
      );
      onChange(statuses);
    },
    onError
  );
};

export const startPresence = (uid) => {
  requireFirebase();
  const connectionsRef = databaseRef(realtimeDb, `status/${uid}/connections`);
  const connectionRef = push(connectionsRef);
  const lastSeenRef = databaseRef(realtimeDb, `status/${uid}/lastSeen`);
  const connectedRef = databaseRef(realtimeDb, '.info/connected');
  const unsubscribe = onValue(connectedRef, async (snapshot) => {
    if (snapshot.val() !== true) return;
    try {
      await onDisconnect(connectionRef).remove();
      await onDisconnect(lastSeenRef).set(databaseTimestamp());
      await set(connectionRef, true);
    } catch (error) {
      console.error('Failed to update Firebase presence:', error);
    }
  });
  return async () => {
    unsubscribe();
    try {
      await Promise.all([
        onDisconnect(connectionRef).cancel(),
        onDisconnect(lastSeenRef).cancel(),
      ]);
      await Promise.all([
        remove(connectionRef),
        set(lastSeenRef, databaseTimestamp()),
      ]);
    } catch (error) {
      console.error('Failed to clean up Firebase presence:', error);
    }
  };
};

export const listenTyping = (conversationId, onChange, onError) =>
  onSnapshot(
    collection(db, 'conversations', conversationId, 'typing'),
    (snapshot) =>
      onChange(Object.fromEntries(snapshot.docs.map((item) => [item.id, item.data()]))),
    onError
  );

export const setTyping = async (conversationId, user, isTyping) => {
  const typingRef = doc(db, 'conversations', conversationId, 'typing', user._id);
  if (isTyping) {
    await setDoc(typingRef, {
      fullName: user.fullName,
      username: user.username,
      updatedAt: serverTimestamp(),
    });
  } else {
    await deleteDoc(typingRef);
  }
};

export const getFirebaseUserProfile = async (uid, email = '') => {
  requireFirebase();
  const profileSnapshot = await getDoc(doc(db, 'users', uid));
  if (!profileSnapshot.exists()) {
    throw new Error('Your Firebase account does not have a ChatPulse profile.');
  }
  return toSafeUser(uid, profileSnapshot.data(), email);
};

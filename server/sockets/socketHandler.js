import { Server } from 'socket.io';
import { verifyToken } from '../utils/generateToken.js';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';

let ioInstance = null;

// Map of userId -> Set of socketIds (for multi-tab / multi-device support)
const userSocketsMap = new Map();

export const initSocket = (httpServer, allowedOrigin) => {
  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigin || ['http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  ioInstance = io;

  // Socket Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1] ||
        socket.handshake.query?.token;

      if (!token) {
        return next(new Error('Authentication required for socket connection'));
      }

      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      console.warn('[Socket Auth Error]:', err.message);
      return next(new Error('Invalid socket authentication token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();

    // Track user socket ID
    if (!userSocketsMap.has(userId)) {
      userSocketsMap.set(userId, new Set());
    }
    userSocketsMap.get(userId).add(socket.id);

    // Join user's personal room for direct notifications
    socket.join(`user_${userId}`);

    // If this is the user's first active socket connection, mark online in DB & broadcast
    if (userSocketsMap.get(userId).size === 1) {
      try {
        await User.findByIdAndUpdate(userId, {
          isOnline: true,
          lastSeen: new Date(),
        });
        io.emit('user_online', {
          userId,
          fullName: socket.user.fullName,
          username: socket.user.username,
        });
      } catch (err) {
        console.error('[Socket] Error updating online status:', err);
      }
    }

    // Send the current list of online users to the newly connected socket
    const onlineUserIds = Array.from(userSocketsMap.keys()).filter(
      (id) => userSocketsMap.get(id).size > 0
    );
    socket.emit('get_online_users', onlineUserIds);

    /**
     * Join a conversation room
     * Validates conversation membership before permitting join
     */
    socket.on('join_conversation', async ({ conversationId }) => {
      try {
        if (!conversationId) return;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          socket.emit('error', { message: 'Conversation does not exist' });
          return;
        }

        const isMember = conversation.participants.some(
          (p) => p.toString() === userId
        );

        if (!isMember) {
          socket.emit('error', { message: 'Unauthorized to join conversation' });
          return;
        }

        socket.join(`conversation_${conversationId}`);

        // Mark any messages sent by the other user to this user as read
        const updateResult = await Message.updateMany(
          {
            conversationId,
            receiver: socket.user._id,
            status: { $ne: 'read' },
          },
          {
            $set: { status: 'read', readAt: new Date() },
          }
        );

        if (updateResult.modifiedCount > 0) {
          io.to(`conversation_${conversationId}`).emit('messages_read_receipt', {
            conversationId,
            readBy: userId,
            readAt: new Date(),
          });
        }
      } catch (err) {
        console.error('[Socket join_conversation error]:', err);
      }
    });

    /**
     * Leave conversation room
     */
    socket.on('leave_conversation', ({ conversationId }) => {
      if (conversationId) {
        socket.leave(`conversation_${conversationId}`);
      }
    });

    /**
     * Send real-time message
     */
    socket.on('send_message', async ({ conversationId, content, messageType = 'text', tempId }) => {
      try {
        if (!conversationId || (!content && messageType === 'text')) {
          return socket.emit('error', { message: 'Message content is required' });
        }

        // Verify conversation membership
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          return socket.emit('error', { message: 'Conversation not found' });
        }

        const isMember = conversation.participants.some(
          (p) => p.toString() === userId
        );
        if (!isMember) {
          return socket.emit('error', { message: 'Unauthorized to send message in this conversation' });
        }

        // Determine recipient
        const receiverId = conversation.participants.find(
          (p) => p.toString() !== userId
        );

        // Check if receiver is online
        const receiverIsOnline = userSocketsMap.has(receiverId.toString()) &&
          userSocketsMap.get(receiverId.toString()).size > 0;

        const initialStatus = receiverIsOnline ? 'delivered' : 'sent';

        // Persist message in MongoDB
        const newMessage = await Message.create({
          conversationId,
          sender: socket.user._id,
          receiver: receiverId,
          content: content.trim(),
          messageType,
          status: initialStatus,
        });

        // Update conversation summary
        conversation.lastMessage = newMessage._id;
        conversation.lastMessageAt = new Date();
        await conversation.save();

        const populatedMessage = await Message.findById(newMessage._id)
          .populate('sender', 'fullName username profilePicture')
          .populate('receiver', 'fullName username profilePicture');

        // Broadcast to conversation room (including sender with tempId for optimistic UI replacement)
        io.to(`conversation_${conversationId}`).emit('receive_message', {
          ...populatedMessage.toObject(),
          tempId,
        });

        // Broadcast notification to receiver's user room
        io.to(`user_${receiverId.toString()}`).emit('new_message_notification', {
          conversationId,
          message: populatedMessage,
        });

        // If receiver was online, notify sender that message was delivered
        if (receiverIsOnline) {
          socket.emit('message_delivered', {
            messageId: newMessage._id,
            conversationId,
          });
        }
      } catch (err) {
        console.error('[Socket send_message error]:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    /**
     * Typing indicators
     */
    socket.on('typing', ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(`conversation_${conversationId}`).emit('user_typing', {
        conversationId,
        userId,
        fullName: socket.user.fullName,
        username: socket.user.username,
      });
    });

    socket.on('stop_typing', ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(`conversation_${conversationId}`).emit('user_stop_typing', {
        conversationId,
        userId,
      });
    });

    /**
     * Mark messages in conversation as read
     */
    socket.on('mark_read', async ({ conversationId }) => {
      try {
        if (!conversationId) return;

        const updated = await Message.updateMany(
          {
            conversationId,
            receiver: socket.user._id,
            status: { $ne: 'read' },
          },
          {
            $set: { status: 'read', readAt: new Date() },
          }
        );

        if (updated.modifiedCount > 0) {
          io.to(`conversation_${conversationId}`).emit('messages_read_receipt', {
            conversationId,
            readBy: userId,
            readAt: new Date(),
          });
        }
      } catch (err) {
        console.error('[Socket mark_read error]:', err);
      }
    });

    /**
     * Disconnect handler
     */
    socket.on('disconnect', async () => {
      const userSockets = userSocketsMap.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          userSocketsMap.delete(userId);

          // Update user last seen & offline in DB
          try {
            const now = new Date();
            await User.findByIdAndUpdate(userId, {
              isOnline: false,
              lastSeen: now,
            });

            // Broadcast offline to all users
            io.emit('user_offline', {
              userId,
              lastSeen: now,
            });
          } catch (err) {
            console.error('[Socket disconnect error]:', err);
          }
        }
      }
    });
  });

  return io;
};

export const getIO = () => {
  return ioInstance;
};

export const getOnlineUsers = () => {
  return Array.from(userSocketsMap.keys());
};

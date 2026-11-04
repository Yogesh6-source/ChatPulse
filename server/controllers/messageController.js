import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import { getIO } from '../sockets/socketHandler.js';

/**
 * @desc    Get messages for a conversation with pagination
 * @route   GET /api/messages/:conversationId
 * @access  Private
 */
export const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const before = req.query.before; // ISO date string cursor

    // Verify conversation membership
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const isMember = conversation.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const filter = { conversationId };
    if (before) {
      filter.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(filter)
      .sort({ createdAt: 1 })
      .limit(limit)
      .populate('sender', 'fullName username profilePicture')
      .populate('receiver', 'fullName username profilePicture');

    // Check if there are more older messages
    const oldestInBatch = messages[0];
    let hasMore = false;
    if (oldestInBatch) {
      const olderCount = await Message.countDocuments({
        conversationId,
        createdAt: { $lt: oldestInBatch.createdAt },
      });
      hasMore = olderCount > 0;
    }

    res.status(200).json({
      success: true,
      messages,
      hasMore,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Send a message (REST fallback / attachment handler)
 * @route   POST /api/messages
 * @access  Private
 */
export const sendMessage = async (req, res, next) => {
  try {
    const { conversationId, content, messageType } = req.body;

    if (!conversationId) {
      return res.status(400).json({ success: false, message: 'Conversation ID is required' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const isMember = conversation.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied to this conversation' });
    }

    // Determine receiver (the other participant)
    const receiverId = conversation.participants.find(
      (p) => p.toString() !== req.user._id.toString()
    );

    let type = messageType || 'text';
    let fileUrl = null;
    let fileName = null;
    let fileSize = null;

    if (req.file) {
      fileUrl = `/uploads/attachments/${req.file.filename}`;
      fileName = req.file.originalname;
      fileSize = req.file.size;
      const isImg = req.file.mimetype.startsWith('image/');
      type = isImg ? 'image' : 'file';
    }

    if (!content && !fileUrl) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot be empty. Please provide text or an attachment.',
      });
    }

    const newMessage = await Message.create({
      conversationId,
      sender: req.user._id,
      receiver: receiverId,
      content: content ? content.trim() : '',
      messageType: type,
      fileUrl,
      fileName,
      fileSize,
      status: 'sent',
    });

    // Update conversation lastMessage and timestamp
    conversation.lastMessage = newMessage._id;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    const populatedMessage = await Message.findById(newMessage._id)
      .populate('sender', 'fullName username profilePicture')
      .populate('receiver', 'fullName username profilePicture');

    // Emit Socket.IO event to conversation room and receiver user room
    try {
      const io = getIO();
      if (io) {
        io.to(`conversation_${conversationId}`).emit('receive_message', populatedMessage);
        io.to(`user_${receiverId}`).emit('new_message_notification', {
          conversationId,
          message: populatedMessage,
        });
      }
    } catch (sockErr) {
      console.warn('[Socket] Could not emit socket message:', sockErr.message);
    }

    res.status(201).json({
      success: true,
      message: populatedMessage,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete own message
 * @route   DELETE /api/messages/:id
 * @access  Private
 */
export const deleteMessage = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own messages',
      });
    }

    message.deletedForEveryone = true;
    message.content = 'This message was deleted';
    message.fileUrl = null;
    message.fileName = null;
    message.fileSize = null;
    await message.save();

    // Broadcast message deletion via Socket.IO
    try {
      const io = getIO();
      if (io) {
        io.to(`conversation_${message.conversationId}`).emit('message_deleted', {
          messageId: message._id,
          conversationId: message.conversationId,
        });
      }
    } catch (sockErr) {
      console.warn('[Socket] Could not emit message_deleted:', sockErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Message deleted',
      deletedMessageId: message._id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark conversation messages as read
 * @route   PUT /api/messages/:id/read (or by conversationId)
 * @access  Private
 */
export const markMessagesAsRead = async (req, res, next) => {
  try {
    const { conversationId } = req.body;
    const targetId = req.params.id !== 'all' ? req.params.id : null;

    let filter = {
      receiver: req.user._id,
      status: { $ne: 'read' },
    };

    if (conversationId) {
      filter.conversationId = conversationId;
    } else if (targetId) {
      filter._id = targetId;
    }

    const updated = await Message.updateMany(filter, {
      $set: { status: 'read', readAt: new Date() },
    });

    // Notify the other participants via socket
    try {
      const io = getIO();
      if (io && conversationId) {
        io.to(`conversation_${conversationId}`).emit('messages_read_receipt', {
          conversationId,
          readBy: req.user._id,
          readAt: new Date(),
        });
      }
    } catch (sockErr) {
      console.warn('[Socket] Could not emit messages_read_receipt:', sockErr.message);
    }

    res.status(200).json({
      success: true,
      modifiedCount: updated.modifiedCount,
    });
  } catch (error) {
    next(error);
  }
};

import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';

/**
 * @desc    Get or create 1-to-1 conversation with another user
 * @route   POST /api/conversations
 * @access  Private
 */
export const getOrCreateConversation = async (req, res, next) => {
  try {
    const { participantId } = req.body;

    if (!participantId) {
      return res.status(400).json({
        success: false,
        message: 'Participant ID is required',
      });
    }

    if (participantId.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot start a conversation with yourself',
      });
    }

    // Verify other user exists
    const otherUser = await User.findById(participantId);
    if (!otherUser) {
      return res.status(404).json({
        success: false,
        message: 'Recipient user not found',
      });
    }

    // Look for existing conversation with exactly these two participants
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, participantId], $size: 2 },
    })
      .populate('participants', 'fullName username profilePicture bio isOnline lastSeen')
      .populate('lastMessage');

    if (conversation) {
      // Calculate unread count for current user
      const unreadCount = await Message.countDocuments({
        conversationId: conversation._id,
        receiver: req.user._id,
        status: { $ne: 'read' },
      });

      return res.status(200).json({
        success: true,
        conversation: {
          ...conversation.toObject(),
          unreadCount,
        },
      });
    }

    // Create new conversation
    conversation = await Conversation.create({
      participants: [req.user._id, participantId],
      lastMessageAt: new Date(),
    });

    conversation = await Conversation.findById(conversation._id)
      .populate('participants', 'fullName username profilePicture bio isOnline lastSeen')
      .populate('lastMessage');

    res.status(201).json({
      success: true,
      conversation: {
        ...conversation.toObject(),
        unreadCount: 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all conversations for the authenticated user
 * @route   GET /api/conversations
 * @access  Private
 */
export const getUserConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate('participants', 'fullName username profilePicture bio isOnline lastSeen')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'fullName username' },
      })
      .sort({ lastMessageAt: -1 });

    // Aggregate unread counts for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
          conversationId: conv._id,
          receiver: req.user._id,
          status: { $ne: 'read' },
        });

        return {
          ...conv.toObject(),
          unreadCount,
        };
      })
    );

    res.status(200).json({
      success: true,
      conversations: conversationsWithUnread,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single conversation by ID
 * @route   GET /api/conversations/:id
 * @access  Private
 */
export const getConversationById = async (req, res, next) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate('participants', 'fullName username profilePicture bio isOnline lastSeen')
      .populate('lastMessage');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    // Authorization check
    const isParticipant = conversation.participants.some(
      (p) => p._id.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not a participant in this conversation',
      });
    }

    const unreadCount = await Message.countDocuments({
      conversationId: conversation._id,
      receiver: req.user._id,
      status: { $ne: 'read' },
    });

    res.status(200).json({
      success: true,
      conversation: {
        ...conversation.toObject(),
        unreadCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

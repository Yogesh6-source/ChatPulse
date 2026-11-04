import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast lookup of conversations by participant
conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessageAt: -1 });

// Ensure exactly two participants for 1-to-1 chat
conversationSchema.pre('validate', function (next) {
  if (this.participants && this.participants.length !== 2) {
    next(new Error('A 1-to-1 conversation must have exactly two participants'));
  } else {
    next();
  }
});

const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;

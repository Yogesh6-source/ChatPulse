import dotenv from 'dotenv';
dotenv.config();

import { connectDB, disconnectDB } from '../config/db.js';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';

const seedData = async () => {
  try {
    await connectDB();
    console.log('[Seed] Connected to database. Seeding demo accounts...');

    // Delete existing demo users
    const emails = [
      'alex@example.com',
      'sarah@example.com',
      'david@example.com',
      'emily@example.com',
    ];
    const existingUsers = await User.find({ email: { $in: emails } });
    const userIds = existingUsers.map((u) => u._id);

    await Message.deleteMany({
      $or: [{ sender: { $in: userIds } }, { receiver: { $in: userIds } }],
    });
    await Conversation.deleteMany({ participants: { $in: userIds } });
    await User.deleteMany({ email: { $in: emails } });

    // Create demo users
    const users = await User.create([
      {
        fullName: 'Alex Johnson',
        username: 'alex',
        email: 'alex@example.com',
        password: 'password123',
        bio: 'Product Designer & Frontend Enthusiast 🎨',
        isOnline: true,
        lastSeen: new Date(),
      },
      {
        fullName: 'Sarah Miller',
        username: 'sarah',
        email: 'sarah@example.com',
        password: 'password123',
        bio: 'Full Stack Engineer & Open Source contributor 🚀',
        isOnline: true,
        lastSeen: new Date(),
      },
      {
        fullName: 'David Chen',
        username: 'david',
        email: 'david@example.com',
        password: 'password123',
        bio: 'Mobile App Developer | Coffee Lover ☕',
        isOnline: false,
        lastSeen: new Date(Date.now() - 3600000 * 2),
      },
      {
        fullName: 'Emily Watson',
        username: 'emily',
        email: 'emily@example.com',
        password: 'password123',
        bio: 'UX Researcher & Tech Writer 📚',
        isOnline: false,
        lastSeen: new Date(Date.now() - 3600000 * 18),
      },
    ]);

    const [alex, sarah, david, emily] = users;

    // Create sample conversation between Alex and Sarah
    const conv1 = await Conversation.create({
      participants: [alex._id, sarah._id],
      lastMessageAt: new Date(),
    });

    // Sample messages
    const msg1 = await Message.create({
      conversationId: conv1._id,
      sender: sarah._id,
      receiver: alex._id,
      content: 'Hey Alex! Did you check out the new design for the chat app?',
      messageType: 'text',
      status: 'read',
      createdAt: new Date(Date.now() - 60000 * 30),
    });

    const msg2 = await Message.create({
      conversationId: conv1._id,
      sender: alex._id,
      receiver: sarah._id,
      content: 'Hey Sarah! Yes, it looks super sleek! Real-time messaging with Socket.IO is lightning fast ⚡',
      messageType: 'text',
      status: 'read',
      createdAt: new Date(Date.now() - 60000 * 20),
    });

    const msg3 = await Message.create({
      conversationId: conv1._id,
      sender: sarah._id,
      receiver: alex._id,
      content: 'Awesome! Let me know if you want to test attachments or emojis! 🎉',
      messageType: 'text',
      status: 'delivered',
      createdAt: new Date(Date.now() - 60000 * 5),
    });

    conv1.lastMessage = msg3._id;
    conv1.lastMessageAt = msg3.createdAt;
    await conv1.save();

    // Sample conversation between Alex and David
    const conv2 = await Conversation.create({
      participants: [alex._id, david._id],
      lastMessageAt: new Date(Date.now() - 3600000),
    });

    const msg4 = await Message.create({
      conversationId: conv2._id,
      sender: david._id,
      receiver: alex._id,
      content: 'Catch you later today for the project review!',
      messageType: 'text',
      status: 'read',
      createdAt: new Date(Date.now() - 3600000),
    });

    conv2.lastMessage = msg4._id;
    conv2.lastMessageAt = msg4.createdAt;
    await conv2.save();

    console.log('[Seed] Demo accounts successfully seeded:');
    console.log('1. alex@example.com / password123 (Alex Johnson - @alex)');
    console.log('2. sarah@example.com / password123 (Sarah Miller - @sarah)');
    console.log('3. david@example.com / password123 (David Chen - @david)');
    console.log('4. emily@example.com / password123 (Emily Watson - @emily)');
  } catch (error) {
    console.error('[Seed Error]:', error);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
};

seedData();

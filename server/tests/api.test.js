import http from 'http';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { io as ClientIO } from 'socket.io-client';

import { connectDB, disconnectDB } from '../config/db.js';
import { initSocket } from '../sockets/socketHandler.js';
import authRoutes from '../routes/authRoutes.js';
import userRoutes from '../routes/userRoutes.js';
import conversationRoutes from '../routes/conversationRoutes.js';
import messageRoutes from '../routes/messageRoutes.js';
import { errorHandler } from '../middleware/errorHandler.js';

import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use(errorHandler);

const server = http.createServer(app);
const TEST_PORT = 5099;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let aliceToken = '';
let aliceUser = null;
let bobToken = '';
let bobUser = null;
let testConversationId = '';
let testMessageId = '';

const runTests = async () => {
  console.log('--- STARTING COMPREHENSIVE E2E REAL-TIME CHAT TEST SUITE ---');

  try {
    await connectDB();
    initSocket(server);

    await new Promise((resolve) => server.listen(TEST_PORT, resolve));
    console.log(`[Test Server] Listening on port ${TEST_PORT}`);

    // Clean up test data if any
    await User.deleteMany({ email: { $in: ['alice_test@example.com', 'bob_test@example.com'] } });
    await Conversation.deleteMany({});
    await Message.deleteMany({});

    // 1. REGISTER ALICE
    console.log('\n[TEST 1] Register User 1 (Alice)');
    const regAliceRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Alice Walker',
        username: 'alicew',
        email: 'alice_test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        bio: 'Hello from Alice',
      }),
    });
    const regAliceData = await regAliceRes.json();
    if (!regAliceData.success || !regAliceData.token) {
      throw new Error(`Register Alice failed: ${JSON.stringify(regAliceData)}`);
    }
    aliceToken = regAliceData.token;
    aliceUser = regAliceData.user;
    console.log(`✓ Alice registered successfully! ID: ${aliceUser._id}, Token received.`);

    // 2. PREVENT DUPLICATE USERNAME / EMAIL
    console.log('\n[TEST 2] Duplicate username prevention');
    const dupRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Alice Duplicate',
        username: 'alicew',
        email: 'different@example.com',
        password: 'password123',
      }),
    });
    const dupData = await dupRes.json();
    if (dupRes.status !== 400 || dupData.success) {
      throw new Error(`Failed to reject duplicate username: ${JSON.stringify(dupData)}`);
    }
    console.log(`✓ Duplicate username correctly rejected with 400: "${dupData.message}"`);

    // 3. REGISTER BOB
    console.log('\n[TEST 3] Register User 2 (Bob)');
    const regBobRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Bob Roberts',
        username: 'bobr',
        email: 'bob_test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        bio: 'Hello from Bob',
      }),
    });
    const regBobData = await regBobRes.json();
    if (!regBobData.success) throw new Error(`Register Bob failed: ${JSON.stringify(regBobData)}`);
    bobToken = regBobData.token;
    bobUser = regBobData.user;
    console.log(`✓ Bob registered successfully! ID: ${bobUser._id}`);

    // 4. LOGIN AUTHENTICATION (Invalid vs Valid)
    console.log('\n[TEST 4] Login verification');
    const badLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginId: 'alicew', password: 'wrongpassword' }),
    });
    if (badLoginRes.status !== 401) {
      throw new Error(`Expected 401 for wrong password, got ${badLoginRes.status}`);
    }
    console.log('✓ Invalid password correctly rejected with 401');

    const goodLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginId: 'alicew', password: 'password123' }),
    });
    const goodLoginData = await goodLoginRes.json();
    if (!goodLoginData.success) throw new Error('Valid login failed');
    console.log('✓ Valid login succeeded with JWT token');

    // 5. SEARCH USERS
    console.log('\n[TEST 5] Search directory');
    const searchRes = await fetch(`${BASE_URL}/api/users/search?q=bob`, {
      headers: { Authorization: `Bearer ${aliceToken}` },
    });
    const searchData = await searchRes.json();
    if (!searchData.success || searchData.users.length === 0) {
      throw new Error(`Search for bob returned no users: ${JSON.stringify(searchData)}`);
    }
    console.log(`✓ Search returned ${searchData.users.length} match: @${searchData.users[0].username} (Password is omitted: ${!searchData.users[0].password})`);

    // 6. PREVENT MESSAGING ONESELF
    console.log('\n[TEST 6] Prevent messaging self');
    const selfConvRes = await fetch(`${BASE_URL}/api/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`,
      },
      body: JSON.stringify({ participantId: aliceUser._id }),
    });
    if (selfConvRes.status !== 400) {
      throw new Error('Allowed messaging oneself');
    }
    console.log('✓ Messaging oneself correctly blocked with status 400');

    // 7. CREATE / GET CONVERSATION BETWEEN ALICE AND BOB
    console.log('\n[TEST 7] Start 1-to-1 conversation between Alice and Bob');
    const convRes = await fetch(`${BASE_URL}/api/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`,
      },
      body: JSON.stringify({ participantId: bobUser._id }),
    });
    const convData = await convRes.json();
    if (!convData.success || !convData.conversation) {
      throw new Error(`Conversation creation failed: ${JSON.stringify(convData)}`);
    }
    testConversationId = convData.conversation._id;
    console.log(`✓ Conversation created with ID: ${testConversationId}, participants: ${convData.conversation.participants.length}`);

    // 8. SEND MESSAGE
    console.log('\n[TEST 8] Send message REST endpoint');
    const msgRes = await fetch(`${BASE_URL}/api/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`,
      },
      body: JSON.stringify({
        conversationId: testConversationId,
        content: 'Hi Bob, this is a real-time message test!',
      }),
    });
    const msgData = await msgRes.json();
    if (!msgData.success || !msgData.message) {
      throw new Error(`Message sending failed: ${JSON.stringify(msgData)}`);
    }
    testMessageId = msgData.message._id;
    console.log(`✓ Message saved in MongoDB. ID: ${testMessageId}, Status: ${msgData.message.status}`);

    // 9. FETCH MESSAGES
    console.log('\n[TEST 9] Fetch messages in conversation');
    const fetchMsgsRes = await fetch(`${BASE_URL}/api/messages/${testConversationId}`, {
      headers: { Authorization: `Bearer ${bobToken}` },
    });
    const fetchMsgsData = await fetchMsgsRes.json();
    if (!fetchMsgsData.success || fetchMsgsData.messages.length === 0) {
      throw new Error('Failed to retrieve messages');
    }
    console.log(`✓ Retrieved ${fetchMsgsData.messages.length} message(s) for Bob from Alice`);

    // 10. MARK MESSAGES READ
    console.log('\n[TEST 10] Mark message as read by receiver');
    const readRes = await fetch(`${BASE_URL}/api/messages/${testMessageId}/read`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bobToken}`,
      },
      body: JSON.stringify({ conversationId: testConversationId }),
    });
    const readData = await readRes.json();
    if (!readData.success) throw new Error('Mark as read failed');
    console.log(`✓ Message status marked as read: ${readData.modifiedCount} updated`);

    // 11. SOCKET.IO REAL-TIME DELIVERY TEST
    console.log('\n[TEST 11] Socket.IO real-time connection and messaging test');
    const socketAlice = ClientIO(BASE_URL, {
      auth: { token: aliceToken },
      transports: ['websocket'],
    });
    const socketBob = ClientIO(BASE_URL, {
      auth: { token: bobToken },
      transports: ['websocket'],
    });

    await new Promise((resolve, reject) => {
      let aliceConnected = false;
      let bobConnected = false;

      const checkBoth = () => {
        if (aliceConnected && bobConnected) resolve();
      };

      socketAlice.on('connect', () => {
        aliceConnected = true;
        checkBoth();
      });
      socketBob.on('connect', () => {
        bobConnected = true;
        checkBoth();
      });

      setTimeout(() => reject(new Error('Socket connection timed out')), 5000);
    });
    console.log('✓ Both Alice and Bob authenticated sockets connected!');

    // Bob joins conversation room
    socketBob.emit('join_conversation', { conversationId: testConversationId });

    // Send real-time socket message from Alice to Bob
    const socketMsgReceived = await new Promise((resolve, reject) => {
      socketBob.on('receive_message', (msg) => {
        if (msg.content === 'Real-time Socket.IO test message from Alice!') {
          resolve(msg);
        }
      });

      socketAlice.emit('send_message', {
        conversationId: testConversationId,
        content: 'Real-time Socket.IO test message from Alice!',
        tempId: 'temp_test_123',
      });

      setTimeout(() => reject(new Error('Socket message receipt timed out')), 6000);
    });

    console.log(`✓ Bob received real-time socket message: "${socketMsgReceived.content}"!`);

    socketAlice.disconnect();
    socketBob.disconnect();

    // 12. DELETE OWN MESSAGE
    console.log('\n[TEST 12] Delete own message');
    const delRes = await fetch(`${BASE_URL}/api/messages/${testMessageId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${aliceToken}` },
    });
    const delData = await delRes.json();
    if (!delData.success) throw new Error('Delete message failed');
    console.log('✓ Message marked deletedForEveryone successfully');

    console.log('\n======================================================');
    console.log(' ALL 12 TESTS PASSED PERFECTLY WITH ZERO FAILURES! ');
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err);
    process.exit(1);
  } finally {
    await disconnectDB();
    server.close();
    process.exit(0);
  }
};

runTests();

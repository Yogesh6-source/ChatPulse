# ChatPulse — Modern Real-Time Private Messaging Web Application

A full-stack, production-ready real-time private messaging web application inspired by **WhatsApp Web** and **Instagram Direct Messages**. Features end-to-end user authentication, 1-to-1 encrypted conversations, instant real-time message delivery via Socket.IO, typing indicators, presence (online/last seen), delivery receipts, read receipts, image/file attachments, emoji support, profile management, and responsive dark/light themes.

---

## 🌟 Key Features

### 1. Real-Time Messaging (Socket.IO)
- **Instant Delivery**: Messages sent and received in real-time with sub-millisecond socket events.
- **Optimistic UI Updates**: Instant message rendering on sender's screen with seamless server confirmation and tempId deduplication.
- **Typing Indicators**: Real-time *"User is typing..."* bubble and animated indicator when the other participant types.
- **Presence & Online Status**: Automatic online/offline presence tracking with multi-tab/device socket management and *"Last seen at..."* timestamps.
- **Message Status Receipts**:
  - `✓` Sent (persisted in MongoDB)
  - `✓✓` Delivered (recipient is online)
  - `✓✓` (Blue/Teal) Read (recipient viewed the conversation)
- **Message Deletion**: Users can delete their own messages for everyone.

### 2. Modern WhatsApp & Instagram Web UI/UX
- **Responsive Layout**: Seamless on desktop, tablet, and mobile (with intuitive back-navigation on mobile).
- **Theme Switcher**: Instant Dark Mode and Light Mode with persistence in `localStorage`.
- **Custom Chat Wallpaper**: Subtle WhatsApp doodle pattern for an authentic, comfortable messaging feel.
- **Message Grouping**: Intelligent date dividers ("Today", "Yesterday", and formatted calendar dates).
- **Interactive Emoji Picker**: Categorized emojis with live search and quick insertion.
- **File & Image Attachments**: Drag-and-drop or file upload for photos, documents, PDFs with preview before sending.

### 3. Complete Authentication & Security
- **Secure Password Hashing**: Passwords encrypted with `bcryptjs` salt rounds (never stored in plain text).
- **JSON Web Tokens (JWT)**: Cryptographically signed tokens stored in `Authorization` headers and HTTP-only cookies.
- **Strict Authorization**: Verified participant validation on every conversation and message operation.
- **No Self-Messaging**: Backend and frontend prevent users from messaging themselves.
- **Rate Limiting**: Protects authentication and message delivery from brute force or spam.
- **Input Sanitization**: Rejects invalid formats, duplicates, and malformed ObjectIds.
- **Zero-Friction Database Fallback**: Automatically connects to local or remote MongoDB, with an embedded in-memory database fallback for instant local evaluation without prior MongoDB setup.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, React Router DOM, Axios, Socket.IO Client, Lucide React, date-fns |
| **Backend** | Node.js, Express.js, Socket.IO, MongoDB, Mongoose, JWT, bcryptjs, Multer, Helmet, CORS |
| **Database** | MongoDB / MongoDB Atlas (with automatic in-memory fallback for zero-dependency local runs) |

---

## 📂 Project Structure

```
messaging/
├── client/                     # Vite + React Frontend
│   ├── src/
│   │   ├── assets/             # Static icons and assets
│   │   ├── components/
│   │   │   ├── auth/           # Login & Register components
│   │   │   ├── chat/           # Sidebar, ChatPanel, MessageBubble, MessageInput, EmojiPicker
│   │   │   └── common/         # Avatar, Modal, Toast, ProtectedRoute
│   │   ├── context/            # AuthContext, ChatContext, ThemeContext
│   │   ├── pages/              # ChatPage, LoginPage, RegisterPage, NotFoundPage
│   │   ├── services/           # Axios API instance and Socket.IO client manager
│   │   ├── App.jsx             # React Router routing configuration
│   │   ├── index.css           # Tailwind directives and custom scrollbars
│   │   └── main.jsx            # React root mount
│   ├── tailwind.config.js      # Custom theme colors and animations
│   └── vite.config.js          # Vite config with backend proxy
│
├── server/                     # Express + Socket.IO Backend
│   ├── config/
│   │   └── db.js               # MongoDB connection with smart fallback
│   ├── controllers/
│   │   ├── authController.js   # Register, Login, Logout, Me
│   │   ├── userController.js   # Search, User Profile, Update
│   │   ├── conversationController.js # 1-to-1 conversation management
│   │   └── messageController.js      # Message history, sending, deleting, read receipts
│   ├── middleware/
│   │   ├── authMiddleware.js   # JWT authentication verification
│   │   ├── uploadMiddleware.js # Multer file and avatar handler
│   │   └── errorHandler.js     # Centralized error handler
│   ├── models/
│   │   ├── User.js             # User Mongoose model
│   │   ├── Conversation.js     # 1-to-1 conversation Mongoose model
│   │   └── Message.js          # Message Mongoose model
│   ├── routes/
│   │   ├── authRoutes.js       # /api/auth
│   │   ├── userRoutes.js       # /api/users
│   │   ├── conversationRoutes.js # /api/conversations
│   │   └── messageRoutes.js    # /api/messages
│   ├── sockets/
│   │   └── socketHandler.js    # Real-time Socket.IO events and room logic
│   ├── tests/
│   │   └── api.test.js         # Full automated E2E test suite
│   ├── server.js               # Express application entry point
│   ├── .env.example            # Environment variables template
│   └── .env                    # Active local environment variables
│
├── package.json                # Root automation scripts
└── README.md                   # Complete documentation
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** v18+ (tested on Node v24)
- **npm** v9+
- Optional: Local MongoDB instance or MongoDB Atlas connection string (if omitted, the app starts with its built-in in-memory database).

### 2. Environment Configuration
The server includes a pre-configured `.env` file. You can adjust it in `server/.env`:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/realtime_chat
JWT_SECRET=super_secret_jwt_key_realtime_chat_2026_modern_production
JWT_EXPIRES_IN=7d
MAX_FILE_SIZE_MB=10
```

### 3. Installation
To install dependencies for both client and server:

```bash
# From the project root
npm run install:all
```

Or individually:
```bash
cd server && npm install
cd ../client && npm install
```

### 4. Running the Application

**Option A: Running Server and Client separately:**
```bash
# Terminal 1: Backend Server
cd server
npm run dev

# Terminal 2: Frontend Client
cd client
npm run dev
```

**Option B: From root package.json:**
```bash
npm run dev:server
npm run dev:client
```

Once started:
- Frontend will be available at: **http://localhost:5173**
- Backend API will be available at: **http://localhost:5000**
- Health Check: **http://localhost:5000/api/health**

---

## 🧪 Automated Testing

A comprehensive end-to-end test suite tests all features:
- User registration and password hashing
- Duplicate prevention for emails and usernames
- Invalid login handling
- User directory search
- Preventing users from messaging themselves
- Starting 1-to-1 conversations
- Sending messages with MongoDB persistence
- Retrieving message history with pagination
- Real-time Socket.IO message transmission between two live client sockets
- Message delivery and read receipts
- Deleting own messages

Run the test suite with:
```bash
npm run test:server
# or
cd server && npm test
```

---

## 📡 Socket.IO Real-Time Events Reference

| Event Name | Direction | Payload | Description |
|---|---|---|---|
| `join_conversation` | Client → Server | `{ conversationId }` | Authenticated client joins room; marks unread messages as read |
| `leave_conversation`| Client → Server | `{ conversationId }` | Leaves conversation room |
| `send_message` | Client → Server | `{ conversationId, content, messageType, tempId }` | Saves to DB, then broadcasts to room |
| `receive_message` | Server → Client | `{ ...message, tempId }` | Delivers message to active participants |
| `typing` | Client → Server | `{ conversationId }` | Notifies other participant of typing activity |
| `stop_typing` | Client → Server | `{ conversationId }` | Clears typing indicator |
| `user_online` | Server → Client | `{ userId, fullName, username }` | Broadcasted when a user connects their first active socket |
| `user_offline` | Server → Client | `{ userId, lastSeen }` | Broadcasted when a user disconnects their last active socket |
| `messages_read_receipt` | Server → Client | `{ conversationId, readBy, readAt }` | Updates ticks to double blue checks |
| `message_deleted` | Server → Client | `{ messageId, conversationId }` | Real-time replacement with deleted message placeholder |

---

## 🔒 Security Best Practices Implemented

1. **Password Encryption**: Uses `bcryptjs` with salt rounds to prevent rainbow table attacks.
2. **JWT Authentication**: Secure token verification for both REST endpoints and Socket.IO handshakes.
3. **No Frontend Sender Impersonation**: Sender identity is strictly derived from the authenticated token on the server; client-provided sender IDs are never trusted.
4. **Conversation Authorization**: Every message read, sent, or deleted verifies participant membership in the database before proceeding.
5. **Rate Limiting**: `express-rate-limit` prevents brute-force login attempts and spam message flooding.
6. **File Upload Restrictions**: Multer middleware enforces strict MIME-type whitelisting and a 10MB size cap.
7. **Cross-Site Scripting (XSS) & Header Protection**: Helmet HTTP security headers configured with cross-origin resource policy.

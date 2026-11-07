# ChatPulse

ChatPulse is a real-time private messaging app built with React, Vite, Firebase, and Supabase Storage. Firebase Authentication manages accounts, Cloud Firestore stores user profiles/conversations/messages, and Firebase Realtime Database tracks online presence. Supabase Storage stores avatars and chat attachments. Firebase Cloud Messaging (FCM) and Cloud Functions provide background push notifications directly to mobile phones and browsers.

## Features

- Email/password authentication, password reset, and unique usernames
- Real-time 1-to-1 conversations and messages through Firestore listeners
- Online/last-seen presence, typing indicators, delivery/read receipts
- Image and file attachments (up to 10 MB)
- Mobile push notifications on lock screen (Android & iOS PWA) via FCM & Firebase Cloud Functions
- Profile editing, user search, dark/light themes, and responsive layout

## Push Notifications (Mobile & Web)

ChatPulse uses **Firebase Cloud Messaging (FCM)** and **Firebase Cloud Functions (2nd Gen)** to deliver push notifications directly to users' phones even when the browser or tab is closed.

### 1. Generate Web Push Certificate (VAPID Key)
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Select project **chatpulse-35264**.
3. Navigate to **Project Settings** > **Cloud Messaging**.
4. Under **Web configuration**, find **Web Push certificates** and click **Generate key pair**.
5. Copy the generated Key pair and add it to `client/.env.local` (and your Vercel environment variables):
   ```sh
   VITE_FIREBASE_VAPID_KEY=your_copied_vapid_key_here
   ```

### 2. Deploy Firestore Rules & Functions
From the repository root:

```sh
# Deploy updated security rules for users/{uid}/fcmTokens
npm run deploy:rules

# Deploy the background notification Cloud Function
npm run deploy:functions
```

### 3. How Users Enable Notifications on Phone
- **Android**: Open the ChatPulse website in Chrome/Edge, click the notification prompt banner or the Bell icon, and tap **Allow**. For an app-like experience, tap the 3 dots menu and select **Add to Home screen** / **Install app**.
- **iPhone / iOS (iOS 16.4+)**: Open the website in Safari, tap the **Share** button, and select **Add to Home Screen**. Launch the installed app icon from the Home Screen, click **Enable Notifications**, and tap **Allow**.

---

## Firebase setup

1. Create a Firebase project and register a Web app. Create a Supabase project for file storage.
2. Enable **Email/Password** in Authentication.
3. Create a Cloud Firestore database and a Realtime Database.
4. Copy `client/.env.example` to `client/.env.local` and fill in the Firebase Web app config. `VITE_FIREBASE_DATABASE_URL` is the URL shown for the Realtime Database.
5. In Supabase, add Firebase as a third-party auth provider using the Firebase project ID `chatpulse-35264`.
6. Run `supabase/setup.sql` in the Supabase SQL Editor to create the public avatar and private attachment buckets with access policies. Storage policies validate the Firebase issuer, project audience, and user ID; no custom Firebase claims are needed. Attachments are accessible to the Firebase users whose IDs are encoded in the object path; avatars are public profile images.
7. Deploy Firestore and Realtime Database rules from the repository root with the Firebase CLI:

   ```sh
   firebase use --add
   firebase deploy --only firestore:rules,database
   ```

   The deploy command requires the Firebase CLI and a selected project.

The Firebase Web config and Supabase publishable key are intended to be present in the browser. Access to Supabase Storage is protected by RLS policies that validate Firebase JWT claims; never put a Supabase secret/service-role key or Firebase service-account credentials in the client or commit them to the repository.

## Run locally

Requires Node.js 18+ and npm.

```sh
npm run install:all
```

Set up the Firebase environment file, then run:

```sh
npm run dev
```

The Vite development server starts at `http://localhost:5173`. To create a production build:

```sh
npm run build
```

Deploy the Vite client to Vercel (or another static host) and configure the `VITE_FIREBASE_*` and `VITE_SUPABASE_*` variables in its environment settings. The root `vercel.json` builds the client.

## Data model

- `users/{uid}`: public profile fields only; email and passwords remain managed by Firebase Authentication.
- `users/{uid}/fcmTokens/{tokenId}`: registered push device tokens for mobile phones and web browsers.
- `usernames/{username}`: unique username reservation mapped to a Firebase Auth UID.
- `conversations/{conversationId}`: participant UIDs, last message, and per-user unread counters.
- `conversations/{conversationId}/messages/{messageId}`: message content and delivery/read status.
- `conversations/{conversationId}/typing/{uid}`: ephemeral typing state, readable only by conversation participants.
- Realtime Database `status/{uid}`: online state and last-seen timestamp.
- Supabase Storage `chatpulse-avatars/avatars/{uid}/...`: public profile images with owner-only uploads.
- Supabase Storage `chatpulse-files/attachments/{participantUid1}/{participantUid2}/{conversationId}/...`: private chat attachments accessible to either participant. Signed URLs are generated when messages load and are not stored in Firestore.

Firebase Auth signs in with email; usernames remain unique and searchable but are not accepted as login identifiers. Firebase Authentication does not provide username/password login without a trusted server-side resolver.

## Existing MongoDB data

The legacy MongoDB/Express backend code has been removed. This does not delete records from the MongoDB database or files in the former server uploads folder; those remain untouched and are not used by the Firebase app. No MongoDB data has been imported into Firebase.

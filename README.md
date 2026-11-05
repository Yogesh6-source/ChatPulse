# ChatPulse

ChatPulse is a real-time private messaging app built with React, Vite, Firebase, and Supabase Storage. Firebase Authentication manages accounts, Cloud Firestore stores user profiles/conversations/messages, and Firebase Realtime Database tracks online presence. Supabase Storage stores avatars and chat attachments.

## Features

- Email/password authentication, password reset, and unique usernames
- Real-time 1-to-1 conversations and messages through Firestore listeners
- Online/last-seen presence, typing indicators, delivery/read receipts
- Image and file attachments (up to 10 MB)
- Profile editing, user search, dark/light themes, and responsive layout

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

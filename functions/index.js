const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

/**
 * Cloud Function triggered on new message creation in any conversation.
 * Dispatches Push Notifications to the recipient's registered devices.
 */
exports.sendMessageNotification = onDocumentCreated(
  'conversations/{conversationId}/messages/{messageId}',
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      console.log('No data associated with the event.');
      return null;
    }

    const message = snapshot.data();
    if (!message || message.deletedForEveryone) {
      return null;
    }

    const conversationId = event.params.conversationId;
    const senderId = message.senderId;
    let receiverId = message.receiverId;

    // Fallback: If receiverId is not directly on the message, retrieve from conversation
    if (!receiverId) {
      try {
        const convSnap = await db.collection('conversations').doc(conversationId).get();
        if (convSnap.exists) {
          const participantIds = convSnap.data()?.participantIds || [];
          receiverId = participantIds.find((id) => id !== senderId);
        }
      } catch (err) {
        console.error('Failed to fetch conversation document:', err);
      }
    }

    if (!receiverId || receiverId === senderId) {
      return null;
    }

    // 1. Fetch recipient's active FCM device tokens from subcollection
    const tokensSnapshot = await db
      .collection('users')
      .doc(receiverId)
      .collection('fcmTokens')
      .get();

    if (tokensSnapshot.empty) {
      console.log(`No registered push notification tokens found for user: ${receiverId}`);
      return null;
    }

    const tokenDocs = [];
    tokensSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && data.token && typeof data.token === 'string') {
        tokenDocs.push({ id: docSnap.id, token: data.token });
      }
    });

    if (tokenDocs.length === 0) {
      return null;
    }

    // 2. Prepare message text and sender details
    const senderName =
      message.sender?.fullName || message.sender?.username || 'Someone on ChatPulse';
    const senderAvatar = message.sender?.profilePicture || '/pwa-192x192.png';

    let bodyText = 'Sent you a message';
    if (message.messageType === 'image') {
      bodyText = '📷 Photo';
    } else if (message.messageType === 'file') {
      bodyText = message.fileName ? `📎 ${message.fileName}` : '📎 Attachment';
    } else if (message.content) {
      bodyText =
        message.content.length > 120
          ? `${message.content.slice(0, 117)}...`
          : message.content;
    }

    const destinationUrl = `/?c=${conversationId}`;

    // 3. Build FCM multicast payload
    const multicastPayload = {
      notification: {
        title: senderName,
        body: bodyText,
      },
      data: {
        conversationId,
        senderId,
        url: destinationUrl,
      },
      webpush: {
        headers: {
          Urgency: 'high',
        },
        notification: {
          title: senderName,
          body: bodyText,
          icon: senderAvatar,
          badge: '/pwa-192x192.png',
          tag: `conv_${conversationId}`,
          renotify: true,
          vibrate: [200, 100, 200],
          data: {
            url: destinationUrl,
            conversationId,
          },
        },
        fcmOptions: {
          link: destinationUrl,
        },
      },
      tokens: tokenDocs.map((t) => t.token),
    };

    try {
      console.log(`Sending push notification to ${tokenDocs.length} devices for user ${receiverId}...`);
      const response = await admin.messaging().sendEachForMulticast(multicastPayload);
      console.log(`FCM results: ${response.successCount} sent, ${response.failureCount} failed.`);

      // 4. Clean up invalid / unregistered tokens from Firestore
      const tokensToDelete = [];
      response.responses.forEach((resp, index) => {
        if (!resp.success && resp.error) {
          const errCode = resp.error.code;
          if (
            errCode === 'messaging/registration-token-not-registered' ||
            errCode === 'messaging/invalid-registration-token' ||
            errCode === 'messaging/invalid-argument'
          ) {
            tokensToDelete.push(tokenDocs[index].id);
          }
        }
      });

      if (tokensToDelete.length > 0) {
        console.log(`Cleaning up ${tokensToDelete.length} stale FCM tokens...`);
        const batch = db.batch();
        tokensToDelete.forEach((docId) => {
          const ref = db.collection('users').doc(receiverId).collection('fcmTokens').doc(docId);
          batch.delete(ref);
        });
        await batch.commit();
      }

      return { success: true, count: response.successCount };
    } catch (sendError) {
      console.error('Error dispatching multicast FCM notification:', sendError);
      return null;
    }
  }
);

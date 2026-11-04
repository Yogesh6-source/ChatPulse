import mongoose from 'mongoose';

let mongoMemoryServer = null;

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/realtime_chat';

  try {
    // Attempt local or remote MongoDB connection with 2-second timeout
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500,
    });
    console.log(`[Database] Connected successfully to MongoDB at: ${uri}`);
  } catch (err) {
    console.warn(`[Database] Could not connect to MongoDB URI (${uri}): ${err.message}`);
    console.log('[Database] Starting embedded in-memory MongoDB server as fallback...');

    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongoMemoryServer = await MongoMemoryServer.create({
        instance: {
          launchTimeout: 90000, // 90s for first-time binary launch/extract
        },
        binary: {
          version: '7.0.14',
        },
      });
      const memoryUri = mongoMemoryServer.getUri();
      await mongoose.connect(memoryUri);
      console.log(`[Database] In-memory MongoDB connected successfully at: ${memoryUri}`);
    } catch (memErr) {
      console.error('[Database] Failed to initialize in-memory MongoDB:', memErr);
      process.exit(1);
    }
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (mongoMemoryServer) {
      await mongoMemoryServer.stop();
    }
    console.log('[Database] Disconnected from MongoDB');
  } catch (error) {
    console.error('[Database] Error disconnecting MongoDB:', error);
  }
};

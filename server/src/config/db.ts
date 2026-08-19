import mongoose from 'mongoose';
import { config } from './index';

export async function connectDb(): Promise<void> {
  mongoose.connection.on('connected', () => {
    console.log('[db] mongo connected');
  });
  mongoose.connection.on('error', (err) => {
    console.error('[db] mongo error', err);
  });
  await mongoose.connect(config.mongodbUri, {
    serverSelectionTimeoutMS: 10000,
  });
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
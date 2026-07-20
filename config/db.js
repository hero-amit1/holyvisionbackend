/**
 * @file config/db.js
 * @description MongoDB connection management via Mongoose.
 *
 * Call `connectDB()` once at startup. The connection is reused for the
 * lifetime of the process; do not call this in hot-reload contexts.
 */

import mongoose from 'mongoose';
import { MONGO_URI, NODE_ENV } from './env.js';

// Suppress the `strictQuery` deprecation warning in Mongoose 7+
mongoose.set('strictQuery', true);

/**
 * Establish a MongoDB connection and return the Mongoose instance.
 * Logs success/failure to stdout so startup diagnostics are obvious.
 *
 * @returns {Promise<typeof mongoose>}
 */
export async function connectDB() {
  try {
    const conn = await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5_000,
      socketTimeoutMS:          45_000,
    });

    const { host, port, name } = conn.connection;
    console.info(`[DB] Connected  ${host}:${port}/${name}  (${NODE_ENV})`);

    // Surface warnings (e.g. deprecated options) in development only
    if (NODE_ENV !== 'production') {
      mongoose.connection.on('error', (err) =>
        console.error('[DB] Connection error:', err.message),
      );
    }

    return conn;
  } catch (err) {
    console.error('[DB] Failed to connect:', err.message);
    throw err; // let the caller (server.js) decide whether to exit
  }
}

/**
 * Gracefully close the MongoDB connection.
 * Called during process shutdown to drain in-flight operations.
 *
 * @returns {Promise<void>}
 */
export async function disconnectDB() {
  await mongoose.connection.close(false);
  console.info('[DB] Connection closed.');
}

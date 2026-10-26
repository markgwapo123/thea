import 'dotenv/config';
import mongoose from 'mongoose';
import {
  User, Club, ClubStaff, Application, Membership,
  Announcement, Notification, AuditLog, Setting
} from './models.js';

// Creates only missing THE HAVEN collections and model indexes.
// Does not seed dummy clubs, create users, alter existing documents, or print secrets.
const dbName = process.env.MONGODB_DB_NAME || 'the_haven_db';
const uri = process.env.MONGODB_URI;
if (!uri || /YOUR_|<[^>]+>|REPLACE_WITH_/.test(uri)) {
  console.error('Missing private MONGODB_URI. Configure it using a GitHub Actions secret or private backend/.env.');
  process.exit(1);
}

const models = [
  User, Club, ClubStaff, Application, Membership,
  Announcement, Notification, AuditLog, Setting
];

try {
  await mongoose.connect(uri, {
    dbName,
    serverSelectionTimeoutMS: 12000,
    autoIndex: false,
    autoCreate: false
  });
  if (mongoose.connection.name !== dbName) {
    throw new Error('Incorrect database selected');
  }

  const db = mongoose.connection.db;
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map(c => c.name));
  console.log('Initializing MongoDB collections in: ' + dbName);

  for (const model of models) {
    const collectionName = model.collection.name;
    if (!existing.has(collectionName)) {
      await db.createCollection(collectionName);
      console.log('Created collection: ' + collectionName);
    } else {
      console.log('Existing collection preserved: ' + collectionName);
    }
    // Re-running createIndexes is safe; definitions come from our Mongoose schemas.
    await model.createIndexes();
    console.log('Indexes ensured for: ' + collectionName);
  }
  console.log('THE HAVEN database initialized successfully. No student or admin data was added.');
} catch (error) {
  // Do not print driver error details; they can reveal connection metadata.
  console.error('Database initialization failed: ' + (error?.name || 'UnknownError'));
  console.error('Verify GitHub Actions MONGODB_URI secret, Atlas IP access, roles, and existing index conflicts.');
  process.exitCode = 1;
} finally {
  await mongoose.disconnect().catch(() => {});
}

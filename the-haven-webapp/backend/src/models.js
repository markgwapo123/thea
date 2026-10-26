import mongoose from 'mongoose';
const { Schema, model } = mongoose;
const base = { timestamps: true };

const userSchema = new Schema({
  fullName: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, lowercase: true, trim: true, unique: true },
  studentId: { type: String, unique: true, sparse: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  department: { type: String, trim: true, maxlength: 100, default: '' },
  yearLevel: { type: String, trim: true, maxlength: 40, default: '' },
  // Required on NEW student registrations; defaults preserve existing accounts.
  age: { type: Number, min: 13, max: 100, default: null },
  address: { type: String, trim: true, maxlength: 200, default: '' },
  skills: { type: String, trim: true, maxlength: 500, default: '' },
  talents: { type: String, trim: true, maxlength: 500, default: '' },
  joinReason: { type: String, trim: true, maxlength: 1200, default: '' },
  role: { type: String, enum: ['student', 'admin'], default: 'student' },
  // Registered students require administrator approval before accessing the portal.
  status: { type: String, enum: ['pending','active','rejected','disabled'], default: 'pending' },
  registrationNote: { type: String, maxlength: 300, default: '' },
  approvedAt: { type: Date, default: null },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
}, base);

const clubSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, required: true, trim: true, maxlength: 1400 },
  tagline: { type: String, trim: true, maxlength: 180, default: '' },
  capacity: { type: Number, min: 1, default: 50 },
  memberCount: { type: Number, min: 0, default: 0 },
  meetingSchedule: { type: String, trim: true, maxlength: 120, default: 'To be announced' },
  status: { type: String, enum: ['open', 'closed', 'archived'], default: 'open' },
  accent: { type: String, enum: ['gold', 'rose', 'sage', 'blue'], default: 'gold' }
}, base);

const staffSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  clubId: { type: Schema.Types.ObjectId, ref: 'Club', required: true },
  role: { type: String, enum: ['officer', 'adviser'], required: true }
}, base);
staffSchema.index({ userId: 1, clubId: 1, role: 1 }, { unique: true });

const applicationSchema = new Schema({
  studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  clubId: { type: Schema.Types.ObjectId, ref: 'Club', required: true },
  academicYear: { type: String, required: true },
  motivation: { type: String, required: true, trim: true, maxlength: 1000 },
  status: { type: String, enum: ['pending', 'under_review', 'approved', 'rejected', 'waitlisted', 'cancelled'], default: 'pending' },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  remarks: { type: String, default: '', maxlength: 500 },
  reviewedAt: { type: Date, default: null }
}, base);
applicationSchema.index({ studentId: 1, clubId: 1, academicYear: 1 }, { unique: true });
applicationSchema.index({ clubId: 1, status: 1, createdAt: -1 });

const membershipSchema = new Schema({
  studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  clubId: { type: Schema.Types.ObjectId, ref: 'Club', required: true },
  academicYear: { type: String, required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  joinedAt: { type: Date, default: Date.now }
}, base);
membershipSchema.index({ studentId: 1, clubId: 1, academicYear: 1 }, { unique: true });

const announcementSchema = new Schema({
  clubId: { type: Schema.Types.ObjectId, ref: 'Club', default: null },
  authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  body: { type: String, required: true, trim: true, maxlength: 3000 }
}, base);

const notificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false }
}, base);
notificationSchema.index({ userId: 1, createdAt: -1 });

const auditSchema = new Schema({
  actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  entityType: String,
  entityId: Schema.Types.ObjectId,
  details: String
}, base);

const settingSchema = new Schema({
  key: { type: String, unique: true, required: true },
  value: { type: Schema.Types.Mixed }
}, base);

export const User = model('User', userSchema);
export const Club = model('Club', clubSchema);
export const ClubStaff = model('ClubStaff', staffSchema);
export const Application = model('Application', applicationSchema);
export const Membership = model('Membership', membershipSchema);
export const Announcement = model('Announcement', announcementSchema);
export const Notification = model('Notification', notificationSchema);
export const AuditLog = model('AuditLog', auditSchema);
export const Setting = model('Setting', settingSchema);

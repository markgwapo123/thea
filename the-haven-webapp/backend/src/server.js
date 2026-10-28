import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { User, Club, ClubStaff, Application, Membership, Announcement, Notification, AuditLog, Setting } from './models.js';

if (!process.env.MONGODB_URI || !process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('Required: MONGODB_URI and a JWT_SECRET with at least 32 characters.');
  process.exit(1);
}
const app = express();
app.set('trust proxy', 1);
const production = process.env.NODE_ENV === 'production';
// Optional single-origin service: Render can serve both the frontend and API.
// The normal standalone frontend stays in demo mode until a real host is configured.
const serveFrontend = process.env.SERVE_FRONTEND === 'true';
const ownOrigin = process.env.PUBLIC_BASE_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:4000';
const origins = [...new Set([...(process.env.FRONTEND_ORIGINS || 'http://localhost:4000').split(','), ownOrigin].map(s => s.trim()).filter(Boolean))];
const csp = production && serveFrontend ? {
  directives: {
    defaultSrc: ["'self'"],
    baseUri: ["'self'"],
    scriptSrc: ["'self'"],
    connectSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    imgSrc: ["'self'", 'data:'],
    objectSrc: ["'none'"],
    frameAncestors: ["'none'"],
    upgradeInsecureRequests: []
  }
} : production ? undefined : false;
app.use(helmet({ contentSecurityPolicy: csp }));
app.use(cors({ origin(origin, cb) { if (!origin || origins.includes(origin)) return cb(null, true); cb(new Error('Origin not allowed')); }, credentials: true }));
// Require approved web origins for state-changing cross-site requests.
app.use((req, res, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin && !origins.includes(req.headers.origin)) {
    return res.status(403).json({ error: 'Unapproved browser origin.' });
  }
  next();
});
// Allow small admin-uploaded brand logos as base64; reject oversized requests.
app.use(express.json({ limit: '600kb' }));
app.use(cookieParser());
const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 25, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many attempts. Try again later.' } });
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const validId = id => mongoose.isValidObjectId(id);
const safe = u => ({
  _id:u._id, fullName:u.fullName, email:u.email, studentId:u.studentId||'',
  yearLevel:u.yearLevel, department:u.department,
  age:u.age??null, address:u.address||'', skills:u.skills||'',
  talents:u.talents||'', joinReason:u.joinReason||'',
  role:u.role, status:u.status, registrationNote:u.registrationNote||''
});
// For a single-origin app, Lax cookies avoid unnecessary third-party cookie blocking.
// Set CROSS_SITE_COOKIES=true only when a separately hosted HTTPS frontend is approved.
const cookieSameSite = process.env.CROSS_SITE_COOKIES === 'true' ? 'none' : 'lax';
const cookieOpts = { httpOnly: true, secure: production || cookieSameSite === 'none', sameSite: cookieSameSite, path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 };
const clean = (v, max = 150) => String(v ?? '').trim().slice(0, max);
const fail = (res, msg, code = 400) => res.status(code).json({ error: msg });
const year = async () => (await Setting.findOne({ key: 'academicYear' }))?.value || '2026–2027';

const DEFAULT_LANDING = {
  eyebrow:'WHAT WE BELIEVE IN',
  heading:'Your community starts here.',
  intro:'One welcoming place to discover shared interests, connect with fellow students, and follow your application journey.',
  cards:[
    {title:'Meaningful Connections',description:'Discover a welcoming community built around listening, understanding, and support.'},
    {title:'Growth & Leadership',description:'Explore opportunities to learn new skills and develop as a student facilitator.'},
    {title:'Simple Registration',description:'Apply online, receive updates, and track your club journey in one convenient place.'}
  ]
};
const landingPage = async () => (await Setting.findOne({ key:'landingPage' }))?.value || DEFAULT_LANDING;
const DEFAULT_BRANDING = { name: "THE HAVEN: PEER FACILITATORS' COMMUNITY", logoDataUrl: null };
const branding = async () => ({...DEFAULT_BRANDING, ...((await Setting.findOne({key:'branding'}))?.value || {})});
const brandImageLimit = 350 * 1024;  // 350 KB after base64 decoding
const validBrandImage = uri => {
  if(typeof uri !== 'string')return false;
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(uri);
  if(!match || match[2].length > Math.ceil(brandImageLimit * 4 / 3) + 8)return false;
  const bytes = Buffer.from(match[2],'base64');
  if(!bytes.length || bytes.length > brandImageLimit || bytes.toString('base64') !== match[2])return false;
  if(match[1] === 'png') return bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'));
  if(match[1] === 'jpeg') return bytes[0]===0xff && bytes[1]===0xd8 && bytes[2]===0xff;
  return bytes.toString('ascii',0,4)==='RIFF' && bytes.toString('ascii',8,12)==='WEBP';
};
const validLandingText = (value,min,max) => typeof value==='string' && value.trim().length>=min && value.trim().length<=max;
const audit = async (actorId, action, entityType, entityId, details = '') => AuditLog.create({ actorId, action, entityType, entityId, details });
const notify = async (userId, title, message) => Notification.create({ userId, title, message });

// Pending/rejected users may identify themselves to view their registration status.
const sessionAuth = wrap(async (req, res, next) => {
  const token = req.cookies.haven_token;
  if (!token) return fail(res, 'Please sign in.', 401);
  let payload;
  try { payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }); }
  catch { return fail(res, 'Session expired. Please sign in.', 401); }
  const user = await User.findById(payload.sub);
  if (!user || user.status === 'disabled') return fail(res, 'Account unavailable.', 401);
  req.user = user;
  next();
});
const auth = (req, res, next) => sessionAuth(req, res, () => (
  req.user.status === 'active' ? next() : fail(res, 'Administrator approval required before accessing the dashboard.', 403)
));
const onlyAdmin = (req, res, next) => req.user.role === 'admin' ? next() : fail(res, 'Administrator permission required.', 403);
const onlyManager = wrap(async (req, res, next) => {
  if (req.user.role === 'admin' || await ClubStaff.exists({ userId: req.user._id })) return next();
  return fail(res, 'Club staff or administrator permission required.', 403);
});
const scopeIds = async user => user.role === 'admin' ? null : (await ClubStaff.find({ userId: user._id })).map(x => x.clubId);
const canReview = async (user, clubId) => user.role === 'admin' || !!(await ClubStaff.exists({ userId: user._id, clubId, role: 'adviser' }));
const canManage = async (user, clubId) => user.role === 'admin' || !!(await ClubStaff.exists({ userId: user._id, clubId }));

app.get('/api/health', (req, res) => res.status(mongoose.connection.readyState === 1 ? 200 : 503).json({ status: mongoose.connection.readyState === 1 ? 'ok' : 'database_unavailable', timestamp: new Date().toISOString() }));
app.post('/api/auth/register', authLimit, wrap(async (req, res) => {
  const fullName=clean(req.body.fullName,100);
  const email=clean(req.body.email,254).toLowerCase();
  const studentId=clean(req.body.studentId,50);
  const password=String(req.body.password||'');
  const age=Number(req.body.age);
  const address=clean(req.body.address,300);
  const skills=clean(req.body.skills,400);
  const talents=clean(req.body.talents,400);
  const joinReason=clean(req.body.joinReason,1000);
  if(fullName.length<2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !studentId || password.length<8 || password.length>128)
    return fail(res,'Enter your name, valid email, student ID and password (8–128 characters).');
  if(!Number.isInteger(age)||age<15||age>100)
    return fail(res,'Enter a valid age between 15 and 100.');
  if(address.length<5||skills.length<2||talents.length<2||joinReason.length<15)
    return fail(res,'Please complete your address, skills, talents and reason for joining (at least 15 characters for your reason).');
  const user=await User.create({
    fullName,email,studentId,passwordHash:await bcrypt.hash(password,12),
    department:clean(req.body.department,100),yearLevel:clean(req.body.yearLevel,40),
    age,address,skills,talents,joinReason,
    role:'student',status:'pending'
  });
  res.cookie('haven_token',jwt.sign({sub:String(user._id)},process.env.JWT_SECRET,{expiresIn:'7d'}),cookieOpts);
  res.status(201).json({user:safe(user),message:'Registration submitted. An administrator must approve your account.'});
}));
app.post('/api/auth/login', authLimit, wrap(async (req, res) => {
  const email = clean(req.body.email, 254).toLowerCase();
  const user = await User.findOne({ email }).select('+passwordHash');
  const matches = user ? await bcrypt.compare(String(req.body.password || ''), user.passwordHash) : await bcrypt.compare(String(req.body.password || ''), '$2a$12$7EqJtq98hPqEX7fNZaFWoOMghwbxAmqszuRvMyZyB4bwbF/4IyLJa');
  if (!user || !matches || user.status === 'disabled') return fail(res, 'Incorrect email or password.', 401);
  res.cookie('haven_token', jwt.sign({ sub: String(user._id) }, process.env.JWT_SECRET, { expiresIn: '7d' }), cookieOpts);
  res.json({ user: safe(user) });
}));
app.post('/api/auth/logout', (req, res) => { res.clearCookie('haven_token', { ...cookieOpts, maxAge: undefined }); res.json({ ok: true }); });
app.get('/api/me', sessionAuth, wrap(async (req, res) => {
  res.set('Cache-Control', 'private, no-store');
  res.json({ user: safe(req.user), staff: await ClubStaff.find({ userId: req.user._id }).populate('clubId', 'name') });
}));


// User-only profile updates. Never accept role, status or approval fields from the client.
app.put('/api/me/profile', auth, wrap(async (req, res) => {
  const fullName = clean(req.body.fullName, 100);
  const department = clean(req.body.department, 100);
  const yearLevel = clean(req.body.yearLevel, 40);
  if(fullName.length < 2) return fail(res, 'Full name must contain at least two characters.');
  req.user.fullName = fullName;
  req.user.department = department;
  req.user.yearLevel = yearLevel;
  // Student-owned profile details; role and approval status are never editable.
  if(req.user.role==='student'){
    const ageInput=String(req.body.age??'').trim();
    const age=ageInput===''?null:Number(ageInput);
    const address=clean(req.body.address,300);
    const skills=clean(req.body.skills,400);
    const talents=clean(req.body.talents,400);
    const joinReason=clean(req.body.joinReason,1000);
    if(age!==null&&(!Number.isInteger(age)||age<15||age>100))
      return fail(res,'Enter a valid age between 15 and 100.');
    req.user.age=age;
    req.user.address=address;
    req.user.skills=skills;
    req.user.talents=talents;
    req.user.joinReason=joinReason;
  }
  await req.user.save();
  await audit(req.user._id,'profile_updated','User',req.user._id);
  res.json({user:safe(req.user)});
}));
app.put('/api/me/password', auth, authLimit, wrap(async (req, res) => {
  const currentPassword=String(req.body.currentPassword||'');
  const newPassword=String(req.body.newPassword||'');
  if(newPassword.length < 8 || newPassword.length > 128) return fail(res,'New password must contain 8 to 128 characters.');
  const user=await User.findById(req.user._id).select('+passwordHash');
  if(!await bcrypt.compare(currentPassword,user.passwordHash))return fail(res,'Current password incorrect.',403);
  user.passwordHash=await bcrypt.hash(newPassword,12);
  await user.save();
  await audit(req.user._id,'password_changed','User',req.user._id);
  res.json({ok:true});
}));

app.get('/api/clubs', wrap(async (req, res) => {
  const clubs = await Club.find({ status: { $ne: 'archived' } }).sort({ createdAt: 1 }).lean();
  res.json({ clubs });
}));
// Administrators can manage even archived clubs; the public directory stays unchanged.
app.get('/api/admin/clubs', auth, onlyAdmin, wrap(async (req, res) => {
  const clubs = await Club.find().sort({ createdAt: 1 }).lean();
  res.json({ clubs });
}));
app.post('/api/clubs', auth, onlyAdmin, wrap(async (req, res) => {
  const name = clean(req.body.name, 120), description = clean(req.body.description, 1400), category = clean(req.body.category, 80);
  const capacity = Number(req.body.capacity);
  if (!name || !description || !category || !Number.isSafeInteger(capacity) || capacity < 1) return fail(res, 'Name, category, description, and a valid capacity are required.');
  const club = await Club.create({ name, category, description, capacity, tagline: clean(req.body.tagline, 180), meetingSchedule: clean(req.body.meetingSchedule, 120) || 'To be announced', accent: ['gold','rose','sage','blue'].includes(req.body.accent) ? req.body.accent : 'gold' });
  await audit(req.user._id, 'club_created', 'Club', club._id);
  res.status(201).json({ club });
}));
app.patch('/api/clubs/:id', auth, onlyAdmin, wrap(async (req, res) => {
  if (!validId(req.params.id)) return fail(res, 'Invalid club ID.');
  const club = await Club.findById(req.params.id);
  if (!club) return fail(res, 'Club not found.', 404);
  for (const f of ['name','category','description','tagline','meetingSchedule']) if (req.body[f] !== undefined) club[f] = clean(req.body[f], f === 'description' ? 1400 : 180);
  if (req.body.capacity !== undefined) {
    const n = Number(req.body.capacity);
    if (!Number.isSafeInteger(n) || n < club.memberCount || n < 1) return fail(res, 'Capacity must be at least the existing member count and greater than zero.');
    club.capacity = n;
  }
  if (req.body.status !== undefined) {
    if (!['open','closed','archived'].includes(req.body.status)) return fail(res, 'Invalid status.');
    club.status = req.body.status;
  }
  if (req.body.accent !== undefined && ['gold','rose','sage','blue'].includes(req.body.accent)) club.accent = req.body.accent;
  await club.save();
  await audit(req.user._id, 'club_updated', 'Club', club._id);
  res.json({ club });
}));

app.get('/api/applications', auth, onlyAdmin, wrap(async (req, res) => {
  let filter = {};
  if (req.query.mine === '1') filter.studentId = req.user._id;
  else if (req.user.role !== 'admin') {
    const scopes = (await ClubStaff.find({ userId: req.user._id })).map(x => x.clubId);
    if (!scopes.length) return fail(res, 'Club staff or administrator permission required to view all applications.', 403);
    filter.clubId = { $in: scopes };
  }
  const applications = await Application.find(filter).populate('studentId', 'fullName email studentId department yearLevel').populate('clubId', 'name category capacity memberCount').sort({ createdAt: -1 }).lean();
  res.json({ applications });
}));
app.post('/api/applications', auth, onlyAdmin, wrap(async (req, res) => {
  if (!validId(req.body.clubId)) return fail(res, 'Select a valid club.');
  const club = await Club.findById(req.body.clubId);
  if (!club || club.status !== 'open') return fail(res, 'Registration is not open for this club.');
  const motivation = clean(req.body.motivation, 1000);
  if (motivation.length < 15) return fail(res, 'Please enter at least 15 characters for your motivation.');
  const academicYear = await year();
  const exists = await Application.exists({ studentId: req.user._id, clubId: club._id, academicYear });
  if (exists) return fail(res, 'You have already applied to this club for this academic year.', 409);
  const application = await Application.create({ studentId: req.user._id, clubId: club._id, academicYear, motivation, status: club.memberCount >= club.capacity ? 'waitlisted' : 'pending' });
  await notify(req.user._id, 'Application submitted', `${club.name}: Your application is ${application.status === 'waitlisted' ? 'waitlisted because this club is full' : 'pending review'}.`);
  await audit(req.user._id, 'application_submitted', 'Application', application._id);
  res.status(201).json({ application });
}));
app.patch('/api/applications/:id/cancel', auth, onlyAdmin, wrap(async (req, res) => {
  if (!validId(req.params.id)) return fail(res, 'Invalid application ID.');
  const application = await Application.findOneAndUpdate({ _id: req.params.id, status: { $in: ['pending','waitlisted'] } }, { $set: { status: 'cancelled' } }, { new: true });
  if (!application) return fail(res, 'Only pending or waitlisted applications may be cancelled.', 409);
  await audit(req.user._id, 'application_cancelled', 'Application', application._id);
  res.json({ application });
}));
app.patch('/api/applications/:id/review', auth, onlyAdmin, wrap(async (req, res) => {
  if (!validId(req.params.id)) return fail(res, 'Invalid application ID.');
  const status = req.body.status;
  if (!['approved','rejected','waitlisted','under_review'].includes(status)) return fail(res, 'Invalid review decision.');
  const current = await Application.findById(req.params.id).populate('clubId', 'name');
  if (!current) return fail(res, 'Application not found.', 404);
  if (!(await canReview(req.user, current.clubId._id))) return fail(res, 'Assigned adviser or administrator required.', 403);
  if (!['pending','waitlisted','under_review'].includes(current.status)) return fail(res, 'Application already finalized.', 409);
  const remarks = clean(req.body.remarks, 500);
  let finalStatus = status;
  if (status === 'approved') {
    // Atomic club-capacity increment; MongoDB Atlas transactions keep all 3 records consistent.
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const appRow = await Application.findOne({ _id: current._id, status: { $in: ['pending','waitlisted','under_review'] } }).session(session);
        if (!appRow) throw Object.assign(new Error('Application was already reviewed.'), { statusCode: 409 });
        const slot = await Club.findOneAndUpdate({ _id: current.clubId._id, status: { $ne: 'archived' }, $expr: { $lt: ['$memberCount','$capacity'] } }, { $inc: { memberCount: 1 } }, { new: true, session });
        if (!slot) throw Object.assign(new Error('Club capacity reached. Choose Waitlisted.'), { statusCode: 409 });
        await Membership.create([{ studentId: appRow.studentId, clubId: appRow.clubId, academicYear: appRow.academicYear }], { session });
        appRow.status = 'approved'; appRow.remarks = remarks; appRow.reviewedAt = new Date(); appRow.reviewedBy = req.user._id;
        await appRow.save({ session });
      });
    } finally { await session.endSession(); }
  } else {
    const updated = await Application.findOneAndUpdate({ _id: current._id, status: { $in: ['pending','waitlisted','under_review'] } }, { $set: { status, remarks, reviewedBy: req.user._id, reviewedAt: new Date() } }, { new: true });
    if (!updated) return fail(res, 'Application was already reviewed.', 409);
  }
  await notify(current.studentId, 'Application update', `${current.clubId.name}: Your application is now ${finalStatus.replace('_',' ')}.${remarks ? ' Note: ' + remarks : ''}`);
  await audit(req.user._id, 'application_reviewed', 'Application', current._id, finalStatus);
  res.json({ ok: true, status: finalStatus });
}));

app.get('/api/memberships', auth, onlyAdmin, wrap(async (req, res) => {
  let filter;
  if (req.query.all === '1') {
    if (req.user.role !== 'admin') return fail(res, 'Administrator permission required to view all memberships.', 403);
    if (req.query.clubId) return fail(res, 'Choose all memberships or one club, not both.');
    filter = {};
  } else if (req.query.clubId) {
    if (!validId(req.query.clubId) || !(await canManage(req.user, req.query.clubId))) return fail(res, 'Not authorized for club members.', 403);
    filter = { clubId: req.query.clubId };
  } else filter = { studentId: req.user._id };
  const page = Number(req.query.page || 1);
  if (req.query.all === '1' && (!Number.isSafeInteger(page) || page < 1 || page > 100000)) return fail(res, 'Invalid membership page.');
  const pageSize = 100;
  const query = Membership.find(filter).populate('studentId', 'fullName studentId department yearLevel').populate('clubId', 'name category').sort({ joinedAt: -1 });
  if (req.query.all === '1') {
    const [memberships, total] = await Promise.all([query.skip((page - 1) * pageSize).limit(pageSize), Membership.countDocuments(filter)]);
    return res.json({ memberships, pagination: { page, pageSize, total, pages: Math.max(1, Math.ceil(total / pageSize)) } });
  }
  const memberships = await query;
  res.json({ memberships });
}));
app.get('/api/staff', auth, onlyAdmin, wrap(async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { userId: req.user._id };
  const staff = await ClubStaff.find(filter).populate('userId', 'fullName email').populate('clubId', 'name');
  res.json({ staff });
}));
app.post('/api/staff', auth, onlyAdmin, wrap(async (req, res) => {
  if (!validId(req.body.userId) || !validId(req.body.clubId) || !['adviser','officer'].includes(req.body.role)) return fail(res, 'Valid user, club and staff role required.');
  if (!(await User.exists({ _id: req.body.userId, status:'active', role:'student' })) || !(await Club.exists({ _id: req.body.clubId, status: { $ne:'archived' } }))) return fail(res, 'Approved user or club not found.', 404);
  const staff = await ClubStaff.findOneAndUpdate({ userId: req.body.userId, clubId: req.body.clubId, role: req.body.role }, { $setOnInsert: { userId: req.body.userId, clubId: req.body.clubId, role: req.body.role } }, { upsert: true, new: true });
  await audit(req.user._id, 'club_staff_assigned', 'ClubStaff', staff._id);
  res.status(201).json({ staff });
}));


app.delete('/api/staff/:id',auth,onlyAdmin,wrap(async(req,res)=>{
  if(!validId(req.params.id))return fail(res,'Invalid staff assignment.');
  const staff=await ClubStaff.findByIdAndDelete(req.params.id);
  if(!staff)return fail(res,'Staff assignment not found.',404);
  await audit(req.user._id,'club_staff_removed','ClubStaff',staff._id);
  res.json({ok:true});
}));
// Approved accounts may view public-facing leadership names for each club.
app.get('/api/leadership',auth,wrap(async(req,res)=>{
  const staff=await ClubStaff.find().populate('userId','fullName status').populate('clubId','name status').lean();
  res.json({leaders:staff.filter(s=>s.userId?.status==='active'&&s.clubId&&s.clubId.status!=='archived')
    .map(s=>({_id:s._id,role:s.role,fullName:s.userId.fullName,clubName:s.clubId.name,clubId:s.clubId._id}))});
}));

app.get('/api/announcements', auth, wrap(async (req, res) => {
  const announcements = await Announcement.find().populate('clubId','name').populate('authorId','fullName').sort({ createdAt: -1 }).limit(40);
  res.json({ announcements });
}));
app.post('/api/announcements', auth, onlyAdmin, wrap(async (req, res) => {
  const title = clean(req.body.title, 160), body = clean(req.body.body, 3000), clubId = req.body.clubId || null;
  if (title.length < 3 || body.length < 8) return fail(res, 'Announcement title and message are required.');
  if (!clubId && req.user.role !== 'admin') return fail(res, 'Only administrators can publish school-wide announcements.', 403);
  if (clubId && (!validId(clubId) || !(await canManage(req.user, clubId)))) return fail(res, 'Not authorized to post for this club.', 403);
  const announcement = await Announcement.create({ authorId: req.user._id, clubId, title, body });
  await audit(req.user._id, 'announcement_created', 'Announcement', announcement._id);
  res.status(201).json({ announcement });
}));

// Announcements are visible to approved members, but only administrators
// may edit or permanently remove them. Enforce authorization at the API layer.
app.patch('/api/announcements/:id', auth, onlyAdmin, wrap(async (req, res) => {
  if (!validId(req.params.id)) return fail(res, 'Invalid announcement ID.');
  const title = clean(req.body?.title, 160), body = clean(req.body?.body, 3000);
  const clubId = req.body?.clubId || null;
  if (title.length < 3 || body.length < 8) return fail(res, 'Enter a title (at least 3 characters) and message (at least 8 characters).');
  if (clubId && (!validId(clubId) || !(await Club.exists({ _id: clubId }))))
    return fail(res, 'Selected community is not available.');
  const announcement = await Announcement.findByIdAndUpdate(
    req.params.id, { $set: { title, body, clubId } }, { new: true, runValidators: true }
  );
  if (!announcement) return fail(res, 'Announcement not found.', 404);
  await audit(req.user._id, 'announcement_updated', 'Announcement', announcement._id);
  res.json({ announcement });
}));

app.delete('/api/announcements/:id', auth, onlyAdmin, wrap(async (req, res) => {
  if (!validId(req.params.id)) return fail(res, 'Invalid announcement ID.');
  if (req.body?.confirmation !== 'DELETE') return fail(res, 'Type DELETE to confirm permanent removal.');
  const announcement = await Announcement.findByIdAndDelete(req.params.id);
  if (!announcement) return fail(res, 'Announcement not found.', 404);
  await audit(req.user._id, 'announcement_deleted', 'Announcement', announcement._id);
  res.json({ ok: true, deletedAnnouncementId: String(announcement._id) });
}));

app.get('/api/notifications', auth, wrap(async (req, res) => {
  const notifications = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(80);
  res.json({ notifications });
}));
app.patch('/api/notifications/:id/read', auth, wrap(async (req, res) => {
  if (!validId(req.params.id)) return fail(res, 'Invalid notification ID.');
  await Notification.updateOne({ _id: req.params.id, userId: req.user._id }, { $set: { read: true } });
  res.json({ ok: true });
}));


// Only an existing administrator can create another administrator. Public signup never grants roles.
app.post('/api/admin/accounts',auth,onlyAdmin,authLimit,wrap(async(req,res)=>{
  const fullName=clean(req.body.fullName,100),email=clean(req.body.email,254).toLowerCase();
  const password=String(req.body.password||'');
  if(fullName.length<2||!(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))||password.length<12||password.length>128)
    return fail(res,'Enter admin name, email and password of 12–128 characters.');
  const user=await User.create({fullName,email,passwordHash:await bcrypt.hash(password,12),role:'admin',status:'active'});
  await audit(req.user._id,'administrator_created','User',user._id);
  res.status(201).json({user:safe(user)});
}));
app.patch('/api/users/:id/registration',auth,onlyAdmin,wrap(async(req,res)=>{
  if(!validId(req.params.id))return fail(res,'Invalid account ID.');
  const decision=req.body.decision;
  const note=clean(req.body.note,300);
  if(!['approved','rejected'].includes(decision))return fail(res,'Choose Approved or Rejected.');
  const changes=decision==='approved'
    ? {status:'active',registrationNote:'',approvedAt:new Date(),approvedBy:req.user._id}
    : {status:'rejected',registrationNote:note};
  // Atomic status filter stops two administrators from deciding the same account concurrently.
  const user=await User.findOneAndUpdate({
    _id:req.params.id,role:'student',status:{$in:['pending','rejected']}
  },{$set:changes},{new:true,runValidators:true});
  if(!user)return fail(res,'Account not found or has already been approved.',409);
  await audit(req.user._id,'account_registration_'+decision,'User',user._id);
  if(decision==='approved')await notify(user._id,'Your registration is approved','Welcome! You can now access your community dashboard.');
  res.json({user:safe(user)});
}));

app.get('/api/users', auth, onlyAdmin, wrap(async (req, res) => {
  res.json({ users: (await User.find().sort({ createdAt: -1 }).limit(500)).map(safe) });
}));
app.patch('/api/users/:id', auth, onlyAdmin, wrap(async (req, res) => {
  if (!validId(req.params.id)) return fail(res, 'Invalid user ID.');
  const status = req.body.status;
  if (!['active','disabled'].includes(status)) return fail(res, 'Invalid account status.');
  if (String(req.user._id) === req.params.id && status === 'disabled') return fail(res, 'You cannot disable your own admin account.');
  const current = await User.findById(req.params.id);
  if(!current)return fail(res,'User not found.',404);
  // Prevent bypassing the approval queue via this legacy activation endpoint.
  if(status==='active'&&current.status!=='disabled')return fail(res,'Use the registration approval action.',403);
  if(status==='disabled'&&current.status!=='active')return fail(res,'Only approved active accounts may be disabled.',409);
  current.status=status;
  await current.save();
  const user=current;
  await audit(req.user._id, 'user_status_changed', 'User', user._id, status);
  res.json({ user: safe(user) });
}));
// Administrators may permanently delete student accounts (including approved
// ones). Keep the operation transactional so memberships, club capacity, related
// personal data and the account never diverge on partial failures.
app.delete('/api/users/:id', auth, onlyAdmin, wrap(async (req, res) => {
  const targetId=req.params.id;
  if(!validId(targetId))return fail(res,'Invalid user ID.');
  if(String(req.user._id)===targetId)return fail(res,'You cannot delete your own administrator account.',403);
  if(req.body?.confirmation!=='DELETE')return fail(res,'Type DELETE to confirm permanent removal.');
  const expectedEmail=clean(req.body?.email,254).toLowerCase();
  if(!expectedEmail)return fail(res,'Confirm the exact student email address.');

  const session=await mongoose.startSession();
  let deletedId=null;
  try{
    await session.withTransaction(async()=>{
      // This route intentionally never targets an administrator account.
      const student=await User.findOne({_id:targetId,role:'student'}).session(session);
      if(!student)throw Object.assign(new Error('Student account not found.'),{statusCode:404});
      if(student.email!==expectedEmail)throw Object.assign(new Error('Student details changed. Reload User Management and try again.'),{statusCode:409});

      // Club.memberCount tracks active memberships, not mere registrations.
      const memberships=await Membership.find({studentId:student._id,status:'active'})
        .select('clubId').lean().session(session);
      const byClub=new Map();
      for(const membership of memberships){
        const key=String(membership.clubId);
        byClub.set(key,(byClub.get(key)||0)+1);
      }

      const removed=await User.deleteOne({_id:student._id,role:'student'},{session});
      if(removed.deletedCount!==1)throw Object.assign(new Error('Student account could not be deleted.'),{statusCode:409});

      // Purge dependent student records; remove stale reviewer references if the
      // student previously held an officer/adviser assignment.
      await Application.deleteMany({studentId:student._id},{session});
      await Application.updateMany({reviewedBy:student._id},{$set:{reviewedBy:null}},{session});
      await Membership.deleteMany({studentId:student._id},{session});
      await ClubStaff.deleteMany({userId:student._id},{session});
      await Notification.deleteMany({userId:student._id},{session});
      await Announcement.deleteMany({authorId:student._id},{session});
      await AuditLog.deleteMany({actorId:student._id},{session});

      // Guard against legacy counters that may already be out of sync.
      for(const [clubId,count] of byClub){
        await Club.updateOne({_id:clubId},[{$set:{
          memberCount:{$max:[0,{$subtract:[{$ifNull:['$memberCount',0]},count]}]}
        }}],{session});
      }
      await AuditLog.create([{
        actorId:req.user._id,
        action:'student_account_deleted',
        entityType:'User',
        entityId:student._id,
        details:`Previous status: ${student.status}; active memberships removed: ${memberships.length}`
      }],{session});
      deletedId=String(student._id);
    });
  }finally{
    await session.endSession();
  }
  res.json({ok:true,deletedUserId:deletedId});
}));

app.get('/api/stats', auth, onlyAdmin, wrap(async (req, res) => {
  const scopes = await scopeIds(req.user);
  const clubFilter = scopes === null ? {} : { _id: { $in: scopes } };
  const appFilter = scopes === null ? {} : { clubId: { $in: scopes } };
  const [clubs, applications, memberships, members] = await Promise.all([
    Club.countDocuments(clubFilter), Application.countDocuments(appFilter), Membership.countDocuments({ ...appFilter, status: 'active' }), scopes === null ? User.countDocuments({ role: 'student' }) : Promise.resolve(null)
  ]);
  res.json({ stats: { clubs, applications, memberships, students: members, pending: await Application.countDocuments({ ...appFilter, status: { $in: ['pending','under_review'] } }) } });
}));
app.get('/api/settings', wrap(async(req,res)=>{
  const [academicYear,content,brand]=await Promise.all([year(),landingPage(),branding()]);
  res.json({academicYear,landingPage:content,branding:brand});
}));
app.put('/api/settings/branding',auth,onlyAdmin,authLimit,wrap(async(req,res)=>{
  const name=clean(req.body.name,100);
  if(name.length<2||name.length>100)return fail(res,'Web app name must contain 2–100 characters.');
  const previous=await branding();
  const logoDataUrl=req.body.logoDataUrl===undefined?previous.logoDataUrl:req.body.logoDataUrl;
  if(logoDataUrl!==null&&!validBrandImage(logoDataUrl))return fail(res,'Upload a valid PNG, JPEG or WebP logo up to 350KB.');
  const value={name,logoDataUrl};
  await Setting.updateOne({key:'branding'},{$set:{value}},{upsert:true});
  await audit(req.user._id,'branding_updated','Setting',null,'Web app name or logo changed');
  res.json({branding:value});
}));
app.put('/api/settings/landing-page',auth,onlyAdmin,wrap(async(req,res)=>{
  const {eyebrow,heading,intro,cards}=req.body||{};
  if(!validLandingText(eyebrow,2,70)||!validLandingText(heading,2,130)||
     !validLandingText(intro,5,400)||!Array.isArray(cards)||cards.length!==3||
     !cards.every(card=>card&&validLandingText(card.title,2,90)&&validLandingText(card.description,5,400))){
    return fail(res,'Provide the section label, heading, description and exactly three valid cards.');
  }
  const value={eyebrow:eyebrow.trim(),heading:heading.trim(),intro:intro.trim(),
    cards:cards.map(card=>({title:card.title.trim(),description:card.description.trim()}))};
  await Setting.updateOne({key:'landingPage'},{$set:{value}},{upsert:true});
  await audit(req.user._id,'landing_page_updated','Setting',null,'Public landing page content updated');
  res.json({landingPage:value});
}));
app.put('/api/settings/academic-year', auth, onlyAdmin, wrap(async (req, res) => {
  const value = clean(req.body.academicYear, 20);
  if (!/^\d{4}[-–]\d{4}$/.test(value)) return fail(res, 'Use academic year format 2026–2027.');
  await Setting.updateOne({ key: 'academicYear' }, { $set: { value } }, { upsert: true });
  await audit(req.user._id, 'academic_year_updated', 'Setting', null, value);
  res.json({ academicYear: value });
}));

// Single-origin production option: a trusted backend serves the existing HTML/CSS/JS.
// The public /config.js response contains NO secrets, just the same-origin API path.
if (!production || serveFrontend) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend');
  if (serveFrontend) {
    app.get('/config.js', (req, res) => {
      res.set('Cache-Control', 'no-store');
      res.type('application/javascript').send("window.HAVEN_CONFIG = Object.freeze({ DEMO_MODE: false, API_BASE_URL: '/api' });\n");
    });
  }
  app.use(express.static(root));
  app.get('/', (req, res) => res.sendFile(path.join(root, 'index.html')));
}
app.use((req, res) => fail(res, 'Endpoint not found.', 404));
app.use((err, req, res, next) => {
  if (err.code === 11000) return fail(res, 'A record with these details already exists.', 409);
  if (err.name === 'ValidationError' || err.name === 'CastError') return fail(res, 'Invalid input data.');
  if (err.statusCode) return fail(res, err.message, err.statusCode);
  console.error(err);
  return fail(res, production ? 'Server error. Please try again.' : err.message, 500);
});

const PORT = Number(process.env.PORT || 4000);
mongoose.connect(process.env.MONGODB_URI, {
  dbName: process.env.MONGODB_DB_NAME || 'the_haven_db',
  serverSelectionTimeoutMS: 12000
}).then(() => {
  app.listen(PORT, '0.0.0.0', () => console.log(`THE HAVEN API listening on ${PORT}`));
}).catch(err => { console.error('MongoDB connection failed:', err.message); process.exit(1); });

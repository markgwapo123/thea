/* THE HAVEN — Dependency-free frontend. DEMO_MODE runs entirely in the browser.
   Switch to the Express + MongoDB API in config.js for actual persistence. */
(() => {
  'use strict';
  const cfg = window.HAVEN_CONFIG || { DEMO_MODE: true, API_BASE_URL: '/api' };
  const DEMO_KEY = 'the-haven-demo-v1';
  const LOGO = './assets/haven-logo.png';
  const $ = sel => document.querySelector(sel);
  const escapeHtml = str => String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const abbr = name => String(name || 'TH').split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();
  const first = name => String(name || 'friend').trim().split(/\s+/)[0];
  const date = val => val ? new Date(val).toLocaleDateString('en-PH', { month:'short', day:'numeric', year:'numeric' }) : '—';
  const ago = val => { if(!val)return 'Recently';const diff=Math.max(0,Date.now()-new Date(val));const m=Math.floor(diff/60000);return m<1?'Just now':m<60?`${m} min ago`:m<1440?`${Math.floor(m/60)} hr ago`:date(val); };
  const id = entity => typeof entity === 'object' ? String(entity?._id ?? '') : String(entity ?? '');
  const alphabet = ['❋','✦','◈','✳','❃','✧','✺'];
  const options = (rows, label='name') => rows.map(x => `<option value="${escapeHtml(id(x))}">${escapeHtml(x[label])}</option>`).join('');
  const status = val => `<span class="badge ${escapeHtml(val)}">${escapeHtml(String(val || '').replaceAll('_',' '))}</span>`;
  const state = { user:null, staff:[], clubs:[], applications:[], memberships:[], announcements:[], notifications:[], users:[], stats:{}, settings:{academicYear:'2026–2027'}, route:'home', category:'All', search:'', sidebar:false, busy:false };

  const demoSeed = () => ({
    currentUser:'u-student', academicYear:'2026–2027', seq:20,
    users:[
      { _id:'u-student', fullName:'Alex Reyes', studentId:'FBC-2026-001', email:'alex@example.edu', department:'College of Arts & Sciences', yearLevel:'2nd Year', role:'student', status:'active' },
      { _id:'u-adviser', fullName:'Dr. Maria Santos', studentId:'', email:'adviser@example.edu', department:'Student Affairs', yearLevel:'', role:'student', status:'active' },
      { _id:'u-officer', fullName:'Jamie Cruz', studentId:'FBC-2026-008', email:'officer@example.edu', department:'College of Education', yearLevel:'3rd Year', role:'student', status:'active' },
      { _id:'u-admin', fullName:'Haven Administrator', studentId:'', email:'admin@example.edu', department:'Student Affairs', yearLevel:'', role:'admin', status:'active' }
    ],
    clubs:[
      { _id:'c1', name:'Peer Support Circle', category:'Wellness', tagline:'A listening ear, a stronger community.', description:'Build understanding, empathy, and supportive peer relationships through guided conversation and community activities. Example club — customize for your school.', capacity:50, memberCount:12, meetingSchedule:'Thursdays · 3:30 PM', status:'open', accent:'rose' },
      { _id:'c2', name:'Leadership & Mentorship', category:'Leadership', tagline:'Grow together. Lead with purpose.', description:'Develop communication skills, confidence, and positive leadership through peer mentorship and student-focused workshops. Example club — customize for your school.', capacity:40, memberCount:24, meetingSchedule:'Wednesdays · 4:00 PM', status:'open', accent:'gold' },
      { _id:'c3', name:'Community Outreach', category:'Service', tagline:'Small acts. Meaningful impact.', description:'Bring students together through meaningful service initiatives, volunteer outreach, and partnership opportunities. Example club — customize for your school.', capacity:35, memberCount:19, meetingSchedule:'Fridays · 2:00 PM', status:'open', accent:'sage' },
      { _id:'c4', name:'Creative Expression Club', category:'Arts', tagline:'Create. Connect. Express.', description:'Share ideas through storytelling, art, and thoughtful creative activities that foster connection and belonging. Example club — customize for your school.', capacity:45, memberCount:9, meetingSchedule:'Tuesdays · 3:00 PM', status:'open', accent:'blue' }
    ],
    staff:[{ _id:'s1', userId:'u-adviser', clubId:'c1', role:'adviser' },{ _id:'s2', userId:'u-officer', clubId:'c1', role:'officer' }],
    applications:[{ _id:'a1',studentId:'u-student',clubId:'c2',academicYear:'2026–2027',motivation:'I want to develop my ability to mentor and support others.',status:'pending',createdAt:new Date(Date.now()-86400000).toISOString(),remarks:'' }, { _id:'a2',studentId:'u-officer',clubId:'c1',academicYear:'2026–2027',motivation:'I want to help fellow students feel heard and supported.',status:'pending',createdAt:new Date(Date.now()-7200000).toISOString(),remarks:'' }],
    memberships:[],
    announcements:[{ _id:'n1', clubId:null, authorId:'u-admin',title:'Welcome to THE HAVEN!',body:'Registration is now open. Explore our sample clubs and start your journey in our community.',createdAt:new Date(Date.now()-86400000).toISOString() },{_id:'n2',clubId:'c1',authorId:'u-adviser',title:'Peer Facilitator Orientation',body:'New members are invited to learn about the community and upcoming club activities.',createdAt:new Date(Date.now()-172800000).toISOString()}],
    notifications:[{ _id:'t1', userId:'u-student', title:'Welcome to THE HAVEN',message:'Explore clubs and submit your first application.',read:false,createdAt:new Date(Date.now()-10800000).toISOString() }]
  });
  let demo = null;
  function loadDemo(){try{demo=JSON.parse(localStorage.getItem(DEMO_KEY)) || demoSeed();}catch{demo=demoSeed();} saveDemo();}
  function saveDemo(){localStorage.setItem(DEMO_KEY,JSON.stringify(demo));}
  function demoResponse(method, path, payload={}) {
    const parts = path.replace(/^\//,'').split('/');
    const query = new URLSearchParams(path.split('?')[1] || '');
    const cleanPath = path.split('?')[0];
    const user = demo.users.find(u=>u._id===demo.currentUser);
    const admin = user?.role==='admin';
    const clubAt = cid => demo.clubs.find(c=>c._id===cid);
    const userAt = uid => demo.users.find(u=>u._id===uid);
    const isStaff = cid => admin || demo.staff.some(s=>s.userId===user?._id && s.clubId===cid);
    const isAdviser = cid => admin || demo.staff.some(s=>s.userId===user?._id && s.clubId===cid && s.role==='adviser');
    const newId = prefix => `${prefix}${++demo.seq}`;
    const msg = (uid,title,message) => demo.notifications.unshift({_id:newId('t'),userId:uid,title,message,createdAt:new Date().toISOString(),read:false});
    const saved = val => { saveDemo(); return val; };
    const err = message => { throw new Error(message); };
    if(cleanPath==='/me') return {user,staff:demo.staff.filter(s=>s.userId===user?._id).map(s=>({...s,clubId:clubAt(s.clubId)}))};
    if(cleanPath==='/auth/register'&&method==='POST'){
      if(!payload.fullName || !payload.email || !payload.studentId || String(payload.password||'').length<8)err('Please complete the form and use a password of at least 8 characters.');
      if(demo.users.some(u=>u.email===payload.email || u.studentId===payload.studentId))err('Email or student ID already registered.');
      const newUser={_id:newId('u'),fullName:payload.fullName,email:payload.email,studentId:payload.studentId,department:payload.department,yearLevel:payload.yearLevel,role:'student',status:'active'};
      demo.users.push(newUser);demo.currentUser=newUser._id;return saved({user:newUser});
    }
    if(cleanPath==='/auth/login'&&method==='POST'){
      // Demo credentials intentionally NOT checked — simulated role preview only.
      const found=demo.users.find(u=>u.email===payload.email);if(!found)err('Demo email not found. Use a demo role selector instead.');
      demo.currentUser=found._id;return saved({user:found});
    }
    if(cleanPath==='/auth/logout'&&method==='POST'){demo.currentUser='';return saved({ok:true});}
    if(cleanPath==='/clubs'&&method==='GET')return {clubs:demo.clubs.filter(c=>c.status!=='archived')};
    if(cleanPath==='/clubs'&&method==='POST'){
      if(!admin)err('Administrator access required.');const c={...payload,_id:newId('c'),capacity:Number(payload.capacity),memberCount:0,status:'open'};demo.clubs.push(c);return saved({club:c});
    }
    if(parts[0]==='clubs' && parts[1] && method==='PATCH'){
      if(!admin)err('Administrator access required.');const c=clubAt(parts[1]);if(!c)err('Club not found.');Object.assign(c,payload);c.capacity=Number(c.capacity);return saved({club:c});
    }
    if(cleanPath==='/applications'&&method==='GET'){
      const list=demo.applications.filter(a=>query.get('mine')==='1'?a.studentId===user?._id:admin||isStaff(a.clubId));
      return {applications:list.map(a=>({...a,clubId:clubAt(a.clubId),studentId:userAt(a.studentId)})).reverse()};
    }
    if(cleanPath==='/applications'&&method==='POST'){
      if(!user)err('Please sign in first.');const c=clubAt(payload.clubId);if(!c||c.status!=='open')err('Club is not accepting applications.');
      if(String(payload.motivation||'').trim().length<15)err('Please write at least 15 characters for your motivation.');
      if(demo.applications.some(a=>a.studentId===user._id&&a.clubId===c._id&&a.academicYear===demo.academicYear))err('You have already applied to this club this year.');
      const a={_id:newId('a'),studentId:user._id,clubId:c._id,academicYear:demo.academicYear,motivation:payload.motivation,createdAt:new Date().toISOString(),status:c.memberCount>=c.capacity?'waitlisted':'pending',remarks:''};demo.applications.push(a);msg(user._id,'Application submitted',`${c.name}: Your application is ${a.status}.`);return saved({application:a});
    }
    if(parts[0]==='applications' && parts[1] && parts[2]==='review'&&method==='PATCH'){
      const a=demo.applications.find(x=>x._id===parts[1]);if(!a||!isAdviser(a.clubId))err('Not authorized for this club.');if(!['pending','waitlisted','under_review'].includes(a.status))err('This application is already finalized.');
      const c=clubAt(a.clubId);if(payload.status==='approved') {if(c.memberCount>=c.capacity)err('Club is full. Choose Waitlisted.');c.memberCount++;demo.memberships.push({_id:newId('m'),studentId:a.studentId,clubId:a.clubId,academicYear:a.academicYear,joinedAt:new Date().toISOString(),status:'active'});}
      a.status=payload.status;a.remarks=payload.remarks||'';a.reviewedAt=new Date().toISOString();msg(a.studentId,'Application update',`${c.name}: Your application is now ${a.status}.`);return saved({ok:true,status:a.status});
    }
    if(parts[0]==='applications'&&parts[2]==='cancel'&&method==='PATCH'){
      const a=demo.applications.find(x=>x._id===parts[1]&&x.studentId===user?._id);if(!a||!['pending','waitlisted'].includes(a.status))err('Cannot cancel this application.');a.status='cancelled';return saved({application:a});
    }
    if(cleanPath==='/memberships'&&method==='GET'){
      const cid=query.get('clubId');if(cid && !isStaff(cid))err('Not authorized.');
      const rows=demo.memberships.filter(m=>cid?m.clubId===cid:m.studentId===user?._id);
      return {memberships:rows.map(m=>({...m,clubId:clubAt(m.clubId),studentId:userAt(m.studentId)})).reverse()};
    }
    if(cleanPath==='/staff'&&method==='GET')return {staff:demo.staff.filter(s=>admin||s.userId===user?._id).map(s=>({...s,clubId:clubAt(s.clubId),userId:userAt(s.userId)}))};
    if(cleanPath==='/staff'&&method==='POST'){
      if(!admin)err('Administrator access required.');if(!demo.staff.some(s=>s.userId===payload.userId&&s.clubId===payload.clubId&&s.role===payload.role))demo.staff.push({_id:newId('s'),...payload});return saved({ok:true});
    }
    if(cleanPath==='/announcements'&&method==='GET')return {announcements:demo.announcements.map(a=>({...a,clubId:clubAt(a.clubId)||null,authorId:userAt(a.authorId)})).reverse()};
    if(cleanPath==='/announcements'&&method==='POST'){
      if(!(admin||(payload.clubId&&isStaff(payload.clubId))))err('Not authorized to post.');const a={_id:newId('n'),...payload,authorId:user._id,createdAt:new Date().toISOString()};demo.announcements.push(a);return saved({announcement:a});
    }
    if(cleanPath==='/notifications'&&method==='GET')return {notifications:demo.notifications.filter(n=>n.userId===user?._id).reverse()};
    if(parts[0]==='notifications'&&parts[2]==='read'&&method==='PATCH'){const n=demo.notifications.find(x=>x._id===parts[1]&&x.userId===user?._id);if(n)n.read=true;return saved({ok:true});}
    if(cleanPath==='/users'&&method==='GET'){if(!admin)err('Administrator only.');return {users:demo.users};}
    if(parts[0]==='users'&&parts[1]&&method==='PATCH'){if(!admin)err('Administrator only.');const u=userAt(parts[1]);if(!u)err('User not found.');u.status=payload.status;return saved({user:u});}
    if(cleanPath==='/stats'&&method==='GET'){
      const apps=demo.applications.filter(a=>admin||isStaff(a.clubId));
      return {stats:{clubs:demo.clubs.filter(c=>admin||isStaff(c._id)).length,applications:apps.length,memberships:demo.memberships.filter(m=>admin||isStaff(m.clubId)).length,students:admin?demo.users.filter(u=>u.role==='student').length:null,pending:apps.filter(a=>['pending','under_review'].includes(a.status)).length}};
    }
    if(cleanPath==='/settings'&&method==='GET')return {academicYear:demo.academicYear};
    if(cleanPath==='/settings/academic-year'&&method==='PUT'){if(!admin)err('Administrator only.');demo.academicYear=payload.academicYear;return saved({academicYear:demo.academicYear});}
    return err(`Demo endpoint not found: ${method} ${path}`);
  }

  async function api(method, path, body) {
    if(cfg.DEMO_MODE) return demoResponse(method,path,body);
    const url = cfg.API_BASE_URL.replace(/\/$/,'')+path;
    const res = await fetch(url, {method, credentials:'include', headers:{'Content-Type':'application/json'}, ...(body ? {body:JSON.stringify(body)} : {})});
    const data = await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data.error||`Request failed (${res.status})`);
    return data;
  }
  const get = path=>api('GET',path);
  async function fetchAll() {
    try {
      const [c,a,s]=await Promise.all([get('/clubs'),get('/announcements'),get('/settings')]);
      state.clubs=c.clubs;state.announcements=a.announcements;state.settings=s;
      if(cfg.DEMO_MODE) { const me=await get('/me');state.user=me.user||null;state.staff=me.staff||[]; }
      else {try{const me=await get('/me');state.user=me.user;state.staff=me.staff||[];}catch{state.user=null;state.staff=[];}}
      state.applications=[];state.memberships=[];state.notifications=[];state.users=[];state.stats={};
      if(state.user){
        const call = async (path,k,v) => {try{state[k]=(await get(path))[v];}catch{state[k]=k==='stats'?{}:[];}};
        await Promise.all([call('/applications?mine=1','applications','applications'),call('/memberships','memberships','memberships'),call('/notifications','notifications','notifications')]);
        if(state.user.role==='admin' || state.staff.length){
          await Promise.all([call('/applications','staffApplications','applications'),call('/stats','stats','stats')]);
          if(state.user.role==='admin')await call('/users','users','users');
        }
      }
      render();
    } catch(err){$('#app').innerHTML=`<div style="padding:70px 20px;text-align:center"><h2>Cannot load THE HAVEN</h2><p>${escapeHtml(err.message)}</p><p>For preview, set <code>DEMO_MODE: true</code> in <code>frontend/config.js</code>.</p><button class="button primary" onclick="location.reload()">Retry</button></div>`;}
  }
  function nav(route){state.route=route;state.sidebar=false;const hash='#/'+route;if(location.hash!==hash)location.hash=hash;render();window.scrollTo({top:0,behavior:'instant'});}
  function toast(message,isError=false){const root=$('#toast-region');const el=document.createElement('div');el.className='toast'+(isError?' error':'');el.textContent=message;root.append(el);setTimeout(()=>el.remove(),3700);}
  async function mutation(method,path,body,success='Changes saved.'){
    if(state.busy)return false;
    state.busy=true;
    try{await api(method,path,body);closeModal();await fetchAll();toast(success);return true;}
    catch(e){toast(e.message,true);return false;}finally{state.busy=false;}
  }
  function showModal(title,body,onSubmit,{wide=false,submitLabel='Save changes',subtitle=''}={}){
    $('#modal-root').innerHTML=`<div class="modal-backdrop" data-action="modal-backdrop"><div class="modal ${wide?'wide':''}" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}"><div class="modal-header"><h2>${escapeHtml(title)}</h2><button type="button" class="close-modal" data-action="close-modal" aria-label="Close">×</button></div>${subtitle?`<p class="modal-sub">${escapeHtml(subtitle)}</p>`:''}<form id="modal-form">${body}<div class="modal-footer"><button class="button ghost" type="button" data-action="close-modal">Cancel</button><button type="submit" class="button primary">${escapeHtml(submitLabel)}</button></div></form></div></div>`;
    const form=$('#modal-form');form.addEventListener('submit',async ev=>{ev.preventDefault();const data=Object.fromEntries(new FormData(form));const btn=form.querySelector('button[type=submit]');btn.disabled=true;try{await onSubmit(data);}finally{if(btn.isConnected)btn.disabled=false;}});
    setTimeout(()=>form.querySelector('input,textarea,select')?.focus(),80);
  }
  const field=(name,label,type='text',value='',attrs='')=>`<div class="field"><label for="f-${name}">${escapeHtml(label)}</label><input class="input" id="f-${name}" type="${type}" name="${name}" value="${escapeHtml(value)}" ${attrs}></div>`;
  const textarea=(name,label,value='',attrs='')=>`<div class="field"><label for="f-${name}">${escapeHtml(label)}</label><textarea class="input" name="${name}" id="f-${name}" ${attrs}>${escapeHtml(value)}</textarea></div>`;
  const choose=(name,label,arr,value='')=>`<div class="field"><label>${escapeHtml(label)}</label><select class="input" name="${name}">${arr.map(x=>`<option value="${escapeHtml(x.value)}" ${x.value===value?'selected':''}>${escapeHtml(x.label)}</option>`).join('')}</select></div>`;
  const isAdmin=()=>state.user?.role==='admin';
  const hasStaff=()=>state.staff.length>0;
  const isAdviser=(clubId)=>isAdmin()||state.staff.some(s=>s.role==='adviser'&&id(s.clubId)===id(clubId));
  const isStaffClub=(clubId)=>isAdmin()||state.staff.some(s=>id(s.clubId)===id(clubId));
  const unread=()=>state.notifications.filter(n=>!n.read).length;
  const clubOf=cid=>state.clubs.find(c=>id(c)===id(cid));
  const myApps=()=>state.applications;
  const staffApps=()=>state.staffApplications||[];
  const studentName=()=>first(state.user?.fullName);
  const topHeading=(title,subtitle,cta='')=>`<div class="page-heading"><div><div class="eyebrow">FELLOWSHIP BAPTIST COLLEGE · THE HAVEN</div><h1>${title}</h1><p>${subtitle}</p></div>${cta}</div>`;
  const empty=(sym,title,description)=>`<div class="empty"><div class="empty-icon">${sym}</div><strong>${title}</strong><p>${description}</p></div>`;
  const card = (c,i=0) => `<article class="club-card"><div class="club-art ${escapeHtml(c.accent||'gold')}"><span class="top-tag">${escapeHtml(c.status==='open'?'Registration Open':'Registration Closed')}</span><div class="club-art-symbol">${alphabet[i%alphabet.length]}</div></div><div class="club-body"><div class="club-category">${escapeHtml(c.category)}</div><div class="club-title">${escapeHtml(c.name)}</div><p class="club-desc">${escapeHtml(c.tagline||c.description).slice(0,112)}</p><div class="club-footer"><span class="tiny">◉ ${Math.max(0,c.capacity-c.memberCount)} slots left</span><button class="button secondary sm" data-action="club" data-id="${id(c)}">View Details ↗</button></div></div></article>`;
  const categoryFilters=()=>['All',...new Set(state.clubs.map(c=>c.category))];

  function publicSite(){
    const onClubs=state.route==='clubs';
    const body=onClubs?`<div class="public-clubs">${topHeading('Explore our communities','Find a club where you can learn, connect, and make a difference.')} ${searchAndFilters()}<div id="club-results" class="club-grid">${filterClubs().map(card).join('')||empty('⌕','No clubs found','Try a different search or category.')}</div></div>`:
      `<section class="public-hero"><div><div class="eyebrow">WELCOME TO A COMMUNITY THAT CARES</div><h1>A place to <em>belong.</em><br>A space to <em>grow.</em></h1><p>Connect with people who inspire you. Discover student communities, explore opportunities, and begin your journey with THE HAVEN: Peer Facilitators' Community.</p><div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:inherit"><button class="button primary" data-action="go-clubs">Explore Clubs &nbsp;→</button><button class="button secondary" data-action="${state.user?'go-dashboard':'register'}">${state.user?'My Dashboard':'Join the Community'}</button></div><p class="helper" style="margin-top:23px">✦ Fellowship Baptist College &nbsp; · &nbsp; Stronger together</p></div><div class="public-art"><img src="${LOGO}" alt="THE HAVEN official seal"></div></section><section class="public-info"><div class="public-inner"><div class="eyebrow">WHAT WE BELIEVE IN</div><h2 style="font:700 32px 'Playfair Display',serif;margin:10px 0">Your community starts here.</h2><div class="feature-grid"><div class="feature-card"><i>♡</i><h3>Meaningful Connections</h3><p>Discover a welcoming community built around listening, understanding, and support.</p></div><div class="feature-card"><i>✧</i><h3>Growth & Leadership</h3><p>Explore opportunities to learn new skills and develop as a student facilitator.</p></div><div class="feature-card"><i>❋</i><h3>Simple Registration</h3><p>Apply online, receive updates, and track your club journey in one convenient place.</p></div></div></div></section>`;
    return `<div class="public-wrap"><header class="public-header"><a class="public-logo" href="#/home"><img src="${LOGO}" alt="THE HAVEN Logo"><span><b>THE HAVEN</b><small>PEER FACILITATORS' COMMUNITY</small></span></a><nav class="public-nav" aria-label="Public navigation"><button class="plain" data-action="go-home">Home</button><button class="plain" data-action="go-clubs">Explore</button><button class="button primary sm" data-action="${state.user?'go-dashboard':'login'}">${state.user?'Dashboard':'Log In'}</button></nav></header>${body}<footer class="public-footer">© ${new Date().getFullYear()} THE HAVEN · Fellowship Baptist College · Made for our community</footer></div>`;
  }
  function sideNav(){
    const common=[['dashboard','⌂','Dashboard'],['clubs','◇','Explore Clubs'],['applications','▤','My Applications'],['memberships','♧','My Clubs'],['announcements','◌','Announcements'],['notifications','♧','Notifications']];
    const staff=[['staff-applications','▣','Application Review'],['staff-members','♙','Club Members']];
    const admins=[['admin-clubs','▦','Manage Clubs'],['admin-users','♧','User Management'],['reports','▥','Reports'],['settings','⚙','Settings']];
    const section=items=>`<div class="nav-list">${items.map(([r,ic,t])=>`<button class="nav-link ${state.route===r?'active':''}" data-action="navigate" data-route="${r}"><span class="nav-icon">${ic}</span><span>${t}</span>${r==='notifications'&&unread()?`<span class="badge" style="margin-left:auto;padding:3px 6px">${unread()}</span>`:''}</button>`).join('')}</div>`;
    return `<aside class="sidebar ${state.sidebar?'open':''}" aria-label="Main navigation"><a href="#/home" class="side-brand"><img src="${LOGO}" alt="Logo"><span><div class="brand-title">THE HAVEN</div><div class="brand-sub">PEER FACILITATORS' COMMUNITY</div></span></a><div class="nav-section-label">WORKSPACE</div>${section(common)}${hasStaff()||isAdmin()?`<div class="nav-section-label">CLUB MANAGEMENT</div>${section(staff)}`:''}${isAdmin()?`<div class="nav-section-label">ADMINISTRATION</div>${section(admins)}`:''}<div class="side-bottom"><div class="mini-profile"><span class="avatar">${abbr(state.user.fullName)}</span><span><div class="profile-name">${escapeHtml(state.user.fullName)}</div><div class="profile-role">${isAdmin()?'System Administrator':hasStaff()?state.staff.map(s=>s.role).join(' / '):'Student Member'}</div></span></div><button class="side-exit" data-action="logout">↪ &nbsp; Sign out</button></div></aside>`;
  }
  const titles={dashboard:'Overview',clubs:'Explore Clubs',applications:'My Applications',memberships:'My Clubs',announcements:'Announcements',notifications:'Notifications','staff-applications':'Application Review','staff-members':'Club Members','admin-clubs':'Manage Clubs','admin-users':'User Management',reports:'Reports & Analytics',settings:'System Settings'};
  function shell(){
    const demoBar=cfg.DEMO_MODE?`<div class="demo-bar"><span><b>✦ Preview mode</b> · Data is stored in this browser only; no real accounts.</span><div class="demo-actions">${[['u-student','Student'],['u-adviser','Adviser'],['u-officer','Officer'],['u-admin','Admin']].map(([u,t])=>`<button data-action="demo-role" data-id="${u}" class="${demo.currentUser===u?'selected':''}">${t}</button>`).join('')}<button data-action="reset-demo">Reset</button></div></div>`:'';
    return `<div class="app-shell">${sideNav()}<div class="overlay ${state.sidebar?'open':''}" data-action="sidebar-toggle"></div><main class="main"><header class="topbar"><div style="display:flex;gap:12px;align-items:center"><button class="mobile-menu-btn" data-action="sidebar-toggle" aria-label="Open navigation">☰</button><div><div class="top-title">${escapeHtml(titles[state.route]||'THE HAVEN')}</div><div class="top-subtitle">${escapeHtml(state.settings.academicYear)} · Fellowship Baptist College</div></div></div><div class="top-actions"><button class="icon-button" data-action="navigate" data-route="notifications" title="Notifications" aria-label="Notifications">♧ ${unread()?'<span class="notif-dot"></span>':''}</button><span class="avatar sm">${abbr(state.user.fullName)}</span></div></header><div class="content">${demoBar}${view()}</div></main></div>`;
  }
  function statCard(label,num,hint,ic){return `<div class="stat-card"><div class="stat-top"><span>${label}</span><span class="stat-icon">${ic}</span></div><div class="stat-number">${num}</div><div class="stat-hint">${hint}</div></div>`;}
  function dashboard(){
    const mine=myApps();const myMemberships=state.memberships;const pending=mine.filter(a=>['pending','under_review','waitlisted'].includes(a.status)).length;
    const managed=isAdmin()||hasStaff();
    const metrics=managed?[
      ['Active Clubs',state.stats.clubs??state.clubs.length,'In your managed scope','◇'],
      ['Applications',state.stats.applications??0,'Total submissions','▤'],
      ['Pending Review',state.stats.pending??0,'Need a decision','◷'],
      ['Memberships',state.stats.memberships??0,'Approved students','♧']
    ]:[['Available Clubs',state.clubs.filter(c=>c.status==='open').length,'Open for registration','◇'],['My Applications',mine.length,'Applications submitted','▤'],['Pending',pending,'Awaiting a decision','◷'],['My Memberships',myMemberships.length,'Clubs joined','♧']];
    return `<div class="welcome"><div><div class="eyebrow">✧ &nbsp; YOUR COMMUNITY, YOUR SPACE</div><h1>Welcome ${escapeHtml(studentName())},<br>we're glad you're here.</h1><p>${managed?'Guide your community, review applications, and bring members together.':'Find your place, make meaningful connections, and grow with THE HAVEN.'}</p><button class="button primary" data-action="${managed?'go-review':'go-clubs'}">${managed?'Review Applications':'Explore Communities'} &nbsp;→</button></div><img class="welcome-image" src="${LOGO}" alt="THE HAVEN"></div><div class="stat-grid">${metrics.map(x=>statCard(...x)).join('')}</div><div class="grid-main" style="margin-top:22px"><section><div class="section-heading"><div><h2>${managed?'Recent Applications':'Discover communities'}</h2><p>${managed?'Applications that may need your attention':'Clubs you might love'}</p></div><button class="text-link" data-action="${managed?'go-review':'go-clubs'}">View all →</button></div>${managed?`${applicationTable(staffApps().slice(0,5),true)}`:`<div class="club-grid" style="grid-template-columns:repeat(auto-fit,minmax(205px,1fr))">${state.clubs.slice(0,2).map(card).join('')}</div>`}</section><section><div class="section-heading"><h2>Community updates</h2><button class="text-link" data-action="navigate" data-route="announcements">View all →</button></div><div class="panel activity-list">${state.announcements.slice(0,4).map(a=>`<div class="activity-item"><span class="activity-marker">✦</span><div><div class="activity-title">${escapeHtml(a.title)}</div><div class="activity-text">${escapeHtml(a.body).slice(0,126)}</div><div class="activity-time">${ago(a.createdAt)}</div></div></div>`).join('')||empty('◌','No updates yet','Announcements will appear here.')}</div></section></div>`;
  }
  function filterClubs(){return state.clubs.filter(c=>(state.category==='All'||c.category===state.category)&&(c.name+' '+c.description+' '+c.category).toLowerCase().includes(state.search.toLowerCase()));}
  function searchAndFilters(){return `<div class="searchbar"><div class="searchwrap"><span class="search-symbol">⌕</span><input id="club-search" class="input" type="search" placeholder="Search clubs, interests, activities..." value="${escapeHtml(state.search)}" aria-label="Search clubs"></div></div><div class="filters">${categoryFilters().map(c=>`<button class="filter ${state.category===c?'active':''}" data-action="category" data-category="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('')}</div>`;}
  function clubsPage(){return `${topHeading('Find your community','Explore clubs and discover opportunities to connect, grow and serve.')} ${searchAndFilters()}<div id="club-results" class="club-grid">${filterClubs().map(card).join('')||empty('⌕','No clubs found','Try a different search or category.')}</div>`;}
  function applicationTable(apps,manage=false){
    if(!apps.length)return empty('▤',manage?'No applications to review':'No applications yet',manage?'Applications will appear once students register.':'Explore clubs and submit your first application.');
    return `<div class="table-wrap"><table><thead><tr><th>${manage?'Student':'Club'}</th><th>${manage?'Club':'Academic Year'}</th><th>Applied</th><th>Status</th><th>Action</th></tr></thead><tbody>${apps.map(a=>`<tr><td><div class="table-person">${escapeHtml(manage?a.studentId?.fullName:a.clubId?.name)}</div><div class="table-sub">${escapeHtml(manage?a.studentId?.studentId:a.clubId?.category)}</div></td><td>${escapeHtml(manage?a.clubId?.name:a.academicYear)}</td><td>${date(a.createdAt)}</td><td>${status(a.status)}</td><td><div class="table-action">${manage?`<button class="button secondary sm" data-action="review" data-id="${id(a)}">${isAdviser(a.clubId)?'Review':'Details'}</button>`:`<button class="button ghost sm" data-action="application-info" data-id="${id(a)}">Details</button>${['pending','waitlisted'].includes(a.status)?`<button class="button danger sm" data-action="cancel-app" data-id="${id(a)}">Cancel</button>`:''}`}</div></td></tr>`).join('')}</tbody></table></div>`;
  }
  function applicationsPage(){return topHeading('My Applications','Track every club application from submission to final decision.',`<button class="button primary sm" data-action="go-clubs">+ Apply to a Club</button>`)+applicationTable(myApps());}
  function membershipsPage(){return topHeading('My Clubs','Your approved memberships for this academic year.')+(state.memberships.length?`<div class="cards-two">${state.memberships.map(m=>`<div class="panel"><div class="eyebrow">ACTIVE MEMBER</div><h2 class="panel-title" style="margin:8px 0">${escapeHtml(m.clubId?.name)}</h2>${status(m.status)}<div class="divider"></div><p class="small muted">Joined ${date(m.joinedAt)} · ${escapeHtml(m.academicYear)}</p></div>`).join('')}</div>`:empty('◇','Your club journey starts here','Once your application is approved, your memberships will appear on this page.')) ;}
  function announcementsPage(){return topHeading('Community Announcements','Stay connected with everything happening around THE HAVEN.',(isAdmin()||hasStaff())?`<button class="button primary sm" data-action="create-announcement">+ New Announcement</button>`:'')+`<div style="display:grid;gap:13px">${state.announcements.map(a=>`<article class="panel"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><span class="badge">${escapeHtml(a.clubId?.name||'School-wide')}</span><span class="small muted">${date(a.createdAt)}</span></div><h3 style="margin:14px 0 8px;font-size:18px">${escapeHtml(a.title)}</h3><p style="line-height:1.8;color:#7d786d;margin:0;white-space:pre-wrap">${escapeHtml(a.body)}</p><p class="helper" style="margin:14px 0 0">Posted by ${escapeHtml(a.authorId?.fullName||'THE HAVEN')}</p></article>`).join('')||empty('◌','No announcements','Updates from your community will appear here.')}</div>`;}
  function notificationsPage(){return topHeading('Notifications','Keep track of important updates about your account and applications.')+`<div class="panel activity-list">${state.notifications.map(n=>`<div class="activity-item"><div class="activity-marker" style="${n.read?'opacity:.48':''}">${n.read?'◌':'✦'}</div><div style="flex:1"><div class="activity-title">${escapeHtml(n.title)} ${!n.read?'<span class="badge pending">New</span>':''}</div><div class="activity-text">${escapeHtml(n.message)}</div><div class="activity-time">${ago(n.createdAt)}</div></div>${!n.read?`<button data-action="mark-read" data-id="${id(n)}" class="button ghost sm">Mark read</button>`:''}</div>`).join('')||empty('♧','All caught up','No notifications right now.')}</div>`;}
  function staffApplicationsPage(){if(!hasStaff()&&!isAdmin())return denied();return topHeading('Application Review','Review club applications, make decisions, and welcome new members.')+applicationTable(staffApps(),true);}
  function membersPage(){if(!hasStaff()&&!isAdmin())return denied();const clubs=state.clubs.filter(c=>isStaffClub(c._id));return topHeading('Club Members','Manage and view approved members in your assigned communities.')+`<div class="cards-two">${clubs.map(c=>`<div class="panel"><div class="eyebrow">${escapeHtml(c.category)}</div><h3>${escapeHtml(c.name)}</h3><p class="small muted">${c.memberCount} / ${c.capacity} members</p><button class="button secondary sm" data-action="view-members" data-id="${id(c)}">View Members →</button></div>`).join('')||empty('♧','No assigned clubs','Ask the administrator to assign you to a club.')}</div>`;}
  function manageClubsPage(){if(!isAdmin())return denied();return topHeading('Club Management','Create, update and control club registration availability.',`<button class="button primary sm" data-action="create-club">+ Create Club</button>`)+`<div class="table-wrap"><table><thead><tr><th>Club</th><th>Category</th><th>Capacity</th><th>Status</th><th>Actions</th></tr></thead><tbody>${state.clubs.map(c=>`<tr><td><div class="table-person">${escapeHtml(c.name)}</div></td><td>${escapeHtml(c.category)}</td><td>${c.memberCount}/${c.capacity}</td><td>${status(c.status)}</td><td><button class="button secondary sm" data-action="edit-club" data-id="${id(c)}">Edit Club</button></td></tr>`).join('')}</tbody></table></div>`;}
  function adminUsersPage(){if(!isAdmin())return denied();return topHeading('User Management','View student accounts and assign club officers or advisers.',`<button class="button primary sm" data-action="assign-staff">+ Assign Club Staff</button>`)+`<div class="table-wrap"><table><thead><tr><th>Name</th><th>Student ID</th><th>Email</th><th>Role</th><th>Status</th><th>Action</th></tr></thead><tbody>${state.users.map(u=>`<tr><td class="table-person">${escapeHtml(u.fullName)}</td><td>${escapeHtml(u.studentId||'—')}</td><td>${escapeHtml(u.email)}</td><td>${escapeHtml(u.role)}</td><td>${status(u.status)}</td><td>${u._id===state.user._id?'—':`<button class="button ghost sm" data-action="toggle-user" data-id="${id(u)}">${u.status==='active'?'Disable':'Activate'}</button>`}</td></tr>`).join('')}</tbody></table></div>`;}
  function reportsPage(){if(!isAdmin())return denied();return topHeading('Reports & Analytics','School-wide snapshots and registration report exports.',`<button class="button primary sm" data-action="download-report">↓ Export Applications CSV</button>`)+`<div class="stat-grid" style="margin:0 0 24px">${[['Clubs',state.stats.clubs||0,'Active club records','◇'],['Applications',state.stats.applications||0,'All applications','▤'],['Memberships',state.stats.memberships||0,'Confirmed members','♧'],['Students',state.stats.students||0,'Registered students','✦']].map(x=>statCard(...x)).join('')}</div><div class="panel"><h3 class="panel-title">Application Status Breakdown</h3>${['pending','approved','rejected','waitlisted','cancelled'].map(st=>{const count=staffApps().filter(a=>a.status===st).length;const pct=staffApps().length?Math.round(count/staffApps().length*100):0;return `<div style="display:grid;grid-template-columns:105px 1fr 35px;gap:13px;align-items:center;margin:14px 0"><span class="small muted" style="text-transform:capitalize">${st}</span><div style="height:10px;background:#f2eee6;border-radius:30px;overflow:hidden"><div style="height:100%;width:${pct}%;background:#b89552;border-radius:30px"></div></div><b class="small">${count}</b></div>`}).join('')}</div>`;}
  function settingsPage(){if(!isAdmin())return denied();return topHeading('System Settings','Manage the current academic year and review system configuration.')+`<div class="cards-two"><div class="panel"><h3 class="panel-title">Academic Year</h3><p class="small muted">Current active registration academic year</p><div style="font:700 28px 'Playfair Display',serif;margin:16px 0">${escapeHtml(state.settings.academicYear)}</div><button class="button secondary sm" data-action="edit-year">Update Academic Year</button></div><div class="panel"><h3 class="panel-title">System Configuration</h3><p class="small muted">Application and hosting settings</p><div class="divider"></div><p class="small">API: <b>${cfg.DEMO_MODE?'Local Browser Demo':'Express / MongoDB Atlas'}</b></p><p class="small">Logo: <b>Official THE HAVEN seal</b></p><p class="small">Splash screen: <b>2 seconds / pulse</b></p></div></div>`;}
  function denied(){return empty('⊘','Access restricted','Your account does not have permission to view this page.');}
  function view(){return ({dashboard:dashboard,clubs:clubsPage,applications:applicationsPage,memberships:membershipsPage,announcements:announcementsPage,notifications:notificationsPage,'staff-applications':staffApplicationsPage,'staff-members':membersPage,'admin-clubs':manageClubsPage,'admin-users':adminUsersPage,reports:reportsPage,settings:settingsPage}[state.route]||dashboard)();}
  function render(){
    if(!state.user&&!['home','clubs'].includes(state.route))state.route='home';
    $('#app').innerHTML=(state.route==='home'||!state.user)?publicSite():shell();
  }

  function openClub(cid){const c=clubOf(cid);if(!c)return;const applied=state.applications.some(a=>id(a.clubId)===id(c));const member=state.memberships.some(m=>id(m.clubId)===id(c));const content=`<div class="detail-intro"><div class="eyebrow">${escapeHtml(c.category)}</div><h3 style="font:700 23px 'Playfair Display',serif;margin:7px 0">${escapeHtml(c.tagline||c.name)}</h3><p style="margin:0">${escapeHtml(c.description)}</p></div><div class="detail-chip">◷ ${escapeHtml(c.meetingSchedule)}</div><div class="detail-chip">♧ ${c.memberCount}/${c.capacity} members</div><div class="detail-chip">${status(c.status)}</div><div class="divider"></div><p class="helper">${member?'You are already a member.':applied?'You have already submitted an application for this academic year.':'Tell us a little about yourself and why you would like to join.'}</p>`;
    showModal(c.name,content,async()=>{closeModal();if(!state.user){openAuth('register');return;}if(!member&&!applied)openApply(c._id);}, {wide:true,submitLabel:member?'Close':applied?'Back':state.user?'Apply to Join →':'Create Account →'});
  }
  function openApply(cid){const c=clubOf(cid);if(!c)return;showModal(`Apply to ${c.name}`,`<div class="banner">Academic Year: ${escapeHtml(state.settings.academicYear)} · ${Math.max(0,c.capacity-c.memberCount)} slots available</div><br><div class="split-input">${field('fullName','Student Name','text',state.user.fullName,'disabled')}${field('studentId','Student ID','text',state.user.studentId,'disabled')}</div>${textarea('motivation','Why do you want to join this club?','','required minlength="15" maxlength="1000" placeholder="Share your motivation in a few sentences..."')}<p class="helper">Your application will be reviewed by the assigned club adviser. Duplicate applications for the same academic year are not allowed.</p>`,data=>mutation('POST','/applications',{clubId:cid,motivation:data.motivation},'Your application has been submitted!'),{submitLabel:'Submit Application'});}
  function openAuth(mode){
    const login=mode==='login';const content=`<img class="auth-logo" src="${LOGO}" alt="THE HAVEN"><h3 class="auth-title">${login?'Welcome back':'Join THE HAVEN'}</h3><p class="auth-desc">${login?'Log in to your community portal.':'Create your account to join school clubs.'}</p>${!login?field('fullName','Full Name','text','','required minlength="2"')+`<div class="split-input">${field('studentId','School Student ID','text','','required')}${field('yearLevel','Year Level','text','','placeholder="2nd Year"')}</div>`+field('department','Department / Program','text','','placeholder="e.g. College of Education"'):''}${field('email','Email Address','email','','required autocomplete="email"')}${field('password','Password','password','','required minlength="8" autocomplete="'+(login?'current-password':'new-password')+'"')}<p class="helper">${cfg.DEMO_MODE?'Preview mode: account creation is simulated. Use the demo role controls to explore without credentials.':'Passwords must contain 8 or more characters. Please use school-approved account details.'}</p><p style="text-align:center;font-size:12px">${login?'New to THE HAVEN?':'Already a member?'} <button type="button" class="text-link" data-action="${login?'register':'login'}">${login?'Create an account':'Log in'}</button></p>`;
    showModal('',content,async data=>{const endpoint=login?'/auth/login':'/auth/register';try{await api('POST',endpoint,data);closeModal();await fetchAll();nav('dashboard');toast(login?'Welcome back!':'Your account is ready. Welcome!');}catch(e){toast(e.message,true)}},{submitLabel:login?'Log in →':'Create Account →'});
  }
  function editClub(cid){const c=cid?clubOf(cid):null;const name=c?'Edit Club':'Create New Club';const body=field('name','Club Name','text',c?.name||'','required maxlength="120"')+field('category','Category','text',c?.category||'','required')+field('tagline','Short Tagline','text',c?.tagline||'')+textarea('description','Club Description',c?.description||'','required')+`<div class="split-input">${field('capacity','Member Capacity','number',c?.capacity||50,`required min="${c?.memberCount||1}"`)}${field('meetingSchedule','Meeting Schedule','text',c?.meetingSchedule||'To be announced')}</div>`+choose('accent','Club Card Theme',['gold','rose','sage','blue'].map(x=>({value:x,label:x[0].toUpperCase()+x.slice(1)})),c?.accent||'gold')+(c?choose('status','Registration Status',['open','closed','archived'].map(x=>({value:x,label:x[0].toUpperCase()+x.slice(1)})),c.status):'');
    showModal(name,body,data=>mutation(c?'PATCH':'POST',c?`/clubs/${c._id}`:'/clubs',data,c?'Club updated.':'Club created.'),{wide:true,submitLabel:c?'Save Changes':'Create Club'});
  }
  function reviewApp(aid){const a=staffApps().find(x=>id(x)===aid);if(!a)return;const allowed=isAdviser(a.clubId);const reviewable=['pending','waitlisted','under_review'].includes(a.status);const content=`<div class="detail-intro"><b>${escapeHtml(a.studentId?.fullName)}</b> (${escapeHtml(a.studentId?.studentId||'No student ID')})<br>${escapeHtml(a.clubId?.name)}<p style="margin:9px 0 0">${escapeHtml(a.motivation)}</p></div><p>Current status: ${status(a.status)}</p>${a.remarks?`<p class="helper">Remarks: ${escapeHtml(a.remarks)}</p>`:''}${allowed&&reviewable?choose('status','Decision',[{value:'approved',label:'Approve application'},{value:'rejected',label:'Reject application'},{value:'waitlisted',label:'Move to waitlist'},{value:'under_review',label:'Mark under review'}]):'<div class="banner">You may view this application, but only its assigned adviser or an administrator can make a decision.</div>'}${allowed&&reviewable?textarea('remarks','Remarks (optional)','','maxlength="500"'):''}`;
    showModal('Application Details',content,data=>allowed&&reviewable?mutation('PATCH',`/applications/${aid}/review`,data,'Application decision saved.'):(closeModal(),Promise.resolve()),{submitLabel:allowed&&reviewable?'Save Decision':'Close',wide:true});
  }
  function createAnnouncement(){const clubs=state.clubs.filter(c=>isStaffClub(c._id));const clubOpts=[...(isAdmin()?[{value:'',label:'School-wide'}]:[]),...clubs.map(c=>({value:id(c),label:c.name}))];showModal('Create Announcement',choose('clubId','Post To',clubOpts)+field('title','Title','text','','required')+textarea('body','Announcement Message','','required minlength="8"'),data=>mutation('POST','/announcements',data,'Announcement posted.'),{submitLabel:'Publish Announcement'});}
  function assignStaff(){if(!state.users.length){toast('No users available.',true);return;}showModal('Assign Club Staff',choose('userId','Select User',state.users.map(u=>({value:id(u),label:`${u.fullName} (${u.email})` })))+choose('clubId','Club',state.clubs.map(c=>({value:id(c),label:c.name})))+choose('role','Assigned Role',[{value:'adviser',label:'Club Adviser'},{value:'officer',label:'Club Officer'}])+`<div class="banner">Only Club Advisers (and administrators) can approve applications. Officers can manage assigned-club announcements and view members.</div>`,data=>mutation('POST','/staff',data,'Club staff assigned.'),{submitLabel:'Assign Staff'});}
  function editYear(){showModal('Update Academic Year',field('academicYear','Current Academic Year','text',state.settings.academicYear,'required pattern="[0-9]{4}[-–][0-9]{4}"')+'<p class="helper">Example: 2026–2027. Existing applications retain their original academic year.</p>',data=>mutation('PUT','/settings/academic-year',data,'Academic year updated.'));}
  function csvExport(){const rows=[['Student Name','Student ID','Email','Club','Academic Year','Application Status','Submitted Date','Remarks'],...staffApps().map(a=>[a.studentId?.fullName,a.studentId?.studentId,a.studentId?.email,a.clubId?.name,a.academicYear,a.status,date(a.createdAt),a.remarks||''])];const quote=v=>{const s=String(v??'');const safe=/^[=+\-@\t\r]/.test(s)?"'"+s:s;return '"'+safe.replaceAll('"','""')+'"'};const csv='\uFEFF'+rows.map(r=>r.map(quote).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));const link=document.createElement('a');link.href=url;link.download=`THE_HAVEN_Applications_${new Date().toISOString().slice(0,10)}.csv`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Application report exported.');}
  function closeModal(){$('#modal-root').innerHTML='';}
  async function action(event){const node=event.target.closest('[data-action]');if(!node)return;const type=node.dataset.action, itemId=node.dataset.id;
    if(type==='modal-backdrop'&&event.target!==node)return;
    if(type==='close-modal'||type==='modal-backdrop'){closeModal();return;}
    if(type==='navigate'){nav(node.dataset.route);return;}
    if(type.startsWith('go-')){nav(({ 'go-clubs':'clubs', 'go-dashboard':'dashboard', 'go-home':'home', 'go-review':'staff-applications' })[type]||'home');return;}
    if(type==='sidebar-toggle'){state.sidebar=!state.sidebar;render();return;}
    if(type==='category'){state.category=node.dataset.category;updateClubs();return;}
    if(type==='club'){openClub(itemId);return;}
    if(type==='login'||type==='register'){openAuth(type);return;}
    if(type==='demo-role') {demo.currentUser=itemId;saveDemo();await fetchAll();nav('dashboard');return;}
    if(type==='reset-demo'){if(confirm('Reset all browser demo data?')){demo=demoSeed();saveDemo();await fetchAll();nav('home');toast('Demo reset.');}return;}
    if(type==='logout'){await api('POST','/auth/logout');if(cfg.DEMO_MODE){demo.currentUser='';saveDemo();}await fetchAll();nav('home');return;}
    if(type==='application-info'){const a=state.applications.find(x=>id(x)===itemId);if(a)showModal('My Application',`<div class="detail-intro"><b>${escapeHtml(a.clubId?.name)}</b><p style="margin:8px 0">${escapeHtml(a.motivation)}</p></div><p>Decision: ${status(a.status)}</p><p class="small muted">Submitted ${date(a.createdAt)}</p>${a.remarks?`<p>Review remarks: ${escapeHtml(a.remarks)}</p>`:''}`,async()=>closeModal(),{submitLabel:'Close'});return;}
    if(type==='cancel-app'){if(confirm('Cancel this application? You will not be able to re-apply during the same academic year.'))await mutation('PATCH',`/applications/${itemId}/cancel`,{},'Application cancelled.');return;}
    if(type==='review'){reviewApp(itemId);return;}
    if(type==='create-club'||type==='edit-club'){editClub(type==='edit-club'?itemId:null);return;}
    if(type==='create-announcement'){createAnnouncement();return;}
    if(type==='assign-staff'){assignStaff();return;}
    if(type==='toggle-user'){const u=state.users.find(x=>id(x)===itemId);if(u&&confirm(`${u.status==='active'?'Disable':'Activate'} ${u.fullName}?`))await mutation('PATCH',`/users/${itemId}`,{status:u.status==='active'?'disabled':'active'},'Account status updated.');return;}
    if(type==='edit-year'){editYear();return;}
    if(type==='download-report'){csvExport();return;}
    if(type==='mark-read'){await mutation('PATCH',`/notifications/${itemId}/read`,{},'Notification marked as read.');return;}
    if(type==='view-members'){const c=clubOf(itemId);try{const result=await get(`/memberships?clubId=${itemId}`);showModal(`${c.name} Members`,result.memberships.length?`<div class="table-wrap"><table><thead><tr><th>Member</th><th>Student ID</th><th>Joined</th></tr></thead><tbody>${result.memberships.map(m=>`<tr><td>${escapeHtml(m.studentId?.fullName)}</td><td>${escapeHtml(m.studentId?.studentId||'—')}</td><td>${date(m.joinedAt)}</td></tr>`).join('')}</tbody></table></div>`:empty('♧','No members in records','Approved members will appear here.'),async()=>closeModal(),{submitLabel:'Close',wide:true});}catch(e){toast(e.message,true);}return;}
  }
  function updateClubs(){const panel=$('#club-results');if(panel)panel.innerHTML=filterClubs().map(card).join('')||empty('⌕','No clubs found','Try another search or category.');document.querySelectorAll('.filter').forEach(el=>el.classList.toggle('active',el.dataset.category===state.category));}

  document.addEventListener('click',event=>{action(event).catch(e=>toast(e.message,true));});
  document.addEventListener('input',event=>{if(event.target.id==='club-search'){state.search=event.target.value;updateClubs();}});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeModal();});
  window.addEventListener('hashchange',()=>{state.route=location.hash.slice(2)||'home';state.sidebar=false;render();});
  async function init(){
    state.route=location.hash.startsWith('#/')?location.hash.slice(2):'home';
    if(cfg.DEMO_MODE)loadDemo();
    // 2-second intro: 1.7 seconds of logo pulse + 0.3 second fade-out.
    setTimeout(()=>{const splash=$('#splash');splash.classList.add('hidden');setTimeout(()=>splash.remove(),310);},1700);
    await fetchAll();
  }
  init();
})();

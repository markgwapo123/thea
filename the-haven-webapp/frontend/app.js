/* THE HAVEN — Dependency-free frontend. DEMO_MODE runs entirely in the browser.
   Switch to the Express + MongoDB API in config.js for actual persistence. */
(() => {
  'use strict';
  const cfg = window.HAVEN_CONFIG || { DEMO_MODE: true, API_BASE_URL: '/api' };
  const DEMO_KEY = 'the-haven-demo-v1';
  const LOGO = './assets/haven-logo.png';
  const DEFAULT_BRAND = "THE HAVEN: PEER FACILITATORS' COMMUNITY";
  const brandName=()=>String(state.settings?.branding?.name||DEFAULT_BRAND);
  const brandLogo=()=>{
    const value=state.settings?.branding?.logoDataUrl;
    return typeof value==='string'&&value.length<=480000&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value)?value:LOGO;
  };
  const brandParts=()=>{const [a,...b]=brandName().split(':');return [a.trim(),b.join(':').trim()];};
  function applyBranding(){
    document.title=brandName()+' | Fellowship Baptist College';
    const icon=document.querySelector('link[rel="icon"]');if(icon)icon.href=brandLogo();
    const logo=document.querySelector('.splash-logo');if(logo)logo.src=brandLogo();
    const name=document.querySelector('.splash-name');if(name)name.textContent=brandParts()[0];
    const sub=document.querySelector('.splash-subtitle');if(sub)sub.textContent=brandParts()[1];
  }
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

  // Default landing copy until the administrator saves custom text in settings.
  const DEFAULT_LANDING = {
    eyebrow: 'WHAT WE BELIEVE IN',
    heading: 'Your community starts here.',
    intro: 'One welcoming place to discover shared interests, connect with fellow students, and follow your application journey.',
    cards: [
      { title: 'Meaningful Connections', description: 'Discover a welcoming community built around listening, understanding, and support.' },
      { title: 'Growth & Leadership', description: 'Explore opportunities to learn new skills and develop as a student facilitator.' },
      { title: 'Simple Registration', description: 'Apply online, receive updates, and track your club journey in one convenient place.' }
    ]
  };
  const landingContent = () => state.settings?.landingPage || DEFAULT_LANDING;
  const renderLandingCard = item => `<div class="feature-card no-icon"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p></div>`;
  const state = { user:null, staff:[], clubs:[], applications:[], memberships:[], announcements:[], notifications:[], users:[], leaders:[], clubStaff:[], allMemberships:[], memberPage:1, memberPagination:null, stats:{}, settings:{academicYear:'2026–2027'}, route:'home', category:'All', search:'', sidebar:false, busy:false };

  const demoSeed = () => ({
    currentUser:'u-student', academicYear:'2026–2027', landingPage:DEFAULT_LANDING, branding:{name:DEFAULT_BRAND,logoDataUrl:null}, seq:20,
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
  let modalReturnFocus = null;
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
      const newUser={_id:newId('u'),fullName:payload.fullName,email:payload.email,studentId:payload.studentId,department:payload.department,yearLevel:payload.yearLevel,role:'student',status:'pending',registrationNote:''};
      demo.users.push(newUser);demo.currentUser=newUser._id;return saved({user:newUser});
    }
    if(cleanPath==='/auth/login'&&method==='POST'){
      // Demo credentials intentionally NOT checked — simulated role preview only.
      const found=demo.users.find(u=>u.email===payload.email);if(!found)err('Demo email not found. Use a demo role selector instead.');
      demo.currentUser=found._id;return saved({user:found});
    }
    if(cleanPath==='/auth/logout'&&method==='POST'){demo.currentUser='';return saved({ok:true});}
    if(cleanPath==='/me/profile'&&method==='PUT'){
      if(!user||user.status!=='active')err('Administrator approval required.');
      if(String(payload.fullName||'').trim().length<2)err('Enter a valid name.');
      user.fullName=String(payload.fullName).trim();user.department=String(payload.department||'').trim();user.yearLevel=String(payload.yearLevel||'').trim();
      return saved({user});
    }
    if(cleanPath==='/me/password'&&method==='PUT'){
      if(!user||user.status!=='active')err('Administrator approval required.');
      if(String(payload.newPassword||'').length<8)err('Password requires 8 characters.');
      return saved({ok:true});
    }
    if(cleanPath==='/admin/accounts'&&method==='POST'){
      if(!admin)err('Administrator permission required.');
      if(String(payload.password||'').length<12)err('Administrator password requires 12 characters.');
      if(demo.users.some(u=>u.email===payload.email))err('Email already registered.');
      const created={_id:newId('u'),fullName:payload.fullName,email:payload.email,studentId:'',department:'',yearLevel:'',role:'admin',status:'active'};
      demo.users.push(created);return saved({user:created});
    }
    if(cleanPath==='/clubs'&&method==='GET')return {clubs:demo.clubs.filter(c=>c.status!=='archived')};
    if(cleanPath==='/admin/clubs'&&method==='GET'){
      if(!admin)err('Administrator permission required.');
      return {clubs:demo.clubs};
    }
    if(cleanPath==='/clubs'&&method==='POST'){
      if(!admin)err('Administrator access required.');const c={...payload,_id:newId('c'),capacity:Number(payload.capacity),memberCount:0,status:'open'};demo.clubs.push(c);return saved({club:c});
    }
    if(parts[0]==='clubs' && parts[1] && method==='PATCH'){
      if(!admin)err('Administrator access required.');const c=clubAt(parts[1]);if(!c)err('Club not found.');Object.assign(c,payload);c.capacity=Number(c.capacity);return saved({club:c});
    }
    if(parts[0]==='users'&&parts[2]==='registration'&&method==='PATCH'){
      if(!admin)err('Administrator permission required.');
      const account=userAt(parts[1]);
      if(!account||account.role!=='student'||!['pending','rejected'].includes(account.status))err('Account cannot be reviewed.');
      if(!['approved','rejected'].includes(payload.decision))err('Invalid decision.');
      account.status=payload.decision==='approved'?'active':'rejected';
      account.registrationNote=account.status==='rejected'?String(payload.note||''):'';
      return saved({user:account});
    }
    if(cleanPath==='/applications'&&method==='GET'){
      if(!admin)err('Administrator permission required.');
      const list=demo.applications.filter(a=>query.get('mine')==='1'?a.studentId===user?._id:admin||isStaff(a.clubId));
      return {applications:list.map(a=>({...a,clubId:clubAt(a.clubId),studentId:userAt(a.studentId)})).reverse()};
    }
    if(cleanPath==='/applications'&&method==='POST'){
      if(!admin)err('Administrator permission required.');const c=clubAt(payload.clubId);if(!c||c.status!=='open')err('Club is not accepting applications.');
      if(String(payload.motivation||'').trim().length<15)err('Please write at least 15 characters for your motivation.');
      if(demo.applications.some(a=>a.studentId===user._id&&a.clubId===c._id&&a.academicYear===demo.academicYear))err('You have already applied to this club this year.');
      const a={_id:newId('a'),studentId:user._id,clubId:c._id,academicYear:demo.academicYear,motivation:payload.motivation,createdAt:new Date().toISOString(),status:c.memberCount>=c.capacity?'waitlisted':'pending',remarks:''};demo.applications.push(a);msg(user._id,'Application submitted',`${c.name}: Your application is ${a.status}.`);return saved({application:a});
    }
    if(parts[0]==='applications' && parts[1] && parts[2]==='review'&&method==='PATCH'){
      const a=demo.applications.find(x=>x._id===parts[1]);if(!admin||!a)err('Not authorized for this club.');if(!['pending','waitlisted','under_review'].includes(a.status))err('This application is already finalized.');
      const c=clubAt(a.clubId);if(payload.status==='approved') {if(c.memberCount>=c.capacity)err('Club is full. Choose Waitlisted.');c.memberCount++;demo.memberships.push({_id:newId('m'),studentId:a.studentId,clubId:a.clubId,academicYear:a.academicYear,joinedAt:new Date().toISOString(),status:'active'});}
      a.status=payload.status;a.remarks=payload.remarks||'';a.reviewedAt=new Date().toISOString();msg(a.studentId,'Application update',`${c.name}: Your application is now ${a.status}.`);return saved({ok:true,status:a.status});
    }
    if(parts[0]==='applications'&&parts[2]==='cancel'&&method==='PATCH'){
      const a=demo.applications.find(x=>x._id===parts[1]&&x.studentId===user?._id);if(!a||!['pending','waitlisted'].includes(a.status))err('Cannot cancel this application.');a.status='cancelled';return saved({application:a});
    }
    if(cleanPath==='/memberships'&&method==='GET'){
      if(!admin)err('Administrator permission required.');
      const cid=query.get('clubId'), all=query.get('all')==='1';
      if(all&&!admin)err('Administrator permission required to view all memberships.');
      if(all&&cid)err('Choose all memberships or one club.');
      if(cid&&!isStaff(cid))err('Not authorized.');
      const rows=demo.memberships.filter(m=>all?true:cid?m.clubId===cid:m.studentId===user?._id).reverse();
      const page=Number(query.get('page')||1), pageSize=100;
      if(all&&(!Number.isSafeInteger(page)||page<1))err('Invalid membership page.');
      return all
        ? {memberships:rows.slice((page-1)*pageSize,page*pageSize).map(m=>({...m,clubId:clubAt(m.clubId),studentId:userAt(m.studentId)})),pagination:{page,pageSize,total:rows.length,pages:Math.max(1,Math.ceil(rows.length/pageSize))}}
        : {memberships:rows.map(m=>({...m,clubId:clubAt(m.clubId),studentId:userAt(m.studentId)}))};
    }
    if(cleanPath==='/staff'&&method==='GET'){if(!admin)err('Administrator permission required.');return {staff:demo.staff.filter(s=>admin||s.userId===user?._id).map(s=>({...s,clubId:clubAt(s.clubId),userId:userAt(s.userId)}))};}
    if(cleanPath==='/staff'&&method==='POST'){
      if(!admin)err('Administrator access required.');if(!demo.staff.some(s=>s.userId===payload.userId&&s.clubId===payload.clubId&&s.role===payload.role))demo.staff.push({_id:newId('s'),...payload});return saved({ok:true});
    }
    if(parts[0]==='staff'&&parts[1]&&method==='DELETE'){
      if(!admin)err('Administrator permission required.');
      const position=demo.staff.findIndex(x=>x._id===parts[1]);
      if(position<0)err('Assignment not found.');
      demo.staff.splice(position,1);return saved({ok:true});
    }
    if(cleanPath==='/leadership'&&method==='GET'){
      if(!user||user.status!=='active')err('Administrator approval required.');
      return {leaders:demo.staff.filter(x=>userAt(x.userId)?.status==='active'&&clubAt(x.clubId)?.status!=='archived').map(x=>({_id:x._id,fullName:userAt(x.userId)?.fullName,clubId:x.clubId,clubName:clubAt(x.clubId)?.name,role:x.role}))};
    }
    if(cleanPath==='/announcements'&&method==='GET')return {announcements:demo.announcements.map(a=>({...a,clubId:clubAt(a.clubId)||null,authorId:userAt(a.authorId)})).reverse()};
    if(cleanPath==='/announcements'&&method==='POST'){
      if(!admin)err('Administrator permission required.');const a={_id:newId('n'),...payload,authorId:user._id,createdAt:new Date().toISOString()};demo.announcements.push(a);return saved({announcement:a});
    }
    if(cleanPath==='/notifications'&&method==='GET')return {notifications:demo.notifications.filter(n=>n.userId===user?._id).reverse()};
    if(parts[0]==='notifications'&&parts[2]==='read'&&method==='PATCH'){const n=demo.notifications.find(x=>x._id===parts[1]&&x.userId===user?._id);if(n)n.read=true;return saved({ok:true});}
    if(cleanPath==='/users'&&method==='GET'){if(!admin)err('Administrator only.');return {users:demo.users};}
    if(parts[0]==='users'&&parts[1]&&method==='PATCH'){if(!admin)err('Administrator only.');const u=userAt(parts[1]);if(!u)err('User not found.');if(payload.status==='active'&&u.status!=='disabled')err('Use registration approval.');if(payload.status==='disabled'&&u.status!=='active')err('Only approved users may be disabled.');u.status=payload.status;return saved({user:u});}
    if(cleanPath==='/stats'&&method==='GET'){
      if(!admin)err('Administrator permission required.');
      const apps=demo.applications.filter(a=>admin||isStaff(a.clubId));
      return {stats:{clubs:demo.clubs.filter(c=>admin||isStaff(c._id)).length,applications:apps.length,memberships:demo.memberships.filter(m=>admin||isStaff(m.clubId)).length,students:admin?demo.users.filter(u=>u.role==='student').length:null,pending:apps.filter(a=>['pending','under_review'].includes(a.status)).length}};
    }
    if(cleanPath==='/settings'&&method==='GET')return {academicYear:demo.academicYear,landingPage:demo.landingPage||DEFAULT_LANDING,branding:demo.branding||{name:DEFAULT_BRAND,logoDataUrl:null}};
    if(cleanPath==='/settings/branding'&&method==='PUT'){
      if(!admin)err('Administrator permission required.');
      const name=String(payload.name||'').trim();
      if(name.length<2||name.length>100)err('Invalid website name.');
      demo.branding={name,logoDataUrl:payload.logoDataUrl===undefined?(demo.branding?.logoDataUrl||null):payload.logoDataUrl};
      return saved({branding:demo.branding});
    }
    if(cleanPath==='/settings/landing-page'&&method==='PUT'){
      if(!admin)err('Administrator access required.');
      if(!payload||!Array.isArray(payload.cards)||payload.cards.length!==3)err('Exactly three cards required.');
      demo.landingPage=payload;return saved({landingPage:demo.landingPage});
    }
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
  async function loadAllMemberships(page=1){
    if(!isAdmin())return;
    const result=await get('/memberships?all=1&page='+page);
    state.allMemberships=result.memberships||[];
    state.memberPagination=result.pagination||{page,pageSize:100,total:state.allMemberships.length,pages:1};
    state.memberPage=page;
  }
  async function fetchAll(){
    try{
      const [clubs,settings]=await Promise.all([get('/clubs'),get('/settings')]);
      state.clubs=clubs.clubs;state.settings=settings;applyBranding();
      try{const me=await get('/me');state.user=me.user||null;state.staff=me.staff||[];}catch{state.user=null;state.staff=[];}
      state.applications=[];state.memberships=[];state.announcements=[];state.notifications=[];
      state.users=[];state.leaders=[];state.clubStaff=[];state.staffApplications=[];state.allMemberships=[];state.stats={};
      if(state.user?.status==='active'){
        const call=async(path,key,value)=>{try{state[key]=(await get(path))[value];}catch{state[key]=key==='stats'?{}:[];}};
        await Promise.all([call('/announcements','announcements','announcements'),call('/leadership','leaders','leaders')]);
        if(state.user.role==='admin'){
          await Promise.all([call('/users','users','users'),call('/staff','clubStaff','staff'),call('/applications','staffApplications','applications'),call('/stats','stats','stats'),call('/notifications','notifications','notifications')]);
          try{await loadAllMemberships(state.memberPage);}catch{state.allMemberships=[];state.memberPagination=null;}
          try{state.clubs=(await get('/admin/clubs')).clubs;}catch{/* retain fallback */}
        }
      }
      if(state.user?.role!=='admin'){state.memberPage=1;state.memberPagination=null;}
      render();
    }catch(err){
      $('#app').innerHTML=`<div style="padding:70px 20px;text-align:center"><h2>Cannot load the community website</h2><p>${escapeHtml(err.message)}</p><button class="button primary" data-action="retry-loading">Retry</button></div>`;
    }
  }
  function canAccessRoute(route){
    if(!state.user)return ['home','clubs'].includes(route);
    if(state.user.status!=='active')return route==='approval-status';
    if(isAdmin())return ['home','clubs','dashboard','announcements','leadership','profile','notifications','applications','memberships','staff-applications','staff-members','admin-clubs','admin-members','admin-users','admin-registrations','admin-leadership','reports','settings'].includes(route);
    return ['dashboard','leadership','profile'].includes(route);
  }
  function nav(route){
    if(!canAccessRoute(route)){toast('Access restricted for this account.',true);route=state.user?(state.user.status==='active'?'dashboard':'approval-status'):'home';}
    state.route=route;state.sidebar=false;const hash='#/'+route;
    if(location.hash!==hash)location.hash=hash;
    render();window.scrollTo({top:0,behavior:'instant'});
  }
  function toast(message,isError=false){const root=$('#toast-region');const el=document.createElement('div');el.className='toast'+(isError?' error':'');el.setAttribute('role',isError?'alert':'status');el.textContent=message;root.append(el);setTimeout(()=>el.remove(),4100);}
  async function mutation(method,path,body,success='Changes saved.'){
    if(state.busy)return false;
    state.busy=true;
    try{await api(method,path,body);closeModal();await fetchAll();toast(success);return true;}
    catch(e){toast(e.message,true);return false;}finally{state.busy=false;}
  }
  function showModal(title,body,onSubmit,{wide=false,submitLabel='Save changes',subtitle=''}={}){
    if(!$('#modal-root').childElementCount)modalReturnFocus=document.activeElement;
    document.body.classList.add('modal-open');
    $('#modal-root').innerHTML=`<div class="modal-backdrop" data-action="modal-backdrop"><div class="modal ${wide?'wide':''}" role="dialog" aria-modal="true" aria-label="${escapeHtml(title||'THE HAVEN dialog')}"><div class="modal-header ${title?'':'no-title'}">${title?'<h2>'+escapeHtml(title)+'</h2>':''}<button type="button" class="close-modal" data-action="close-modal" aria-label="Close">×</button></div>${subtitle?`<p class="modal-sub">${escapeHtml(subtitle)}</p>`:''}<form id="modal-form">${body}<div class="modal-footer"><button class="button ghost" type="button" data-action="close-modal">Cancel</button><button type="submit" class="button primary">${escapeHtml(submitLabel)}</button></div></form></div></div>`;
    const form=$('#modal-form');form.addEventListener('submit',async ev=>{ev.preventDefault();const data=Object.fromEntries(new FormData(form));const btn=form.querySelector('button[type=submit]');btn.disabled=true;try{await onSubmit(data);}finally{if(btn.isConnected)btn.disabled=false;}});
    setTimeout(()=>form.querySelector('input,textarea,select')?.focus(),80);
  }
  const field=(name,label,type='text',value='',attrs='')=>`<div class="field ${type==='password'?'password-field':''}"><label for="f-${name}">${escapeHtml(label)}</label><input class="input" id="f-${name}" type="${type}" name="${name}" value="${escapeHtml(value)}" ${attrs}>${type==='password'?'<button type="button" class="password-toggle" data-action="toggle-password" aria-label="Show password" aria-pressed="false">Show</button>':''}</div>`;
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
  const card = (c,i=0) => `<article class="club-card"><div class="club-art ${escapeHtml(c.accent||'gold')}"><span class="top-tag ${c.status==='open'?'':'closed'}">${escapeHtml(c.status==='open'?'Registration Open':'Registration Closed')}</span><div class="club-art-symbol">${alphabet[i%alphabet.length]}</div></div><div class="club-body"><div class="club-category">${escapeHtml(c.category)}</div><h3 class="club-title">${escapeHtml(c.name)}</h3><p class="club-desc">${escapeHtml(c.tagline||c.description).slice(0,112)}</p><div class="club-capacity"><div class="club-capacity-top"><span>Club capacity</span><span>${Math.max(0,c.memberCount)} / ${c.capacity} members</span></div><div class="club-progress" role="progressbar" aria-label="${escapeHtml(c.name)} membership capacity" aria-valuemin="0" aria-valuemax="${c.capacity}" aria-valuenow="${Math.min(c.capacity,Math.max(0,c.memberCount))}"><div class="club-progress-fill" style="width:${Math.min(100,Math.max(0,Math.round(c.memberCount/Math.max(1,c.capacity)*100)))}%"></div></div></div><div class="club-footer"><span class="tiny">${Math.max(0,c.capacity-c.memberCount)} slots available</span><button class="button secondary sm" data-action="club" data-id="${id(c)}" aria-label="View details for ${escapeHtml(c.name)}">Details →</button></div></div></article>`;
  const categoryFilters=()=>['All',...new Set(state.clubs.filter(c=>c.status!=='archived').map(c=>c.category))];

  function publicSite(){
    const onClubs=state.route==='clubs';
    const body=onClubs?`<div class="public-clubs">${topHeading('Explore our communities','Find a club where you can learn, connect, and make a difference.')} ${searchAndFilters()}<div id="club-results" class="club-grid">${filterClubs().map(card).join('')||empty('⌕','No clubs found','Try a different search or category.')}</div></div>`:
      `<section class="public-hero hero-simple"><div><div class="eyebrow">WELCOME TO A COMMUNITY THAT CARES</div><div class="hero-actions"><button class="button primary" data-action="go-clubs">Explore Clubs &nbsp;→</button><button class="button secondary" data-action="${state.user?'go-dashboard':'register'}">${state.user?'My Dashboard':'Join the Community'}</button></div><div class="hero-facts"><span>Discover communities</span><span>Apply in a few steps</span><span>Track applications</span></div><p class="helper" style="margin-top:22px">✦ Fellowship Baptist College &nbsp; · &nbsp; Stronger together</p></div><div class="public-art"><img src="${brandLogo()}" alt="Community logo"></div></section><section class="public-info"><div class="public-inner"><div class="section-intro"><div class="eyebrow">${escapeHtml(landingContent().eyebrow)}</div><h2>${escapeHtml(landingContent().heading)}</h2><p>${escapeHtml(landingContent().intro)}</p></div><div class="feature-grid">${landingContent().cards.map(renderLandingCard).join('')}</div></div></section>`;
    return `<div class="public-wrap"><header class="public-header"><a class="public-logo" href="#/home"><img src="${brandLogo()}" alt="Community logo"><span><b>${escapeHtml(brandParts()[0])}</b><small>${escapeHtml(brandParts()[1])}</small></span></a><nav class="public-nav" aria-label="Public navigation"><button class="plain" data-action="go-home">Home</button><button class="plain" data-action="go-clubs">Explore</button><button class="button primary sm" data-action="${state.user?'go-dashboard':'login'}">${state.user?'Dashboard':'Log In'}</button></nav></header><main id="main-content">${body}</main><footer class="public-footer">© ${new Date().getFullYear()} ${escapeHtml(brandName())} · Fellowship Baptist College</footer></div>`;
  }
  function sideNav(){
    const members=[['dashboard','⌂','Dashboard'],['leadership','♙','Officers & Advisers'],['profile','⚙','Account Settings']];
    const adminPages=[['dashboard','⌂','Dashboard'],['announcements','◌','Announcements'],['leadership','♙','Community Leadership'],['profile','⚙','My Account']];
    const management=[['admin-registrations','▣','Registration Requests'],['admin-leadership','♧','Manage Officers'],['admin-users','♧','User Management'],['admin-clubs','▦','Manage Clubs'],['staff-applications','▣','Club Applications'],['staff-members','♙','Club Members'],['admin-members','♙','All Memberships'],['reports','▥','Reports'],['settings','⚙','System Settings']];
    const section=rows=>`<div class="nav-list">${rows.map(([route,icon,label])=>`<button class="nav-link ${state.route===route?'active':''}" data-action="navigate" data-route="${route}" ${state.route===route?'aria-current="page"':''}><span class="nav-icon" aria-hidden="true">${icon}</span><span>${label}</span></button>`).join('')}</div>`;
    const [main,sub]=brandParts();
    return `<aside class="sidebar ${state.sidebar?'open':''}" aria-label="Main navigation"><a href="#/dashboard" class="side-brand"><img src="${brandLogo()}" alt="Community logo"><span><div class="brand-title">${escapeHtml(main)}</div><div class="brand-sub">${escapeHtml(sub)}</div></span></a><div class="nav-section-label">WORKSPACE</div>${section(isAdmin()?adminPages:members)}${isAdmin()?`<div class="nav-section-label">ADMINISTRATION</div>${section(management)}`:''}<div class="side-bottom"><div class="mini-profile"><span class="avatar">${abbr(state.user.fullName)}</span><span><div class="profile-name">${escapeHtml(state.user.fullName)}</div><div class="profile-role">${isAdmin()?'Administrator':'Approved Member'}</div></span></div><button class="side-exit" data-action="logout">↪ &nbsp; Sign out</button></div></aside>`;
  }
  const titles={dashboard:'Dashboard',clubs:'Explore Clubs',applications:'Applications',memberships:'Memberships',announcements:'Announcements',leadership:'Officers & Advisers',profile:'Account Settings',notifications:'Notifications','staff-applications':'Club Applications','staff-members':'Club Members','admin-clubs':'Manage Clubs','admin-members':'All Memberships','admin-users':'User Management','admin-registrations':'Registration Requests','admin-leadership':'Manage Officers & Advisers',reports:'Reports & Analytics',settings:'System Settings'};
  function shell(){
    const demoBar=cfg.DEMO_MODE?`<div class="demo-bar"><span><b>✦ Preview mode</b> · Data is stored in this browser only; no real accounts.</span><div class="demo-actions">${[['u-student','Student'],['u-adviser','Adviser'],['u-officer','Officer'],['u-admin','Admin']].map(([u,t])=>`<button data-action="demo-role" data-id="${u}" class="${demo.currentUser===u?'selected':''}">${t}</button>`).join('')}<button data-action="reset-demo">Reset</button></div></div>`:'';
    return `<div class="app-shell">${sideNav()}<div class="overlay ${state.sidebar?'open':''}" data-action="sidebar-toggle"></div><main class="main" id="main-content"><header class="topbar"><div style="display:flex;gap:12px;align-items:center"><button class="mobile-menu-btn" data-action="sidebar-toggle" aria-label="${state.sidebar?'Close':'Open'} navigation" aria-expanded="${state.sidebar}">☰</button><div><div class="top-title">${escapeHtml(titles[state.route]||'THE HAVEN')}</div><div class="top-subtitle">${escapeHtml(state.settings.academicYear)} · Fellowship Baptist College</div></div></div><div class="top-actions">${isAdmin()?`<button class="icon-button" data-action="navigate" data-route="notifications" title="Notifications" aria-label="Notifications">♧ ${unread()?'<span class="notif-dot"></span>':''}</button>`:''}<span class="avatar sm">${abbr(state.user.fullName)}</span></div></header><div class="content">${demoBar}${view()}</div></main></div>`;
  }
  function statCard(label,num,hint,ic){return `<div class="stat-card"><div class="stat-top"><span>${label}</span><span class="stat-icon">${ic}</span></div><div class="stat-number">${num}</div><div class="stat-hint">${hint}</div></div>`;}
  function dashboard(){
    if(!isAdmin()){
      const announcements=state.announcements||[];
      return topHeading('Welcome, '+escapeHtml(studentName()),'Community announcements and updates.')+
        `<div class="community-intro panel"><div><div class="eyebrow">MEMBER DASHBOARD</div><h2>Stay connected with your community.</h2><p>Latest updates from your administrators.</p></div><button class="button secondary sm" data-action="navigate" data-route="leadership">Meet Officers & Advisers</button></div>`+
        `<div class="section-heading"><h2>Announcements</h2></div>`+
        `<div class="community-announcement-list">${announcements.length?announcements.map(announcementCard).join(''):empty('◌','No announcements yet','Admin announcements will appear here.')}</div>`;
    }
    const waiting=state.users.filter(u=>u.role==='student'&&u.status==='pending').length;
    const approvalNotice=`<div class="admin-review-banner panel"><div><div class="eyebrow">REGISTRATION APPROVALS</div><h2>${waiting} account${waiting===1?'':'s'} waiting for review</h2><p>Approve or reject new registrations before members can access the club dashboard.</p></div><button class="button primary sm" data-action="navigate" data-route="admin-registrations">Review Requests</button></div>`;
    const mine=myApps();const myMemberships=state.memberships;const pending=mine.filter(a=>['pending','under_review','waitlisted'].includes(a.status)).length;
    const managed=isAdmin()||hasStaff();
    const metrics=managed?[
      ['Active Clubs',state.stats.clubs??state.clubs.length,'In your managed scope','◇'],
      ['Applications',state.stats.applications??0,'Total submissions','▤'],
      ['Pending Review',state.stats.pending??0,'Need a decision','◷'],
      ['Memberships',state.stats.memberships??0,'Approved students','♧']
    ]:[['Available Clubs',state.clubs.filter(c=>c.status==='open').length,'Open for registration','◇'],['My Applications',mine.length,'Applications submitted','▤'],['Pending',pending,'Awaiting a decision','◷'],['My Memberships',myMemberships.length,'Clubs joined','♧']];
    const nextStep=managed?'':`<section class="next-step" aria-label="Suggested next step"><div class="next-step-icon" aria-hidden="true">✦</div><div><div class="eyebrow">YOUR NEXT STEP</div><h2>${pending?'Keep an eye on your applications':mine.length?'Discover what comes next':'Find your people, start your journey'}</h2><p>${pending?'Your application status will be updated here after review.':'Explore the communities available and choose one that interests you.'}</p></div><button class="button secondary sm" data-action="${pending?'navigate':'go-clubs'}" ${pending?'data-route="applications"':''}>${pending?'Track Status':'Explore Clubs'} →</button></section>`;
    return approvalNotice+`<div class="welcome"><div><div class="eyebrow">✧ &nbsp; YOUR COMMUNITY, YOUR SPACE</div><h1>Welcome ${escapeHtml(studentName())},<br>we're glad you're here.</h1><p>${managed?'Guide your community, review applications, and bring members together.':'Find your place, make meaningful connections, and grow with THE HAVEN.'}</p><button class="button primary" data-action="${managed?'go-review':'go-clubs'}">${managed?'Review Applications':'Explore Communities'} &nbsp;→</button></div><img class="welcome-image" src="${brandLogo()}" alt="Community logo"></div><div class="stat-grid">${metrics.map(x=>statCard(...x)).join('')}</div>${nextStep}<div class="grid-main" style="margin-top:22px"><section><div class="section-heading"><div><h2>${managed?'Recent Applications':'Discover communities'}</h2><p>${managed?'Applications that may need your attention':'Clubs you might love'}</p></div><button class="text-link" data-action="${managed?'go-review':'go-clubs'}">View all →</button></div>${managed?`${applicationTable(staffApps().slice(0,5),true)}`:`<div class="club-grid" style="grid-template-columns:repeat(auto-fit,minmax(205px,1fr))">${state.clubs.slice(0,2).map(card).join('')}</div>`}</section><section><div class="section-heading"><h2>Community updates</h2><button class="text-link" data-action="navigate" data-route="announcements">View all →</button></div><div class="panel activity-list">${state.announcements.slice(0,4).map(a=>`<div class="activity-item"><span class="activity-marker">✦</span><div><div class="activity-title">${escapeHtml(a.title)}</div><div class="activity-text">${escapeHtml(a.body).slice(0,126)}</div><div class="activity-time">${ago(a.createdAt)}</div></div></div>`).join('')||empty('◌','No updates yet','Announcements will appear here.')}</div></section></div>`;
  }
  function filterClubs(){return state.clubs.filter(c=>c.status!=='archived'&&(state.category==='All'||c.category===state.category)&&(c.name+' '+c.description+' '+c.category).toLowerCase().includes(state.search.toLowerCase()));}
  function searchAndFilters(){return `<div class="searchbar"><div class="searchwrap"><label for="club-search" class="sr-only">Search available clubs</label><span class="search-symbol" aria-hidden="true">⌕</span><input id="club-search" class="input" type="search" placeholder="Search clubs, interests, activities..." value="${escapeHtml(state.search)}" aria-label="Search clubs"></div></div><div class="filters">${categoryFilters().map(c=>`<button class="filter ${state.category===c?'active':''}" aria-pressed="${state.category===c}" data-action="category" data-category="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('')}</div><p class="results-summary" id="club-result-count" role="status">${filterClubs().length} ${filterClubs().length===1?'community':'communities'} found</p>`;}
  function clubsPage(){return `${topHeading('Find your community','Explore clubs and discover opportunities to connect, grow and serve.')} ${searchAndFilters()}<div id="club-results" class="club-grid">${filterClubs().map(card).join('')||empty('⌕','No clubs found','Try a different search or category.')}</div>`;}
  function applicationTable(apps,manage=false){
    if(!apps.length)return empty('▤',manage?'No applications to review':'No applications yet',manage?'Applications will appear once students register.':'Explore clubs and submit your first application.');
    return `<div class="table-wrap"><table><thead><tr><th>${manage?'Student':'Club'}</th><th>${manage?'Club':'Academic Year'}</th><th>Applied</th><th>Status</th><th>Action</th></tr></thead><tbody>${apps.map(a=>`<tr><td><div class="table-person">${escapeHtml(manage?a.studentId?.fullName:a.clubId?.name)}</div><div class="table-sub">${escapeHtml(manage?a.studentId?.studentId:a.clubId?.category)}</div></td><td>${escapeHtml(manage?a.clubId?.name:a.academicYear)}</td><td>${date(a.createdAt)}</td><td>${status(a.status)}</td><td><div class="table-action">${manage?`<button class="button secondary sm" data-action="review" data-id="${id(a)}">${isAdviser(a.clubId)?'Review':'Details'}</button>`:`<button class="button ghost sm" data-action="application-info" data-id="${id(a)}">Details</button>${['pending','waitlisted'].includes(a.status)?`<button class="button danger sm" data-action="cancel-app" data-id="${id(a)}">Cancel</button>`:''}`}</div></td></tr>`).join('')}</tbody></table></div>`;
  }
  function applicationsPage(){return topHeading('My Applications','Track every club application from submission to final decision.',`<button class="button primary sm" data-action="go-clubs">+ Apply to a Club</button>`)+applicationTable(myApps());}
  function membershipsPage(){return topHeading('My Clubs','Your approved memberships for this academic year.')+(state.memberships.length?`<div class="cards-two">${state.memberships.map(m=>`<div class="panel"><div class="eyebrow">ACTIVE MEMBER</div><h2 class="panel-title" style="margin:8px 0">${escapeHtml(m.clubId?.name)}</h2>${status(m.status)}<div class="divider"></div><p class="small muted">Joined ${date(m.joinedAt)} · ${escapeHtml(m.academicYear)}</p></div>`).join('')}</div>`:empty('◇','Your club journey starts here','Once your application is approved, your memberships will appear on this page.')) ;}
  function announcementsPage(){return topHeading('Community Announcements','Stay connected with our community.',isAdmin()?`<button class="button primary sm" data-action="create-announcement">+ New Announcement</button>`:'')+`<div style="display:grid;gap:13px">${state.announcements.map(a=>`<article class="panel"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><span class="badge">${escapeHtml(a.clubId?.name||'School-wide')}</span><span class="small muted">${date(a.createdAt)}</span></div><h3 style="margin:14px 0 8px;font-size:18px">${escapeHtml(a.title)}</h3><p style="line-height:1.8;color:#7d786d;margin:0;white-space:pre-wrap">${escapeHtml(a.body)}</p><p class="helper" style="margin:14px 0 0">Posted by ${escapeHtml(a.authorId?.fullName||'THE HAVEN')}</p></article>`).join('')||empty('◌','No announcements','Updates from your community will appear here.')}</div>`;}
  const announcementCard=a=>`<article class="panel community-announcement"><div class="community-announcement-meta"><span class="badge">${escapeHtml(a.clubId?.name||'Community')}</span><span class="small muted">${date(a.createdAt)}</span></div><h3>${escapeHtml(a.title)}</h3><p>${escapeHtml(a.body)}</p><p class="helper">Posted by ${escapeHtml(a.authorId?.fullName||'Administrator')}</p></article>`;

  function leadershipPage(){
    const leaders=state.leaders||[];
    const clubNames=[...new Set(leaders.map(x=>x.clubName))];
    const sections=clubNames.map(name=>`<div class="panel leadership-group"><h3>${escapeHtml(name)}</h3><div class="leadership-grid">${leaders.filter(x=>x.clubName===name).map(x=>`<div class="leader-card"><span class="avatar">${abbr(x.fullName)}</span><div><strong>${escapeHtml(x.fullName)}</strong><span class="small muted">${x.role==='adviser'?'Club Adviser':'Club Officer'}</span></div></div>`).join('')}</div></div>`);
    return topHeading('Officers & Advisers','Meet the official leadership of our community.')+
      (sections.length?`<div class="leadership-groups">${sections.join('')}</div>`:empty('♙','No assigned officers or advisers yet','The administrator can add community leaders.'));
  }
  function profilePage(){
    if(!state.user||state.user.status!=='active')return denied();
    const u=state.user;
    return topHeading('Account Settings','Update your profile and account security.')+
      `<div class="profile-settings-grid"><div class="panel"><h3 class="panel-title">My Profile</h3><div class="profile-fields"><div><span>Name</span><strong>${escapeHtml(u.fullName)}</strong></div><div><span>Email</span><strong>${escapeHtml(u.email)}</strong></div><div><span>Student ID</span><strong>${escapeHtml(u.studentId||'—')}</strong></div><div><span>Department</span><strong>${escapeHtml(u.department||'—')}</strong></div><div><span>Year Level</span><strong>${escapeHtml(u.yearLevel||'—')}</strong></div><div><span>Status</span><strong>Approved</strong></div></div><button class="button secondary sm" data-action="edit-profile">Edit Profile</button></div><div class="panel"><h3 class="panel-title">Account Security</h3><p class="small muted">Your password is private. Updating profile information cannot change account approval or role.</p><button class="button secondary sm" data-action="change-password">Change Password</button></div></div>`;
  }
  function adminRegistrationsPage(){
    if(!isAdmin())return denied();
    const pending=state.users.filter(u=>u.role==='student'&&u.status==='pending');
    const rejected=state.users.filter(u=>u.role==='student'&&u.status==='rejected');
    const renderTable=users=>`<div class="table-wrap"><table><thead><tr><th>Applicant</th><th>Student ID</th><th>Program</th><th>Status</th><th>Decision</th></tr></thead><tbody>${users.map(u=>`<tr><td><strong>${escapeHtml(u.fullName)}</strong><div class="small muted">${escapeHtml(u.email)}</div></td><td>${escapeHtml(u.studentId||'—')}</td><td>${escapeHtml(u.department||'—')}</td><td>${status(u.status)}</td><td><div class="table-action"><button class="button primary sm" data-action="approve-user" data-id="${id(u)}">Approve</button><button class="button danger sm" data-action="reject-user" data-id="${id(u)}">Reject</button></div></td></tr>`).join('')}</tbody></table></div>`;
    return topHeading('Registration Requests','Review applications before granting member dashboard access.')+
      `<div class="approval-count panel"><div class="eyebrow">AWAITING APPROVAL</div><h2>${pending.length} pending registrations</h2></div><div class="section-heading"><h2>Pending Requests</h2></div>`+
      (pending.length?renderTable(pending):empty('✓','No pending registrations','New registrations will show here.'))+
      `<div class="section-heading"><h2>Rejected Registrations</h2></div>`+
      (rejected.length?renderTable(rejected):empty('◌','No rejected accounts','Rejected registrations can be reconsidered here.'));
  }
  function adminLeadershipPage(){
    if(!isAdmin())return denied();
    const assignments=state.clubStaff||[];
    const cta=`<button class="button primary sm" data-action="assign-staff">+ Add Officer / Adviser</button>`;
    return topHeading('Manage Officers & Advisers','Assign approved users to community leadership roles.',cta)+
      (assignments.length?`<div class="table-wrap"><table><thead><tr><th>Name</th><th>Club</th><th>Role</th><th>Action</th></tr></thead><tbody>${assignments.map(x=>`<tr><td>${escapeHtml(x.userId?.fullName||'—')}</td><td>${escapeHtml(x.clubId?.name||'—')}</td><td>${x.role==='adviser'?'Club Adviser':'Club Officer'}</td><td><button class="button danger sm" data-action="remove-staff" data-id="${id(x)}">Remove</button></td></tr>`).join('')}</tbody></table></div>`:empty('♙','No assignments yet','Add the first club officer or adviser.'));
  }
  function approvalStatusPage(){
    const rejected=state.user.status==='rejected';
    return `<div class="approval-page"><div class="approval-panel"><img class="approval-logo" src="${brandLogo()}" alt="Community logo"><div class="eyebrow">REGISTRATION STATUS</div><h1>${rejected?'Registration Rejected':'Waiting for Admin Approval'}</h1><p>${rejected?'Your registration was not approved. Please contact the organization administrator.':'Your registration has been submitted. An administrator must approve your account before you can access the dashboard.'}</p>${rejected&&state.user.registrationNote?`<p class="approval-note"><strong>Admin note:</strong> ${escapeHtml(state.user.registrationNote)}</p>`:''}<div class="approval-actions"><button class="button primary" data-action="check-approval">Check Status</button><button class="button secondary" data-action="logout">Sign Out</button>${cfg.DEMO_MODE?'<button class="button ghost" data-action="demo-role" data-id="u-admin">Preview Admin</button>':''}</div><div class="small muted">Signed in as ${escapeHtml(state.user.email)}</div></div></div>`;
  }
  function notificationsPage(){return topHeading('Notifications','Keep track of important updates about your account and applications.')+`<div class="panel activity-list">${state.notifications.map(n=>`<div class="activity-item"><div class="activity-marker" style="${n.read?'opacity:.48':''}">${n.read?'◌':'✦'}</div><div style="flex:1"><div class="activity-title">${escapeHtml(n.title)} ${!n.read?'<span class="badge pending">New</span>':''}</div><div class="activity-text">${escapeHtml(n.message)}</div><div class="activity-time">${ago(n.createdAt)}</div></div>${!n.read?`<button data-action="mark-read" data-id="${id(n)}" class="button ghost sm">Mark read</button>`:''}</div>`).join('')||empty('♧','All caught up','No notifications right now.')}</div>`;}
  function staffApplicationsPage(){if(!hasStaff()&&!isAdmin())return denied();return topHeading('Application Review','Review club applications, make decisions, and welcome new members.')+applicationTable(staffApps(),true);}
  function membersPage(){if(!hasStaff()&&!isAdmin())return denied();const clubs=state.clubs.filter(c=>isStaffClub(c._id));return topHeading('Club Members','Manage and view approved members in your assigned communities.')+`<div class="cards-two">${clubs.map(c=>`<div class="panel"><div class="eyebrow">${escapeHtml(c.category)}</div><h3>${escapeHtml(c.name)}</h3><p class="small muted">${c.memberCount} / ${c.capacity} members</p><button class="button secondary sm" data-action="view-members" data-id="${id(c)}">View Members →</button></div>`).join('')||empty('♧','No assigned clubs','Ask the administrator to assign you to a club.')}</div>`;}
  function manageClubsPage(){if(!isAdmin())return denied();return topHeading('Club Management','Create, update and control club registration availability.',`<button class="button primary sm" data-action="create-club">+ Create Club</button>`)+`<div class="table-wrap"><table><thead><tr><th>Club</th><th>Category</th><th>Capacity</th><th>Status</th><th>Actions</th></tr></thead><tbody>${state.clubs.map(c=>`<tr><td><div class="table-person">${escapeHtml(c.name)}</div></td><td>${escapeHtml(c.category)}</td><td>${c.memberCount}/${c.capacity}</td><td>${status(c.status)}</td><td><button class="button secondary sm" data-action="edit-club" data-id="${id(c)}">Edit Club</button></td></tr>`).join('')}</tbody></table></div>`;}
  function adminMembersPage(){
    if(!isAdmin())return denied();
    const rows=state.allMemberships||[];
    const body=rows.length
      ?`<div class="table-wrap"><table><thead><tr><th>Student</th><th>Student ID</th><th>Club</th><th>Academic Year</th><th>Status</th><th>Joined</th></tr></thead><tbody>${rows.map(m=>`<tr><td class="table-person">${escapeHtml(m.studentId?.fullName||'—')}</td><td>${escapeHtml(m.studentId?.studentId||'—')}</td><td>${escapeHtml(m.clubId?.name||'—')}</td><td>${escapeHtml(m.academicYear)}</td><td>${status(m.status)}</td><td>${date(m.joinedAt)}</td></tr>`).join('')}</tbody></table></div>`
      :empty('♧','No memberships yet','Approved members will appear here.');
    const pageInfo=state.memberPagination||{page:1,total:rows.length,pages:1,pageSize:100};
    const start=pageInfo.total?((pageInfo.page-1)*pageInfo.pageSize)+1:0;
    const end=Math.min(pageInfo.page*pageInfo.pageSize,pageInfo.total);
    const controls=`<div class="membership-pagination"><span class="small muted">Showing ${start}–${end} of ${pageInfo.total} members</span><div class="pagination-actions"><button type="button" class="button ghost sm" data-action="members-prev" ${pageInfo.page<=1?'disabled':''}>Previous</button><span class="small">Page ${pageInfo.page} / ${pageInfo.pages}</span><button type="button" class="button ghost sm" data-action="members-next" ${pageInfo.page>=pageInfo.pages?'disabled':''}>Next</button></div></div>`;
    return topHeading('All Memberships','School-wide membership records, available only to system administrators.')+body+controls;
  }
  function adminUsersPage(){
    if(!isAdmin())return denied();
    const actions=`<div class="admin-actions"><button class="button primary sm" data-action="create-admin">+ Add Administrator</button><button class="button secondary sm" data-action="assign-staff">+ Assign Officer / Adviser</button></div>`;
    const rows=state.users.map(u=>`<tr><td><strong>${escapeHtml(u.fullName)}</strong></td><td>${escapeHtml(u.studentId||'—')}</td><td>${escapeHtml(u.email)}</td><td>${u.role==='admin'?'Administrator':'Student'}</td><td>${status(u.status)}</td><td>${u.status==='active'&&id(u)!==id(state.user)?`<button class="button ghost sm" data-action="toggle-user" data-id="${id(u)}">Disable</button>`:u.status==='disabled'?`<button class="button secondary sm" data-action="toggle-user" data-id="${id(u)}">Reactivate</button>`:u.status==='pending'||u.status==='rejected'?`<button class="button secondary sm" data-action="navigate" data-route="admin-registrations">Review</button>`:'—'}</td></tr>`).join('');
    return topHeading('User Management','Manage all member accounts, roles and administrators.',actions)+
      `<div class="table-wrap"><table><thead><tr><th>Name</th><th>Student ID</th><th>Email</th><th>Role</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  function reportsPage(){if(!isAdmin())return denied();return topHeading('Reports & Analytics','School-wide snapshots and registration report exports.',`<button class="button primary sm" data-action="download-report">↓ Export Applications CSV</button>`)+`<div class="stat-grid" style="margin:0 0 24px">${[['Clubs',state.stats.clubs||0,'Active club records','◇'],['Applications',state.stats.applications||0,'All applications','▤'],['Memberships',state.stats.memberships||0,'Confirmed members','♧'],['Students',state.stats.students||0,'Registered students','✦']].map(x=>statCard(...x)).join('')}</div><div class="panel"><h3 class="panel-title">Application Status Breakdown</h3>${['pending','approved','rejected','waitlisted','cancelled'].map(st=>{const count=staffApps().filter(a=>a.status===st).length;const pct=staffApps().length?Math.round(count/staffApps().length*100):0;return `<div style="display:grid;grid-template-columns:105px 1fr 35px;gap:13px;align-items:center;margin:14px 0"><span class="small muted" style="text-transform:capitalize">${st}</span><div style="height:10px;background:#f2eee6;border-radius:30px;overflow:hidden"><div style="height:100%;width:${pct}%;background:#b89552;border-radius:30px"></div></div><b class="small">${count}</b></div>`}).join('')}</div>`;}
  function settingsPage(){
    if(!isAdmin())return denied();
    const landing=landingContent();
    return topHeading('System Settings','Manage the website branding, academic year and landing page.')+
      `<div class="cards-two"><div class="panel"><h3 class="panel-title">Website Name & Logo</h3><div class="brand-preview"><img src="${brandLogo()}" alt="Website logo"><div><strong>${escapeHtml(brandName())}</strong><p class="small muted">Shown on the splash screen and website navigation.</p></div></div><button class="button secondary sm" data-action="edit-branding">Edit Name & Logo</button></div><div class="panel"><h3 class="panel-title">Academic Year</h3><p class="small muted">Active academic year</p><div style="font:700 28px 'Playfair Display',serif;margin:16px 0">${escapeHtml(state.settings.academicYear)}</div><button class="button secondary sm" data-action="edit-year">Update Academic Year</button></div></div><div class="panel landing-settings-panel"><h3 class="panel-title">Landing Page Content</h3><p class="small muted">Edit the public heading, description and benefit card titles and descriptions.</p><div class="divider"></div><p class="small"><b>Current heading:</b> ${escapeHtml(landing.heading)}</p><button class="button secondary sm" data-action="edit-landing">Edit Landing Page</button></div>`;
  }
  function denied(){return empty('⊘','Access restricted','Your account does not have permission to view this page.');}
  function view(){
    return ({
      dashboard,announcements:announcementsPage,leadership:leadershipPage,profile:profilePage,
      clubs:clubsPage,applications:applicationsPage,memberships:membershipsPage,
      notifications:notificationsPage,'staff-applications':staffApplicationsPage,
      'staff-members':membersPage,'admin-clubs':manageClubsPage,'admin-members':adminMembersPage,
      'admin-users':adminUsersPage,'admin-registrations':adminRegistrationsPage,
      'admin-leadership':adminLeadershipPage,reports:reportsPage,settings:settingsPage
    }[state.route]||dashboard)();
  }
  function render(){
    if(!canAccessRoute(state.route)){
      state.route=state.user?(state.user.status==='active'?'dashboard':'approval-status'):'home';
      const hash='#/'+state.route;
      if(location.hash!==hash)location.hash=hash;
    }
    $('#app').innerHTML=state.user?.status&&state.user.status!=='active'
      ?approvalStatusPage():(state.route==='home'||!state.user)?publicSite():shell();
  }

  function openClub(cid){const c=clubOf(cid);if(!c)return;const applied=state.applications.some(a=>id(a.clubId)===id(c));const member=state.memberships.some(m=>id(m.clubId)===id(c));const content=`<div class="detail-intro"><div class="eyebrow">${escapeHtml(c.category)}</div><h3 style="font:700 23px 'Playfair Display',serif;margin:7px 0">${escapeHtml(c.tagline||c.name)}</h3><p style="margin:0">${escapeHtml(c.description)}</p></div><div class="detail-chip">◷ ${escapeHtml(c.meetingSchedule)}</div><div class="detail-chip">♧ ${c.memberCount}/${c.capacity} members</div><div class="detail-chip">${status(c.status)}</div><div class="divider"></div><p class="helper">${member?'You are already a member.':applied?'You have already submitted an application for this academic year.':'Tell us a little about yourself and why you would like to join.'}</p>`;
    showModal(c.name,content,async()=>{closeModal();if(!state.user){openAuth('register');return;}if(!member&&!applied)openApply(c._id);}, {wide:true,submitLabel:member?'Close':applied?'Back':state.user?'Apply to Join →':'Create Account →'});
  }
  function openApply(cid){const c=clubOf(cid);if(!c)return;showModal(`Apply to ${c.name}`,`<div class="banner">Academic Year: ${escapeHtml(state.settings.academicYear)} · ${Math.max(0,c.capacity-c.memberCount)} slots available</div><br><div class="split-input">${field('fullName','Student Name','text',state.user.fullName,'disabled')}${field('studentId','Student ID','text',state.user.studentId,'disabled')}</div>${textarea('motivation','Why do you want to join this club?','','required minlength="15" maxlength="1000" placeholder="Share your motivation in a few sentences..."')}<p class="helper">Your application will be reviewed by the assigned club adviser. Duplicate applications for the same academic year are not allowed.</p>`,data=>mutation('POST','/applications',{clubId:cid,motivation:data.motivation},'Your application has been submitted!'),{submitLabel:'Submit Application'});}
  function openAuth(mode){
    const login=mode==='login';const content=`<img class="auth-logo" src="${brandLogo()}" alt="Community logo"><h3 class="auth-title">${login?'Welcome back':'Join the Community'}</h3><p class="auth-desc">${login?'Sign in to view your account approval status.':'Register for community access. Your account requires administrator approval before the dashboard is available.'}</p>${cfg.DEMO_MODE?'<div class="auth-mode-note">Preview only · No real accounts or student records are created.</div>':''}${!login?field('fullName','Full Name','text','','required minlength="2"')+`<div class="split-input">${field('studentId','School Student ID','text','','required')}${field('yearLevel','Year Level','text','','placeholder="2nd Year"')}</div>`+field('department','Department / Program','text','','placeholder="e.g. College of Education"'):''}${field('email','Email Address','email','','required autocomplete="email"')}${field('password','Password','password','','required minlength="8" autocomplete="'+(login?'current-password':'new-password')+'"')}<p class="helper auth-helper">${cfg.DEMO_MODE?'Preview mode: account creation is simulated. Use the demo role controls to explore without credentials.':'Passwords must contain 8 or more characters. Please use school-approved account details.'}</p><p style="text-align:center;font-size:12px">${login?'New to THE HAVEN?':'Already a member?'} <button type="button" class="text-link" data-action="${login?'register':'login'}">${login?'Create an account':'Log in'}</button></p>`;
    showModal('',content,async data=>{const endpoint=login?'/auth/login':'/auth/register';try{await api('POST',endpoint,data);closeModal();await fetchAll();nav(state.user?.status==='active'?'dashboard':'approval-status');toast(login?'Signed in.':'Registration submitted for admin review.');}catch(e){toast(e.message,true)}},{submitLabel:login?'Log in →':'Create Account →'});
  }
  function editClub(cid){const c=cid?clubOf(cid):null;const name=c?'Edit Club':'Create New Club';const body=field('name','Club Name','text',c?.name||'','required maxlength="120"')+field('category','Category','text',c?.category||'','required')+field('tagline','Short Tagline','text',c?.tagline||'')+textarea('description','Club Description',c?.description||'','required')+`<div class="split-input">${field('capacity','Member Capacity','number',c?.capacity||50,`required min="${c?.memberCount||1}"`)}${field('meetingSchedule','Meeting Schedule','text',c?.meetingSchedule||'To be announced')}</div>`+choose('accent','Club Card Theme',['gold','rose','sage','blue'].map(x=>({value:x,label:x[0].toUpperCase()+x.slice(1)})),c?.accent||'gold')+(c?choose('status','Registration Status',['open','closed','archived'].map(x=>({value:x,label:x[0].toUpperCase()+x.slice(1)})),c.status):'');
    showModal(name,body,data=>mutation(c?'PATCH':'POST',c?`/clubs/${c._id}`:'/clubs',data,c?'Club updated.':'Club created.'),{wide:true,submitLabel:c?'Save Changes':'Create Club'});
  }
  function reviewApp(aid){const a=staffApps().find(x=>id(x)===aid);if(!a)return;const allowed=isAdviser(a.clubId);const reviewable=['pending','waitlisted','under_review'].includes(a.status);const content=`<div class="detail-intro"><b>${escapeHtml(a.studentId?.fullName)}</b> (${escapeHtml(a.studentId?.studentId||'No student ID')})<br>${escapeHtml(a.clubId?.name)}<p style="margin:9px 0 0">${escapeHtml(a.motivation)}</p></div><p>Current status: ${status(a.status)}</p>${a.remarks?`<p class="helper">Remarks: ${escapeHtml(a.remarks)}</p>`:''}${allowed&&reviewable?choose('status','Decision',[{value:'approved',label:'Approve application'},{value:'rejected',label:'Reject application'},{value:'waitlisted',label:'Move to waitlist'},{value:'under_review',label:'Mark under review'}]):'<div class="banner">You may view this application, but only its assigned adviser or an administrator can make a decision.</div>'}${allowed&&reviewable?textarea('remarks','Remarks (optional)','','maxlength="500"'):''}`;
    showModal('Application Details',content,data=>allowed&&reviewable?mutation('PATCH',`/applications/${aid}/review`,data,'Application decision saved.'):(closeModal(),Promise.resolve()),{submitLabel:allowed&&reviewable?'Save Decision':'Close',wide:true});
  }
  function createAnnouncement(){if(!isAdmin())return;const clubs=state.clubs.filter(c=>isStaffClub(c._id));const clubOpts=[...(isAdmin()?[{value:'',label:'School-wide'}]:[]),...clubs.map(c=>({value:id(c),label:c.name}))];showModal('Create Announcement',choose('clubId','Post To',clubOpts)+field('title','Title','text','','required')+textarea('body','Announcement Message','','required minlength="8"'),data=>mutation('POST','/announcements',data,'Announcement posted.'),{submitLabel:'Publish Announcement'});}
  function assignStaff(){
    if(!isAdmin())return;
    const candidates=state.users.filter(u=>u.role==='student'&&u.status==='active');
    const clubs=state.clubs.filter(c=>c.status!=='archived');
    if(!candidates.length||!clubs.length){toast('Approve students and add a club first.',true);return;}
    showModal('Assign Officer / Adviser',
      choose('userId','Approved Member',candidates.map(u=>({value:id(u),label:u.fullName+' ('+u.email+')'})))+
      choose('clubId','Club',clubs.map(c=>({value:id(c),label:c.name})))+
      choose('role','Leadership Position',[{value:'officer',label:'Club Officer'},{value:'adviser',label:'Club Adviser'}]),
      data=>mutation('POST','/staff',data,'Leadership assignment saved.'),{submitLabel:'Assign Position'});
  }

  function reviewRegistration(userId,decision){
    if(!isAdmin())return;
    const u=state.users.find(row=>id(row)===userId);
    if(!u)return;
    const approving=decision==='approved';
    const content=`<div class="banner"><strong>${escapeHtml(u.fullName)}</strong><p>${escapeHtml(u.email)} · ${escapeHtml(u.studentId||'No Student ID')}</p></div><p class="helper">${approving?'Approve this user to allow dashboard access.':'Rejected accounts cannot enter the dashboard.'}</p>`+
      (approving?'':textarea('note','Reason (optional)','','maxlength="300"'));
    showModal(approving?'Approve User':'Reject User',content,data=>
      mutation('PATCH',`/users/${userId}/registration`,{decision,note:data.note||''},approving?'Account approved.':'Account rejected.'),
      {submitLabel:approving?'Approve Account':'Reject Account'});
  }
  function createAdmin(){
    if(!isAdmin())return;
    showModal('Add Administrator',
      field('fullName','Administrator Name','text','','required minlength="2" maxlength="100"')+
      field('email','Email Address','email','','required autocomplete="off"')+
      field('password','Temporary Password','password','','required minlength="12" maxlength="128" autocomplete="new-password"')+
      '<p class="helper">This account receives full administrator privileges. Share its password securely.</p>',
      data=>mutation('POST','/admin/accounts',data,'Administrator account created.'),
      {submitLabel:'Create Administrator'});
  }
  function editProfile(){
    if(!state.user||state.user.status!=='active')return;
    const u=state.user;
    showModal('Edit My Profile',
      field('fullName','Full Name','text',u.fullName,'required minlength="2" maxlength="100"')+
      field('department','Department / Program','text',u.department||'','maxlength="100"')+
      field('yearLevel','Year Level','text',u.yearLevel||'','maxlength="40"')+
      '<p class="helper">Your email, role and approval status cannot be changed here.</p>',
      data=>mutation('PUT','/me/profile',data,'Profile updated.'));
  }
  function changePassword(){
    if(!state.user||state.user.status!=='active')return;
    showModal('Change Password',
      field('currentPassword','Current Password','password','','required autocomplete="current-password"')+
      field('newPassword','New Password','password','','required minlength="8" maxlength="128" autocomplete="new-password"'),
      data=>mutation('PUT','/me/password',data,'Password changed.'));
  }
  function editBranding(){
    if(!isAdmin())return;
    const content=field('name','Website Name','text',brandName(),'required minlength="2" maxlength="100"')+
      `<div class="field"><label for="logo-upload">Replace Logo (PNG, JPEG, WebP, up to 350 KB)</label><input id="logo-upload" name="logoFile" class="input" type="file" accept="image/png,image/jpeg,image/webp"><span class="helper">Leave blank to keep the current image.</span></div>`+
      '<label class="brand-reset"><input type="checkbox" name="resetLogo" value="yes"> Restore original official logo</label>';
    showModal('Edit Website Branding',content,async data=>{
      const payload={name:data.name};
      const file=data.logoFile;
      if(data.resetLogo==='yes')payload.logoDataUrl=null;
      else if(file instanceof File && file.size){
        if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>350*1024){
          toast('Upload a PNG, JPEG or WebP image up to 350KB.',true);return;
        }
        try{
          payload.logoDataUrl=await new Promise((resolve,reject)=>{
            const reader=new FileReader();
            reader.onload=()=>resolve(String(reader.result));
            reader.onerror=()=>reject(new Error('Unable to read image file.'));
            reader.readAsDataURL(file);
          });
        }catch(e){toast(e.message,true);return;}
      }
      await mutation('PUT','/settings/branding',payload,'Website branding updated.');
    },{wide:true,submitLabel:'Save Branding'});
  }
  function editLanding(){
    if(!isAdmin())return;
    const section=landingContent();
    let form=field('eyebrow','Section Label','text',section.eyebrow,'required minlength="2" maxlength="70"')
      +field('heading','Section Heading','text',section.heading,'required minlength="2" maxlength="130"')
      +textarea('intro','Section Description',section.intro,'required minlength="5" maxlength="400"');
    section.cards.forEach((card,index)=>{
      const n=index+1;
      form+=`<div class="landing-editor-group"><h3>Card ${n}</h3>`
        +field(`card${n}Title`,'Card Title','text',card.title,'required minlength="2" maxlength="90"')
        +textarea(`card${n}Description`,'Card Description',card.description,'required minlength="5" maxlength="400"')+'</div>';
    });
    showModal('Edit Landing Page',form,data=>mutation('PUT','/settings/landing-page',{
      eyebrow:data.eyebrow,heading:data.heading,intro:data.intro,
      cards:[1,2,3].map(n=>({title:data[`card${n}Title`],description:data[`card${n}Description`]}))
    },'Landing page updated.'),{wide:true,submitLabel:'Save Landing Page'});
  }
  function editYear(){showModal('Update Academic Year',field('academicYear','Current Academic Year','text',state.settings.academicYear,'required pattern="[0-9]{4}[-–][0-9]{4}"')+'<p class="helper">Example: 2026–2027. Existing applications retain their original academic year.</p>',data=>mutation('PUT','/settings/academic-year',data,'Academic year updated.'));}
  function csvExport(){const rows=[['Student Name','Student ID','Email','Club','Academic Year','Application Status','Submitted Date','Remarks'],...staffApps().map(a=>[a.studentId?.fullName,a.studentId?.studentId,a.studentId?.email,a.clubId?.name,a.academicYear,a.status,date(a.createdAt),a.remarks||''])];const quote=v=>{const s=String(v??'');const safe=/^[=+\-@\t\r]/.test(s)?"'"+s:s;return '"'+safe.replaceAll('"','""')+'"'};const csv='\uFEFF'+rows.map(r=>r.map(quote).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));const link=document.createElement('a');link.href=url;link.download=`THE_HAVEN_Applications_${new Date().toISOString().slice(0,10)}.csv`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Application report exported.');}
  function closeModal(){
    if(!$('#modal-root').childElementCount)return;
    $('#modal-root').innerHTML='';
    document.body.classList.remove('modal-open');
    if(modalReturnFocus?.isConnected)modalReturnFocus.focus({preventScroll:true});
    modalReturnFocus=null;
  }
  async function action(event){const node=event.target.closest('[data-action]');if(!node)return;const type=node.dataset.action, itemId=node.dataset.id;
    if(type==='modal-backdrop'&&event.target!==node)return;
    if(type==='close-modal'||type==='modal-backdrop'){closeModal();return;}
    if(type==='skip-content'){const main=$('#main-content');if(main){main.setAttribute('tabindex','-1');main.focus({preventScroll:true});main.scrollIntoView({block:'start',behavior:'smooth'});}return;}
    if(type==='retry-loading'){await fetchAll();return;}
    if(type==='check-approval'){await fetchAll();nav(state.user?.status==='active'?'dashboard':'approval-status');return;}
    if(type==='toggle-password'){const input=node.closest('.field')?.querySelector('input');if(!input)return;const reveal=input.type==='password';input.type=reveal?'text':'password';node.textContent=reveal?'Hide':'Show';node.setAttribute('aria-label',reveal?'Hide password':'Show password');node.setAttribute('aria-pressed',String(reveal));return;}
    if(type==='navigate'){nav(node.dataset.route);return;}
    if(type.startsWith('go-')){nav(({ 'go-clubs':'clubs', 'go-dashboard':'dashboard', 'go-home':'home', 'go-review':'staff-applications' })[type]||'home');return;}
    if(type==='sidebar-toggle'){state.sidebar=!state.sidebar;render();return;}
    if(type==='category'){state.category=node.dataset.category;updateClubs();return;}
    if(type==='club'){openClub(itemId);return;}
    if(type==='login'||type==='register'){openAuth(type);return;}
    if(type==='demo-role') {if(!cfg.DEMO_MODE)return;demo.currentUser=itemId;saveDemo();await fetchAll();nav('dashboard');return;}
    if(type==='reset-demo'){if(confirm('Reset all browser demo data?')){demo=demoSeed();saveDemo();await fetchAll();nav('home');toast('Demo reset.');}return;}
    if(type==='logout'){await api('POST','/auth/logout');if(cfg.DEMO_MODE){demo.currentUser='';saveDemo();}await fetchAll();nav('home');return;}
    if(type==='application-info'){const a=state.applications.find(x=>id(x)===itemId);if(a)showModal('My Application',`<div class="detail-intro"><b>${escapeHtml(a.clubId?.name)}</b><p style="margin:8px 0">${escapeHtml(a.motivation)}</p></div><p>Decision: ${status(a.status)}</p><p class="small muted">Submitted ${date(a.createdAt)}</p>${a.remarks?`<p>Review remarks: ${escapeHtml(a.remarks)}</p>`:''}`,async()=>closeModal(),{submitLabel:'Close'});return;}
    if(type==='cancel-app'){if(confirm('Cancel this application? You will not be able to re-apply during the same academic year.'))await mutation('PATCH',`/applications/${itemId}/cancel`,{},'Application cancelled.');return;}
    if(type==='review'){reviewApp(itemId);return;}
    if(type==='create-club'||type==='edit-club'){editClub(type==='edit-club'?itemId:null);return;}
    if(type==='create-announcement'){createAnnouncement();return;}
    if(type==='assign-staff'){assignStaff();return;}
    if(type==='create-admin'){createAdmin();return;}
    if(type==='approve-user'||type==='reject-user'){reviewRegistration(itemId,type==='approve-user'?'approved':'rejected');return;}
    if(type==='remove-staff'){
      if(!isAdmin())return;
      const assignment=state.clubStaff.find(row=>id(row)===itemId);
      if(assignment&&confirm('Remove this leadership assignment?'))await mutation('DELETE','/staff/'+itemId,{},'Leadership assignment removed.');
      return;
    }
    if(type==='edit-profile'){editProfile();return;}
    if(type==='change-password'){changePassword();return;}
    if(type==='edit-branding'){editBranding();return;}
    if(type==='toggle-user'){const u=state.users.find(x=>id(x)===itemId);if(u&&confirm(`${u.status==='active'?'Disable':'Activate'} ${u.fullName}?`))await mutation('PATCH',`/users/${itemId}`,{status:u.status==='active'?'disabled':'active'},'Account status updated.');return;}
    if(type==='edit-year'){editYear();return;}
    if(type==='edit-landing'){editLanding();return;}
    if(type==='download-report'){csvExport();return;}
    if(type==='members-prev'||type==='members-next'){
      if(!isAdmin())return;
      const p=state.memberPagination;
      if(!p)return;
      const next=p.page+(type==='members-next'?1:-1);
      if(next<1||next>p.pages)return;
      try{await loadAllMemberships(next);render();}catch(e){toast(e.message,true);}
      return;
    }
    if(type==='mark-read'){await mutation('PATCH',`/notifications/${itemId}/read`,{},'Notification marked as read.');return;}
    if(type==='view-members'){const c=clubOf(itemId);try{const result=await get(`/memberships?clubId=${itemId}`);showModal(`${c.name} Members`,result.memberships.length?`<div class="table-wrap"><table><thead><tr><th>Member</th><th>Student ID</th><th>Joined</th></tr></thead><tbody>${result.memberships.map(m=>`<tr><td>${escapeHtml(m.studentId?.fullName)}</td><td>${escapeHtml(m.studentId?.studentId||'—')}</td><td>${date(m.joinedAt)}</td></tr>`).join('')}</tbody></table></div>`:empty('♧','No members in records','Approved members will appear here.'),async()=>closeModal(),{submitLabel:'Close',wide:true});}catch(e){toast(e.message,true);}return;}
  }
  function updateClubs(){const panel=$('#club-results');if(panel)panel.innerHTML=filterClubs().map(card).join('')||empty('⌕','No clubs found','Try another search or category.');const resultCount=$('#club-result-count');if(resultCount){const n=filterClubs().length;resultCount.textContent=`${n} ${n===1?'community':'communities'} found`;}document.querySelectorAll('.filter').forEach(el=>{const active=el.dataset.category===state.category;el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active));});}

  document.addEventListener('click',event=>{action(event).catch(e=>toast(e.message,true));});
  document.addEventListener('input',event=>{if(event.target.id==='club-search'){state.search=event.target.value;updateClubs();}});
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'){
      if($('#modal-root').childElementCount){closeModal();return;}
      if(state.sidebar){state.sidebar=false;render();}
      return;
    }
    if(event.key==='Tab'&&$('#modal-root').childElementCount){
      const dialog=$('#modal-root .modal');
      if(!dialog)return;
      const focusables=[...dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),a[href]')].filter(node=>node.getClientRects().length);
      if(!focusables.length)return;
      const first=focusables[0],last=focusables[focusables.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
  });
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

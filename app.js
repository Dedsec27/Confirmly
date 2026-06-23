const storageKey = 'confirmly_mvp_v2';
const onboardingKey = 'confirmly_onboarding_v2';
function localISODate(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function todayISO() { return localISODate(); }
function shiftDate(days) { const d = new Date(); d.setDate(d.getDate() + days); return localISODate(d); }
const demo = {
  settings:{businessName:'Atlas Studio',channel:'WhatsApp',availableChannels:['WhatsApp','SMS','Email'],defaultValue:60,message48:'Hi {first_name}, just a quick reminder about your {service} appointment on {date} at {time}. Tap below to confirm or reschedule.',message4:'Hi {first_name}, we’re looking forward to seeing you at {time} today. Please confirm your appointment.'},
  appointments:[
    {id:'a1',client:'Sofia Petrou',contact:'+30 694 111 2233',service:'Colour + cut',date:todayISO(),time:'10:30',value:85,status:'confirmed',notes:'Prefers subtle warm tones.',reminderSent:true},
    {id:'a2',client:'Nikos Vassiliou',contact:'+30 697 345 6655',service:'Beard trim',date:todayISO(),time:'12:15',value:30,status:'waiting',notes:'',reminderSent:false},
    {id:'a3',client:'Maria Georgiou',contact:'+30 699 877 2011',service:'Full styling',date:todayISO(),time:'15:00',value:70,status:'waiting',notes:'New client.',reminderSent:false},
    {id:'a4',client:'Eleni Markou',contact:'+30 693 221 8811',service:'Haircut',date:todayISO(),time:'17:30',value:45,status:'waiting',notes:'',reminderSent:false},
    {id:'a5',client:'Iris Kosta',contact:'iris@example.com',service:'Bridal trial',date:shiftDate(-1),time:'11:00',value:130,status:'rescheduled',notes:'Moved to Friday.',reminderSent:true},
    {id:'a6',client:'Dimitris Aris',contact:'+30 698 777 3333',service:'Haircut',date:shiftDate(-2),time:'14:00',value:40,status:'no-show',notes:'Follow-up recovery sent.',reminderSent:true},
    {id:'a7',client:'Anna Papas',contact:'+30 695 010 2323',service:'Colour refresh',date:shiftDate(-3),time:'16:30',value:75,status:'confirmed',notes:'',reminderSent:true}
  ]
};

let state = load();
let onboarding = loadOnboarding();
let currentQueue = 'due';
let activeAppointmentId = null;

function normaliseState(data){
  const next=data||structuredClone(demo);
  next.settings={...structuredClone(demo.settings),...(next.settings||{})};
  if(!Array.isArray(next.settings.availableChannels)||!next.settings.availableChannels.length) next.settings.availableChannels=['WhatsApp','SMS','Email'];
  next.appointments=(next.appointments||[]).map(a=>({preferredChannel:'auto', reminderChannel:null, reminderHistory:[], reminderSkipped:false, ...a}));
  return next;
}
function load(){
  try {
    const stored=localStorage.getItem(storageKey) || localStorage.getItem('confirmly_mvp_v1');
    return normaliseState(stored?JSON.parse(stored):structuredClone(demo));
  } catch { return normaliseState(structuredClone(demo)); }
}
function loadOnboarding(){ try { return {...{step:1,completed:false,detailsSet:false,bookingAdded:false,reminderSent:false}, ...(JSON.parse(localStorage.getItem(onboardingKey)) || {})}; } catch { return {step:1,completed:false,detailsSet:false,bookingAdded:false,reminderSent:false}; } }
function save(){ localStorage.setItem(storageKey,JSON.stringify(state)); }
function saveOnboarding(){ localStorage.setItem(onboardingKey,JSON.stringify(onboarding)); }
function money(n){ return new Intl.NumberFormat('en-IE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(n||0)); }
function prettyDate(date){ return new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'short'}).format(new Date(date+'T12:00:00')); }
function statusLabel(s){ return s==='no-show'?'No-show':s.charAt(0).toUpperCase()+s.slice(1); }
function dateTimeValue(a){ return new Date(`${a.date}T${a.time||'00:00'}`).getTime(); }
function sortedAppointments(){ return [...state.appointments].sort((a,b)=>dateTimeValue(a)-dateTimeValue(b)); }
function isToday(a){ return a.date===todayISO(); }
function escapeHtml(v){ return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function showToast(text){ const t=document.getElementById('toast'); t.textContent=text; t.classList.add('show'); clearTimeout(showToast.timer); showToast.timer=setTimeout(()=>t.classList.remove('show'),2800); }
function openModal(id){ document.getElementById(id).classList.remove('hidden'); document.body.classList.add('modal-open'); }
function closeModal(id){ document.getElementById(id).classList.add('hidden'); if(!document.querySelector('.modal-backdrop:not(.hidden)')) document.body.classList.remove('modal-open'); }

function updateDashboard(){
  const apps=state.appointments;
  const confirmed=apps.filter(a=>a.status==='confirmed').length;
  const waiting=apps.filter(a=>a.status==='waiting').length;
  const noShows=apps.filter(a=>a.status==='no-show').length;
  const rescheduled=apps.filter(a=>a.status==='rescheduled').length;
  const totalOutcome=apps.filter(a=>['confirmed','waiting','rescheduled','no-show'].includes(a.status)).length;
  const rate=totalOutcome?Math.round((confirmed / totalOutcome) * 100):0;
  const noRate=totalOutcome?Math.round(noShows/totalOutcome*100):0;
  const protectedRevenue=apps.filter(a=>['confirmed','rescheduled'].includes(a.status)).reduce((s,a)=>s+Number(a.value||0),0);
  document.getElementById('confirmationRate').textContent=`${rate}%`;
  document.getElementById('confirmationMeta').textContent=`${confirmed} confirmed · ${waiting} waiting`;
  document.getElementById('recoveredBookings').textContent=rescheduled;
  document.getElementById('protectedRevenue').textContent=money(protectedRevenue);
  document.getElementById('noShowRate').textContent=`${noRate}%`;
  document.getElementById('noShowMeta').textContent=noShows?`${noShows} marked as no-show`:'No missed bookings logged';
  document.getElementById('ringValue').textContent=`${rate}%`;
  document.getElementById('confirmedCount').textContent=confirmed;
  document.getElementById('waitingCount').textContent=waiting;
  document.getElementById('noShowCount').textContent=noShows;
  document.getElementById('progressRing').style.background=`conic-gradient(#258356 ${rate*3.6}deg,#edf1ed ${rate*3.6}deg)`;
  const health=document.getElementById('healthBadge');
  health.textContent=rate>=70?'Looking good':rate>=40?'Needs attention':'Send reminders';
  health.className=`badge ${rate>=70?'positive':'warning'}`;

  const due=apps.filter(a=>a.status==='waiting'&&!a.reminderSent&&!a.reminderSkipped);
  document.querySelector('.insight-banner strong').textContent=due.length?`${due.length} client${due.length===1?'':'s'} still need confirmation.`:'Your reminder queue is clear.';
  document.getElementById('bannerCopy').textContent=due.length?`Send ${due.length===1?'a reminder':'reminders'} now to protect an estimated ${money(due.reduce((s,a)=>s+Number(a.value||0),0))}.`:'Add a new booking whenever an appointment is made.';
  document.getElementById('bannerSendBtn').textContent=due.length?`Send via ${state.settings.channel}`:'Add booking';

  const today=sortedAppointments().filter(isToday);
  document.getElementById('todayAppointments').innerHTML=today.length?today.map(a=>`<div class="appointment-row"><div class="time-block"><strong>${a.time}</strong><span>${a.time<'12:00'?'AM':'PM'}</span></div><div><div class="client-name">${escapeHtml(a.client)}</div><div class="service-name">${escapeHtml(a.service)}</div></div><div class="row-value">${money(a.value)}</div><div><span class="status ${a.status}">${statusLabel(a.status)}</span><button class="row-menu" title="Update booking" data-actions="${a.id}">⋮</button></div></div>`).join(''):`<div class="empty-state"><strong>No bookings today</strong><span>Add your first booking, then Confirmly will queue the reminder.</span></div>`;
}

function updateQuickStart(){
  const holder=document.getElementById('quickStartChecklist');
  const items=[
    [onboarding.detailsSet,'Set business details'],
    [onboarding.bookingAdded,'Add a booking'],
    [onboarding.reminderSent,'Send a reminder']
  ];
  holder.innerHTML=items.map(([done,label])=>`<div class="check-item ${done?'done':''}"><span class="check">${done?'✓':'1'}</span>${label}</div>`).join('');
  document.getElementById('gettingStarted').classList.toggle('hidden-onboarding', onboarding.completed);
}

function updateAppointmentsTable(){
  const status=document.getElementById('statusFilter').value;
  const term=document.getElementById('searchInput').value.toLowerCase().trim();
  const rows=sortedAppointments().filter(a=>(status==='all'||a.status===status)&&(`${a.client} ${a.service} ${a.contact}`).toLowerCase().includes(term));
  document.getElementById('appointmentsTable').innerHTML=rows.length?rows.map(a=>`<tr><td class="client-cell"><strong>${escapeHtml(a.client)}</strong><span>${escapeHtml(a.contact)}</span></td><td data-label="Service">${escapeHtml(a.service)}</td><td data-label="When"><strong>${prettyDate(a.date)}</strong><span style="color:#7b8680;font-size:11px">${a.time}</span></td><td data-label="Value">${money(a.value)}</td><td data-label="Status"><span class="status ${a.status}">${statusLabel(a.status)}</span></td><td><button class="row-menu" aria-label="Update ${escapeHtml(a.client)}" data-actions="${a.id}">⋮</button></td></tr>`).join(''):`<tr><td colspan="6"><div class="empty-state"><strong>No bookings found</strong><span>Try a different filter or add a new booking.</span></div></td></tr>`;
}

function messageText(a){
  return state.settings.message48
    .replaceAll('{first_name}', a.client.split(' ')[0])
    .replaceAll('{service}', a.service)
    .replaceAll('{date}', prettyDate(a.date))
    .replaceAll('{time}', a.time);
}
function isEmailAddress(value){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value||'').trim()); }
async function deliverLiveEmail(a){
  const to=String(a.contact||'').trim();
  if(!isEmailAddress(to)) throw new Error('This booking needs a valid email address before you can send an email reminder.');
  const response=await fetch('/api/send-reminder',{
    method:'POST',
    headers:{'Content-Type':'application/json','X-Confirmly-Request':'reminder'},
    body:JSON.stringify({
      to,
      clientName:a.client,
      service:a.service,
      appointmentDate:prettyDate(a.date),
      appointmentTime:a.time,
      businessName:state.settings.businessName,
      message:messageText(a)
    })
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(result.error||'Email could not be sent. Check your live email setup in Vercel.');
  return result;
}
function resolvedChannel(a){
  const enabled = state.settings.availableChannels || ['WhatsApp','SMS','Email'];
  const requested = a.preferredChannel && a.preferredChannel !== 'auto' ? a.preferredChannel : state.settings.channel;
  return enabled.includes(requested) ? requested : enabled[0];
}
function channelsFor(a){
  const enabled = state.settings.availableChannels || ['WhatsApp','SMS','Email'];
  const preferred = resolvedChannel(a);
  return [preferred, ...enabled.filter(ch => ch !== preferred)];
}
function channelActionLabel(channel){ return channel==='WhatsApp'?'WhatsApp':channel==='SMS'?'SMS':'Email'; }
function updateMessages(){
  const due=sortedAppointments().filter(a=>a.status==='waiting'&&!a.reminderSent);
  const sent=sortedAppointments().filter(a=>a.reminderSent);
  document.getElementById('dueCount').textContent=due.length;
  document.getElementById('sentCount').textContent=sent.length;
  const source=currentQueue==='due'?due:sent;
  const holder=document.getElementById('messageQueue');
  holder.innerHTML=source.length?source.map(a=>{
    const channel=a.reminderChannel || resolvedChannel(a);
    const choices=channelsFor(a).map(ch=>`<button class="channel-send ${ch===channel?'primary-channel':''}" data-send-channel="${a.id}|${ch}">${channelActionLabel(ch)}</button>`).join('');
    return `<article class="message-card"><div class="message-card-top"><div><strong>${escapeHtml(a.client)}</strong><div class="message-meta">${escapeHtml(a.service)} · ${prettyDate(a.date)} at ${a.time} ${a.reminderSent?`<span class="channel-badge">Sent via ${escapeHtml(channel)}</span>`:''}</div></div><span class="status ${a.reminderSent?'confirmed':'waiting'}">${a.reminderSent?'Sent':'Ready'}</span></div><div class="message-copy">${escapeHtml(messageText(a))}</div>${!a.reminderSent?`<div class="channel-picker"><span>Send via</span>${choices}</div><div class="message-actions"><button class="small-btn skip-btn" data-skip="${a.id}">Skip for now</button></div>`:`<div class="message-actions"><button class="small-btn skip-btn" data-actions="${a.id}">View booking</button></div>`}</article>`;
  }).join(''):`<div class="empty-state"><strong>${currentQueue==='due'?'No reminders ready to send':'No sent reminders yet'}</strong><span>${currentQueue==='due'?'Nice — everyone has been contacted.':'Send a reminder to see it here.'}</span></div>`;
  document.querySelectorAll('.queue-tab').forEach(btn=>btn.classList.toggle('active',btn.dataset.queue===currentQueue));
}
function updateSettings(){
  document.getElementById('businessName').value=state.settings.businessName;
  document.getElementById('channel').value=state.settings.channel;
  document.getElementById('defaultValue').value=state.settings.defaultValue;
  document.getElementById('message48').value=state.settings.message48;
  document.getElementById('message4').value=state.settings.message4;
  document.querySelectorAll('#availableChannels input[type=checkbox]').forEach(input=>input.checked=(state.settings.availableChannels||[]).includes(input.value));
  document.querySelectorAll('#appointmentChannel option').forEach(option=>{ if(option.value!=='auto') option.disabled=!(state.settings.availableChannels||[]).includes(option.value); });
}
function render(){ updateDashboard(); updateQuickStart(); updateAppointmentsTable(); updateMessages(); updateSettings(); }

function renderOnboarding(){
  const dots=[1,2,3];
  dots.forEach(n=>document.querySelector(`[data-step-dot="${n}"]`).classList.toggle('active',n<=onboarding.step));
  const holder=document.getElementById('onboardingContent');
  if(onboarding.step===1){
    holder.innerHTML=`<span class="onboarding-kicker">WELCOME TO CONFIRMLY</span><h2>Stop chasing clients. Start confirming bookings.</h2><p>In less than two minutes, you’ll have the simple workflow that keeps clients from disappearing before their appointment.</p><div class="onboarding-step-list"><div><b>1.</b><span>Tell us how your business sends reminders.</span></div><div><b>2.</b><span>Add a booking when a client makes an appointment.</span></div><div><b>3.</b><span>Send a reminder and track the reply.</span></div></div><div class="onboarding-actions"><button class="outline-btn" data-onboarding="skip">Explore demo first</button><button class="primary-btn" data-onboarding="next">Set up Confirmly →</button></div>`;
  } else if(onboarding.step===2){
    holder.innerHTML=`<span class="onboarding-kicker">STEP 1 OF 3</span><h2>Make it feel like your business.</h2><p>These details appear in your reminder workflow. You can change them later in Settings.</p><div class="onboarding-business"><label>Business name<input id="onboardingBusinessName" value="${escapeHtml(state.settings.businessName)}" placeholder="e.g. Glow Studio"></label><label>Send reminders by<select id="onboardingChannel"><option ${state.settings.channel==='WhatsApp'?'selected':''}>WhatsApp</option><option ${state.settings.channel==='SMS'?'selected':''}>SMS</option><option ${state.settings.channel==='Email'?'selected':''}>Email</option></select></label></div><div class="onboarding-actions"><button class="outline-btn" data-onboarding="back">Back</button><button class="primary-btn" data-onboarding="save-details">Save and continue →</button></div>`;
  } else {
    holder.innerHTML=`<span class="onboarding-kicker">YOU'RE READY</span><h2>Your workflow is simple from here.</h2><p>Add a booking. Confirmly puts it in the reminder queue. Once the client replies, update their status from the booking menu.</p><div class="onboarding-highlight"><strong>Your daily routine:</strong><br>1. Add bookings → 2. Send reminders → 3. Mark confirmed, rescheduled, or no-show.</div><div class="onboarding-actions"><button class="outline-btn" data-onboarding="finish">I’ll use the demo first</button><button class="primary-btn" data-onboarding="add-booking">Add my first booking</button></div>`;
  }
}
function startGuide(){ onboarding.completed=false; onboarding.step=onboarding.detailsSet?3:1; saveOnboarding(); renderOnboarding(); openModal('onboardingModal'); }
function handleOnboarding(action){
  if(action==='skip' || action==='finish'){
    onboarding.completed=true; saveOnboarding(); closeModal('onboardingModal'); render(); showToast('You can reopen the guide any time from Home.'); return;
  }
  if(action==='next'){ onboarding.step=2; saveOnboarding(); renderOnboarding(); return; }
  if(action==='back'){ onboarding.step=1; saveOnboarding(); renderOnboarding(); return; }
  if(action==='save-details'){
    state.settings.businessName=document.getElementById('onboardingBusinessName').value.trim()||'Your business';
    state.settings.channel=document.getElementById('onboardingChannel').value;
    onboarding.detailsSet=true; onboarding.step=3; save(); saveOnboarding(); render(); renderOnboarding(); return;
  }
  if(action==='add-booking'){
    onboarding.bookingAdded=true; onboarding.completed=true; saveOnboarding(); closeModal('onboardingModal');
    document.querySelector('[name="date"]').value=todayISO(); document.querySelector('[name="value"]').value=state.settings.defaultValue; openModal('appointmentModal');
  }
}

function openActions(id){
  const a=state.appointments.find(x=>x.id===id); if(!a)return;
  activeAppointmentId=id;
  document.getElementById('actionTitle').textContent=a.client;
  document.getElementById('actionContent').innerHTML=`<div class="message-copy"><strong>${escapeHtml(a.service)}</strong><br>${prettyDate(a.date)} at ${a.time} · ${money(a.value)}</div><p style="font-size:12px;color:#6f7a74;margin:0 0 12px">Choose what happened with this booking.</p><div class="action-list">${a.status==='waiting'?'<button class="action-option" data-update="confirmed">✓ Client confirmed</button><button class="action-option" data-update="rescheduled">↗ Client rescheduled</button><button class="action-option danger" data-update="no-show">! Client did not show up</button><button class="action-option" data-requeue="${a.id}">↻ Re-queue reminder</button><button class="action-option" data-update="cancelled">× Cancel booking</button>':`<button class="action-option" data-update="waiting">↺ Move back to waiting</button><button class="action-option danger" data-delete="${a.id}">Delete booking</button>`}</div>`;
  openModal('actionModal');
}
function updateStatus(status){
  const a=state.appointments.find(x=>x.id===activeAppointmentId); if(!a)return;
  a.status=status; if(status==='waiting'){ a.reminderSent=false; a.reminderSkipped=false; }
  save(); closeModal('actionModal'); render(); showToast(`Booking marked ${statusLabel(status).toLowerCase()}.`); haptic('success');
}
let isSending = false;
async function sendReminder(id, channel=state.settings.channel){
  const a=state.appointments.find(x=>x.id===id); if(!a)return;
  if(!(state.settings.availableChannels||[]).includes(channel)){ showToast(`${channel} is disabled in Settings.`); return; }
  if(channel==='Email'){
    showToast(`Sending email to ${a.client}…`);
    try { await deliverLiveEmail(a); }
    catch(error){ showToast(error.message||'Email could not be sent.'); haptic(); return; }
  }
  a.reminderSent=true;
  a.reminderSkipped=false;
  a.reminderChannel=channel;
  a.reminderHistory=[...(a.reminderHistory||[]),{channel,at:new Date().toISOString(),delivery:channel==='Email'?'live':'demo'}];
  onboarding.reminderSent=true; save(); saveOnboarding(); render();
  showToast(channel==='Email' ? `Email reminder sent to ${a.client}.` : `${channel} is in demo mode — the reminder was recorded in Confirmly.`);
  haptic('success');
}
async function sendAll(){
  if (isSending) return;
  const due=state.appointments.filter(a=>a.status==='waiting'&&!a.reminderSent&&!a.reminderSkipped);
  if(!due.length){ document.getElementById('newAppointmentBtn').click(); return; }
  isSending=true;
  document.querySelectorAll('#sendAllBtn,#bannerSendBtn,#sendAllQueueBtn').forEach(btn=>btn.disabled=true);
  try {
    let liveEmails=0, demoChannels=0, failed=0;
    for(const a of due){
      const channel=resolvedChannel(a);
      if(channel==='Email'){
        try { await deliverLiveEmail(a); liveEmails++; }
        catch(error){ failed++; continue; }
      } else { demoChannels++; }
      a.reminderSent=true;
      a.reminderSkipped=false;
      a.reminderChannel=channel;
      a.reminderHistory=[...(a.reminderHistory||[]),{channel,at:new Date().toISOString(),delivery:channel==='Email'?'live':'demo'}];
    }
    if(liveEmails||demoChannels){ onboarding.reminderSent=true; save(); saveOnboarding(); render(); haptic('success'); }
    const parts=[];
    if(liveEmails) parts.push(`${liveEmails} email${liveEmails===1?'':'s'} sent`);
    if(demoChannels) parts.push(`${demoChannels} WhatsApp/SMS reminder${demoChannels===1?'':'s'} recorded in demo mode`);
    if(failed) parts.push(`${failed} email${failed===1?'':'s'} failed`);
    showToast(parts.join(' · ')||'No reminders could be sent.');
  } finally {
    isSending=false;
    document.querySelectorAll('#sendAllBtn,#bannerSendBtn,#sendAllQueueBtn').forEach(btn=>btn.disabled=false);
  }
}
function addAppointment(e){
  e.preventDefault(); const fd=new FormData(e.target);
  state.appointments.push({id:crypto.randomUUID(),client:fd.get('client').trim(),contact:fd.get('contact').trim(),service:fd.get('service').trim(),value:Number(fd.get('value')),date:fd.get('date'),time:fd.get('time'),notes:fd.get('notes').trim(),preferredChannel:fd.get('preferredChannel')||'auto',reminderChannel:null,reminderHistory:[],reminderSkipped:false,status:'waiting',reminderSent:false});
  onboarding.bookingAdded=true; save(); saveOnboarding(); e.target.reset(); closeModal('appointmentModal'); render(); showToast('Booking added. It is now ready for a reminder.');
}

function goToView(view){
  const nav=document.querySelector(`[data-view="${view}"]`); if(nav) nav.click();
}
async function refreshEmailStatus(){
  const title = document.getElementById('emailStatusTitle');
  const copy = document.getElementById('emailStatusCopy');
  if (!title || !copy) return;
  try {
    const response = await fetch('/api/send-reminder', { headers: { 'Accept': 'application/json' } });
    const result = await response.json().catch(() => ({}));
    if (response.ok && result.configured) {
      title.textContent = 'Live email is configured';
      copy.textContent = result.testMode ? 'Test mode is on: email can only be sent to your configured test address.' : 'Email reminders can now be sent from this project.';
    } else {
      title.textContent = 'Email needs setup';
      copy.textContent = result.error || 'Add RESEND_API_KEY and RESEND_FROM_EMAIL in Vercel, then redeploy.';
    }
  } catch {
    title.textContent = 'Email status unavailable';
    copy.textContent = 'Check that this app is deployed on Vercel, then refresh.';
  }
}

function bind(){
  document.querySelectorAll('.nav-item').forEach(btn=>btn.addEventListener('click',()=>{
    const view=btn.dataset.view;
    document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x===btn));
    document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===view));
    const titles={dashboard:'Your appointment control center',appointments:'Your bookings',messages:'Send reminders',settings:'Settings'};
    const eyebrows={dashboard:'YOUR DAILY WORKFLOW',appointments:'BOOKINGS',messages:'REMINDERS',settings:'CONFIRMLY WORKSPACE'};
    document.getElementById('pageTitle').textContent=titles[view]; document.getElementById('pageEyebrow').textContent=eyebrows[view]; document.getElementById('sidebar').classList.remove('open'); setMobileView(view); haptic();
  }));
  document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>goToView(b.dataset.go)));
  document.getElementById('newAppointmentBtn').addEventListener('click',()=>{document.querySelector('[name="date"]').value=todayISO();document.querySelector('[name="value"]').value=state.settings.defaultValue;document.querySelector('[name="preferredChannel"]').value='auto';openModal('appointmentModal')});
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>closeModal(b.dataset.close)));
  document.getElementById('appointmentForm').addEventListener('submit',addAppointment);
  document.getElementById('statusFilter').addEventListener('change',updateAppointmentsTable);
  document.getElementById('searchInput').addEventListener('input',updateAppointmentsTable);
  document.getElementById('sendAllBtn').addEventListener('click',()=>{void sendAll();});
  document.getElementById('bannerSendBtn').addEventListener('click',()=>{void sendAll();});
  document.getElementById('sendAllQueueBtn').addEventListener('click',()=>{void sendAll();});
  document.getElementById('seedBtn').addEventListener('click',()=>{state=structuredClone(demo);save();render();showToast('Demo bookings restored.');});
  document.getElementById('upgradeBtn').addEventListener('click',()=>showToast('Upgrade checkout would open here.'));
  document.getElementById('mobileMenu').addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('open'));
  document.querySelectorAll('.queue-tab').forEach(b=>b.addEventListener('click',()=>{currentQueue=b.dataset.queue;updateMessages()}));
  document.getElementById('saveSettingsBtn').addEventListener('click',()=>{
    const enabled=[...document.querySelectorAll('#availableChannels input:checked')].map(input=>input.value);
    if(!enabled.length){ showToast('Choose at least one reminder channel.'); return; }
    state.settings.businessName=document.getElementById('businessName').value.trim()||'Your business';
    state.settings.availableChannels=enabled;
    state.settings.channel=enabled.includes(document.getElementById('channel').value)?document.getElementById('channel').value:enabled[0];
    state.settings.defaultValue=Number(document.getElementById('defaultValue').value||0);state.settings.message48=document.getElementById('message48').value;state.settings.message4=document.getElementById('message4').value;onboarding.detailsSet=true;save();saveOnboarding();render();showToast('Channels and settings saved.');
  });
  document.getElementById('previewTemplateBtn').addEventListener('click',()=>{const sample={client:'Sofia Petrou',service:'Haircut',date:todayISO(),time:'15:00'};showToast(messageText(sample));});
  document.getElementById('openGuideBtn').addEventListener('click',startGuide);
  document.getElementById('skipOnboardingBtn').addEventListener('click',()=>handleOnboarding('skip'));
  document.addEventListener('click',e=>{
    const guide=e.target.closest('[data-onboarding]'); if(guide){handleOnboarding(guide.dataset.onboarding); return;}
    const actions=e.target.closest('[data-actions]'); if(actions){openActions(actions.dataset.actions); return;}
    const send=e.target.closest('[data-send]'); if(send){void sendReminder(send.dataset.send); return;}
    const sendChannel=e.target.closest('[data-send-channel]'); if(sendChannel){const [id,channel]=sendChannel.dataset.sendChannel.split('|');void sendReminder(id,channel); return;}
    const skip=e.target.closest('[data-skip]'); if(skip){const a=state.appointments.find(x=>x.id===skip.dataset.skip);if(a){a.reminderSkipped=true;save();render();showToast('Reminder skipped. You can re-queue it from the booking menu.');} return;}
    const requeue=e.target.closest('[data-requeue]'); if(requeue){const a=state.appointments.find(x=>x.id===requeue.dataset.requeue); if(a){a.reminderSent=false; a.reminderSkipped=false; save(); closeModal('actionModal'); render(); showToast('Reminder added back to the queue.');} return;}
    const update=e.target.closest('[data-update]'); if(update){updateStatus(update.dataset.update); return;}
    const del=e.target.closest('[data-delete]'); if(del){state.appointments=state.appointments.filter(x=>x.id!==del.dataset.delete);save();closeModal('actionModal');render();showToast('Booking deleted.');}
  });
  document.querySelectorAll('.modal-backdrop').forEach(m=>m.addEventListener('click',e=>{if(e.target===m && m.id!=='onboardingModal')closeModal(m.id)}));
}

function haptic(type='light'){
  if (!('vibrate' in navigator)) return;
  navigator.vibrate(type==='success' ? [10,35,16] : 8);
}

function setMobileView(view){
  document.querySelectorAll('.mobile-nav-item').forEach(item=>item.classList.toggle('active',item.dataset.mobileView===view));
}

let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  document.getElementById('installAppBtn')?.classList.remove('hidden');
});
window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  document.getElementById('installAppBtn')?.classList.add('hidden');
  showToast('Confirmly installed. It is now available from your home screen.');
});

document.getElementById('installAppBtn')?.addEventListener('click', async () => {
  if(!deferredInstallPrompt){ showToast('Use your browser menu and choose “Install app”.'); return; }
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  document.getElementById('installAppBtn')?.classList.add('hidden');
});

document.querySelectorAll('.mobile-nav-item').forEach(button=>button.addEventListener('click',()=>{
  const desktopNav=document.querySelector(`[data-view="${button.dataset.mobileView}"]`);
  desktopNav?.click();
  setMobileView(button.dataset.mobileView);
  window.scrollTo({top:0,behavior:'smooth'});
  haptic();
}));
document.getElementById('mobileAddBtn')?.addEventListener('click',()=>{
  document.getElementById('newAppointmentBtn').click();
  haptic();
});

bind();
render();
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // The app remains usable online if the browser blocks service workers.
    });
  });
}

void refreshEmailStatus();
if(!onboarding.completed){ renderOnboarding(); openModal('onboardingModal'); }

// iPhone / PWA install hint. Safari requires the user to use Share → Add to Home Screen.
(function setupIosInstallHint(){
  const banner = document.getElementById('iosInstallBanner');
  const close = document.getElementById('iosInstallClose');
  if(!banner || !close) return;
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const dismissed = localStorage.getItem('confirmly_ios_install_dismissed') === 'true';
  if(isIos && !isStandalone && !dismissed){ banner.classList.remove('hidden'); }
  close.addEventListener('click',()=>{
    banner.classList.add('hidden');
    localStorage.setItem('confirmly_ios_install_dismissed','true');
  });
})();

const storageKey = 'confirmly_mvp_v3';
// Kept separately so the user-selected default channel survives older state shapes, re-renders, and PWA upgrades.
const defaultChannelKey = 'confirmly_default_channel_v15';
const legacyStorageKeys = ['confirmly_mvp_v2', 'confirmly_mvp_v1'];
const onboardingKey = 'confirmly_onboarding_v2';
function localISODate(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function todayISO() { return localISODate(); }
function shiftDate(days) { const d = new Date(); d.setDate(d.getDate() + days); return localISODate(d); }
const demo = {
  settings:{businessName:'Atlas Studio',channel:'Email',availableChannels:['WhatsApp','SMS','Email'],defaultValue:60,message48:'Hi {first_name}, just a quick reminder about your {service} appointment on {date} at {time}. Tap below to confirm or reschedule.',message4:'Hi {first_name}, we’re looking forward to seeing you at {time} today. Please confirm your appointment.'},
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
let editingAppointmentId = null;
let pendingDeleteAppointmentId = null;

function readSavedDefaultChannel(){
  try {
    const value = localStorage.getItem(defaultChannelKey);
    return ['WhatsApp','SMS','Email'].includes(value) ? value : null;
  } catch { return null; }
}
function persistDefaultChannel(channel){
  try {
    localStorage.setItem(defaultChannelKey, channel);
    return localStorage.getItem(defaultChannelKey) === channel;
  } catch { return false; }
}

function normaliseState(data){
  const next=data||structuredClone(demo);
  next.settings={...structuredClone(demo.settings),...(next.settings||{})};
  next.settings.plan = ['Trial','Starter','Pro'].includes(next.settings.plan) ? next.settings.plan : 'Trial';
  if(!Array.isArray(next.settings.availableChannels)||!next.settings.availableChannels.length) next.settings.availableChannels=['WhatsApp','SMS','Email'];
  const storedDefault = readSavedDefaultChannel();
  // The standalone setting is authoritative after a user explicitly saves it.
  if(storedDefault && next.settings.availableChannels.includes(storedDefault)) {
    next.settings.channel = storedDefault;
  } else if(!next.settings.channel || !next.settings.availableChannels.includes(next.settings.channel)) {
    next.settings.channel = next.settings.availableChannels.includes('Email') ? 'Email' : next.settings.availableChannels[0];
  }
  // One-time migration only for untouched legacy data. Never overwrite a saved user preference.
  if(!storedDefault && next.settings.channel==='WhatsApp' && !next.settings.defaultChannelMigrationV15) {
    next.settings.channel = next.settings.availableChannels.includes('Email') ? 'Email' : next.settings.channel;
    next.settings.defaultChannelMigrationV15 = true;
  }
  next.appointments=(next.appointments||[]).map(a=>({preferredChannel:'auto', selectedReminderChannel:null, reminderChannel:null, reminderHistory:[], reminderSkipped:false, ...a}));
  return next;
}
function load(){
  try {
    // Preserve an intentionally empty booking list. Only seed demo data when no saved state exists at all.
    const ownState = localStorage.getItem(storageKey);
    const legacyState = ownState === null
      ? legacyStorageKeys.map(key => localStorage.getItem(key)).find(value => value !== null)
      : null;
    const raw = ownState !== null ? ownState : legacyState;
    const loaded = raw !== null ? normaliseState(JSON.parse(raw)) : normaliseState(structuredClone(demo));
    // One-time migration: keep data from prior builds, including an empty appointments array.
    if (ownState === null && raw !== null) localStorage.setItem(storageKey, JSON.stringify(loaded));
    return loaded;
  } catch {
    // Do not overwrite existing browser data if it cannot be read. Fall back only for this session.
    return normaliseState(structuredClone(demo));
  }
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
function openUpgradeModal(){
  document.querySelectorAll('[data-plan-card]').forEach(card=>card.classList.toggle('selected', card.dataset.planCard===state.settings.plan));
  openModal('upgradeModal');
}
function openAccountMenu(){
  const name=document.querySelector('.account strong')?.textContent || 'Your account';
  const business=state.settings.businessName || 'Your business';
  const title=document.getElementById('accountMenuTitle');
  const subtitle=document.querySelector('.account-menu-subtitle');
  if(title) title.textContent=name;
  if(subtitle) subtitle.textContent=`Owner · ${business}`;
  openModal('accountMenuModal');
}
function choosePlan(plan){
  state.settings.plan=plan;
  save();
  document.querySelectorAll('[data-plan-card]').forEach(card=>card.classList.toggle('selected', card.dataset.planCard===plan));
  document.querySelector('.trial-card .tiny-label').textContent=plan==='Trial'?'FREE TRIAL':`${plan.toUpperCase()} PLAN`;
  document.querySelector('.trial-card strong').textContent=plan==='Trial'?'11 days left':`${plan} selected`;
  document.querySelector('.trial-card p').textContent=plan==='Trial'?'Start preventing no-shows today.':'Your plan selection is saved locally.';
  document.getElementById('upgradeBtn').textContent=plan==='Trial'?'Upgrade plan':'Manage plan';
  showToast(`${plan} plan selected. Payment checkout is not connected yet.`);
}

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
  document.getElementById('bannerSendBtn').textContent=due.length ? 'View reminders' : 'View reminders';

  const today=sortedAppointments().filter(isToday);
  document.getElementById('todayAppointments').innerHTML=today.length?today.map(a=>`<div class="appointment-row"><div class="time-block"><strong>${a.time}</strong><span>${a.time<'12:00'?'AM':'PM'}</span></div><div><div class="client-name">${escapeHtml(a.client)}</div><div class="service-name">${escapeHtml(a.service)}</div></div><div class="row-value">${money(a.value)}</div><div><span class="status ${a.status}">${statusLabel(a.status)}</span><button type="button" class="row-menu" title="Manage booking" data-actions="${a.id}">Manage</button></div></div>`).join(''):`<div class="empty-state"><strong>No bookings today</strong><span>Add your first booking, then Confirmly will queue the reminder.</span></div>`;
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

function bindBookingRowActions(){
  // These buttons are rendered dynamically, so bind their actions immediately after each table render.
  // This avoids relying on event delegation through table / mobile layers and keeps edit/delete reliable on touch devices.
  document.querySelectorAll('#appointmentsTable [data-edit]').forEach(button=>{
    button.onclick=(event)=>{
      event.preventDefault();
      event.stopPropagation();
      const id=button.dataset.edit;
      if(!id){ showToast('This booking could not be opened.'); return; }
      openEditAppointment(id);
    };
  });
  document.querySelectorAll('#appointmentsTable [data-delete]').forEach(button=>{
    button.onclick=(event)=>{
      event.preventDefault();
      event.stopPropagation();
      const id=button.dataset.delete;
      if(!id){ showToast('This booking could not be deleted.'); return; }
      requestDeleteAppointment(id);
    };
  });
}

function updateAppointmentsTable(){
  const status=document.getElementById('statusFilter').value;
  const term=document.getElementById('searchInput').value.toLowerCase().trim();
  const rows=sortedAppointments().filter(a=>(status==='all'||a.status===status)&&(`${a.client} ${a.service} ${a.contact}`).toLowerCase().includes(term));
  document.getElementById('appointmentsTable').innerHTML=rows.length?rows.map(a=>`<tr><td class="client-cell"><strong>${escapeHtml(a.client)}</strong><span>${escapeHtml(a.contact)}</span></td><td data-label="Service">${escapeHtml(a.service)}</td><td data-label="When"><strong>${prettyDate(a.date)}</strong><span style="color:#7b8680;font-size:11px">${a.time}</span></td><td data-label="Value">${money(a.value)}</td><td data-label="Status"><span class="status ${a.status}">${statusLabel(a.status)}</span></td><td class="booking-row-actions"><button type="button" class="row-action-btn edit-row-btn" aria-label="Edit ${escapeHtml(a.client)}" data-edit="${a.id}">Edit</button><button type="button" class="row-action-btn delete-row-btn" aria-label="Delete ${escapeHtml(a.client)}" data-delete="${a.id}">Delete</button></td></tr>`).join(''):`<tr><td colspan="6"><div class="empty-state"><strong>No bookings found</strong><span>Try a different filter or add a new booking.</span></div></td></tr>`;
  bindBookingRowActions();
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
  if(!isEmailAddress(to)) throw new Error(`${a.client} needs a valid email address. Edit this booking and enter an email, or choose WhatsApp/SMS.`);
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),15000);
  try {
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
      }),
      signal:controller.signal
    });
    const raw=await response.text();
    let result={}; try { result=raw?JSON.parse(raw):{}; } catch { result={}; }
    if(!response.ok) {
      const detail=result.error||`Email service returned ${response.status}.`;
      throw new Error(`${a.client}: ${detail}`);
    }
    return result;
  } catch(error) {
    if(error?.name==='AbortError') throw new Error(`${a.client}: email delivery timed out. Try again.`);
    throw error;
  } finally { clearTimeout(timeout); }
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
function selectedQueueChannel(a){
  const enabled = state.settings.availableChannels || ['WhatsApp','SMS','Email'];
  const remembered = a.selectedReminderChannel;
  if(remembered && enabled.includes(remembered)) return remembered;
  return a.reminderChannel || resolvedChannel(a);
}
function updateMessages(){
  const due=sortedAppointments().filter(a=>a.status==='waiting'&&!a.reminderSent&&!a.reminderSkipped);
  const sent=sortedAppointments().filter(a=>a.reminderSent);
  document.getElementById('dueCount').textContent=due.length;
  document.getElementById('sentCount').textContent=sent.length;
  const source=currentQueue==='due'?due:sent;
  const holder=document.getElementById('messageQueue');
  holder.innerHTML=source.length?source.map(a=>{
    const channel=selectedQueueChannel(a);
    const choices=channelsFor(a).map(ch=>`<button type="button" class="channel-send ${ch===channel?'primary-channel':''}" aria-pressed="${ch===channel?'true':'false'}" data-select-channel="${a.id}|${ch}">${channelActionLabel(ch)}</button>`).join('');
    const emailWarning=!a.reminderSent && channel==='Email' && !isEmailAddress(a.contact)
      ? `<div class="email-warning">Email is selected, but this booking has no valid email address. <button type="button" data-edit="${a.id}">Edit booking</button></div>` : '';
    const failure=a.lastDeliveryError ? `<div class="email-warning error">Last delivery failed: ${escapeHtml(a.lastDeliveryError)} <button type="button" data-edit="${a.id}">Edit booking</button></div>` : '';
    const deliveryNote=!a.reminderSent && channel!=='Email' ? `<span class="delivery-note">${channel} is currently demo-only. Confirmly will record the reminder, but no real ${channel} message is sent yet.</span>` : '';
    return `<article class="message-card"><div class="message-card-top"><div><strong>${escapeHtml(a.client)}</strong><div class="message-meta">${escapeHtml(a.service)} · ${prettyDate(a.date)} at ${a.time} ${a.reminderSent?`<span class="channel-badge">Sent via ${escapeHtml(a.reminderChannel || channel)}</span>`:''}</div></div><span class="status ${a.reminderSent?'confirmed':'waiting'}">${a.reminderSent?'Sent':'Ready'}</span></div><div class="message-copy">${escapeHtml(messageText(a))}</div>${emailWarning}${failure}${!a.reminderSent?`<div class="channel-picker"><span>Choose channel</span>${choices}</div>${deliveryNote}<div class="message-actions"><button type="button" class="small-btn send-btn" data-send-single="${a.id}">Send this reminder</button><button type="button" class="small-btn skip-btn" data-skip="${a.id}">Skip for now</button></div>`:`<div class="message-actions"><button type="button" class="small-btn skip-btn" data-view-booking="${a.id}">View booking</button></div>`}</article>`;
  }).join(''):`<div class="empty-state"><strong>${currentQueue==='due'?'No reminders ready to send':'No sent reminders yet'}</strong><span>${currentQueue==='due'?'Nice — everyone has been contacted.':'Send a reminder to see it here.'}</span></div>`;
  document.querySelectorAll('.queue-tab').forEach(btn=>btn.classList.toggle('active',btn.dataset.queue===currentQueue));
  // Bind sent-reminder booking actions after every queue re-render. This avoids relying
  // on stale listeners or event delegation when cards are replaced dynamically.
  holder.querySelectorAll('[data-view-booking]').forEach(button=>{
    button.addEventListener('click', event=>{
      event.preventDefault();
      event.stopPropagation();
      openActions(button.dataset.viewBooking);
    });
  });
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
function updatePlanUi(){
  const plan=state.settings.plan || 'Trial';
  const label=document.querySelector('.trial-card .tiny-label');
  const title=document.querySelector('.trial-card strong');
  const copy=document.querySelector('.trial-card p');
  const button=document.getElementById('upgradeBtn');
  if(label) label.textContent=plan==='Trial'?'FREE TRIAL':`${plan.toUpperCase()} PLAN`;
  if(title) title.textContent=plan==='Trial'?'11 days left':`${plan} selected`;
  if(copy) copy.textContent=plan==='Trial'?'Start preventing no-shows today.':'Your plan selection is saved locally.';
  if(button) button.textContent=plan==='Trial'?'Upgrade plan':'Manage plan';
}
function render(){ updateDashboard(); updateQuickStart(); updateAppointmentsTable(); updateMessages(); updateSettings(); updatePlanUi(); }

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
    prepareAppointmentForm(); openModal('appointmentModal');
  }
}

function openActions(id){
  const a=state.appointments.find(x=>x.id===id); if(!a)return;
  activeAppointmentId=id;
  document.getElementById('actionTitle').textContent=a.client;
  const statusActions = a.status==='waiting'
    ? `<button type="button" class="action-option" data-update="confirmed">✓ Client confirmed</button><button type="button" class="action-option" data-update="rescheduled">↗ Client rescheduled</button><button type="button" class="action-option danger" data-update="no-show">! Client did not show up</button><button type="button" class="action-option" data-requeue="${a.id}">↻ Re-queue reminder</button><button type="button" class="action-option" data-update="cancelled">× Cancel booking</button>`
    : `<button type="button" class="action-option" data-update="waiting">↺ Move back to waiting</button>`;
  document.getElementById('actionContent').innerHTML=`<div class="message-copy"><strong>${escapeHtml(a.service)}</strong><br>${prettyDate(a.date)} at ${a.time} · ${money(a.value)}</div><p style="font-size:12px;color:#6f7a74;margin:0 0 12px">Update this booking, its status, or remove it.</p><div class="action-list"><button type="button" class="action-option" data-edit="${a.id}">✎ Edit booking</button>${statusActions}<button type="button" class="action-option danger" data-delete="${a.id}">Delete booking</button></div>`;
  openModal('actionModal');
}
function updateStatus(status){
  const a=state.appointments.find(x=>x.id===activeAppointmentId); if(!a)return;
  a.status=status; if(status==='waiting'){ a.reminderSent=false; a.reminderSkipped=false; }
  save(); closeModal('actionModal'); render(); showToast(`Booking marked ${statusLabel(status).toLowerCase()}.`); haptic('success');
}
let isSending = false;
async function sendReminder(id, channel){
  const a=state.appointments.find(x=>x.id===id); if(!a)return;
  const chosenChannel=channel || selectedQueueChannel(a) || state.settings.channel;
  if(!(state.settings.availableChannels||[]).includes(chosenChannel)){ showToast(`${chosenChannel} is disabled in Settings.`); return; }
  if(chosenChannel==='Email'){
    showToast(`Sending email to ${a.client}…`);
    try {
      const result=await deliverLiveEmail(a);
      a.lastDeliveryError='';
      a.lastDeliveryTestMode=Boolean(result?.testMode);
    }
    catch(error){ a.lastDeliveryError=error.message||'Email could not be sent.'; save(); updateMessages(); showToast(a.lastDeliveryError); haptic(); return; }
  }
  a.reminderSent=true;
  a.reminderSkipped=false;
  a.reminderChannel=chosenChannel;
  a.selectedReminderChannel=chosenChannel;
  a.reminderHistory=[...(a.reminderHistory||[]),{channel:chosenChannel,at:new Date().toISOString(),delivery:chosenChannel==='Email'?'live':'demo'}];
  onboarding.reminderSent=true; save(); saveOnboarding(); render();
  showToast(chosenChannel==='Email' ? (a.lastDeliveryTestMode ? `Test email sent to your configured test inbox.` : `Email reminder sent to ${a.client}.`) : `${chosenChannel} is in demo mode — the reminder was recorded in Confirmly.`);
  haptic('success');
}
async function sendAll(){
  if (isSending) return;
  const due=state.appointments.filter(a=>a.status==='waiting'&&!a.reminderSent&&!a.reminderSkipped);
  if(!due.length){ showToast('No reminders are ready to send.'); return; }
  isSending=true;
  document.querySelectorAll('#sendAllBtn,#bannerSendBtn,#sendAllQueueBtn').forEach(btn=>btn.disabled=true);
  try {
    let liveEmails=0, demoChannels=0, failed=0;
    const failures=[];
    for(const a of due){
      const channel=resolvedChannel(a);
      if(channel==='Email'){
        try { const result=await deliverLiveEmail(a); liveEmails++; a.lastDeliveryError=''; a.lastDeliveryTestMode=Boolean(result?.testMode); }
        catch(error){ failed++; a.lastDeliveryError=error.message||'Email could not be sent.'; failures.push(a.lastDeliveryError); continue; }
      } else { demoChannels++; a.lastDeliveryError=''; }
      a.reminderSent=true;
      a.reminderSkipped=false;
      a.reminderChannel=channel;
      a.selectedReminderChannel=channel;
      a.reminderHistory=[...(a.reminderHistory||[]),{channel,at:new Date().toISOString(),delivery:channel==='Email'?'live':'demo'}];
    }
    if(liveEmails||demoChannels||failed){ save(); render(); }
    if(liveEmails||demoChannels){ onboarding.reminderSent=true; saveOnboarding(); haptic('success'); }
    const parts=[];
    if(liveEmails) parts.push(`${liveEmails} email${liveEmails===1?'':'s'} sent${due.some(a=>a.lastDeliveryTestMode)?' to your test inbox':''}`);
    if(demoChannels) parts.push(`${demoChannels} WhatsApp/SMS reminder${demoChannels===1?'':'s'} recorded in demo mode`);
    if(failed) parts.push(`${failed} email${failed===1?'':'s'} failed: ${failures[0]}`);
    showToast(parts.join(' · ')||'No reminders could be sent.');
  } finally {
    isSending=false;
    document.querySelectorAll('#sendAllBtn,#bannerSendBtn,#sendAllQueueBtn').forEach(btn=>btn.disabled=false);
  }
}
function prepareAppointmentForm(a=null){
  const form=document.getElementById('appointmentForm');
  const title=document.getElementById('modalTitle');
  const eyebrow=document.getElementById('modalEyebrow');
  const submit=document.getElementById('appointmentSubmitBtn');
  editingAppointmentId=a?.id || null;
  if(a){
    title.textContent='Edit appointment';
    eyebrow.textContent='BOOKING DETAILS';
    submit.textContent='Save changes';
    form.elements.client.value=a.client || '';
    form.elements.contact.value=a.contact || '';
    form.elements.service.value=a.service || '';
    form.elements.value.value=Number(a.value || 0);
    form.elements.date.value=a.date || todayISO();
    form.elements.time.value=a.time || '';
    form.elements.preferredChannel.value=a.preferredChannel || 'auto';
    form.elements.notes.value=a.notes || '';
  } else {
    title.textContent='Add appointment';
    eyebrow.textContent='NEW BOOKING';
    submit.textContent='Create booking';
    form.reset();
    form.elements.date.value=todayISO();
    form.elements.value.value=state.settings.defaultValue;
    form.elements.preferredChannel.value='auto';
  }
}
function openEditAppointment(id){
  const appointment=state.appointments.find(x=>x.id===id);
  if(!appointment) return;
  closeModal('actionModal');
  prepareAppointmentForm(appointment);
  openModal('appointmentModal');
}
function refreshBookingSurfaces(){
  // Keep the active filters/search exactly as they are while immediately syncing every UI area.
  updateAppointmentsTable();
  updateDashboard();
  updateMessages();
  updateQuickStart();
}

function requestDeleteAppointment(id){
  const appointment=state.appointments.find(x=>String(x.id)===String(id));
  if(!appointment) { showToast('This booking could not be found.'); return; }

  pendingDeleteAppointmentId=appointment.id;
  document.getElementById('deleteBookingName').textContent=appointment.client;
  document.getElementById('deleteBookingDetails').textContent=`${statusLabel(appointment.status)} · ${appointment.service} · ${prettyDate(appointment.date)} at ${appointment.time}`;
  openModal('deleteModal');
  requestAnimationFrame(()=>document.getElementById('confirmDeleteBtn')?.focus());
}

function confirmDeleteAppointment(){
  const id=pendingDeleteAppointmentId;
  const appointment=state.appointments.find(x=>String(x.id)===String(id));
  if(!appointment) { closeModal('deleteModal'); pendingDeleteAppointmentId=null; showToast('This booking could not be found.'); return; }

  const before=state.appointments.length;
  state.appointments=state.appointments.filter(x=>String(x.id)!==String(id));
  if(state.appointments.length===before){ showToast('This booking could not be deleted.'); return; }

  save();
  pendingDeleteAppointmentId=null;
  closeModal('deleteModal');
  closeModal('actionModal');
  refreshBookingSurfaces();
  showToast(`${appointment.client}'s booking deleted.`);
  haptic('success');
}
function addAppointment(e){
  e.preventDefault(); const fd=new FormData(e.target);
  const changes={client:fd.get('client').trim(),contact:fd.get('contact').trim(),service:fd.get('service').trim(),value:Number(fd.get('value')),date:fd.get('date'),time:fd.get('time'),notes:fd.get('notes').trim(),preferredChannel:fd.get('preferredChannel')||'auto'};
  const effectiveChannel=changes.preferredChannel==='auto' ? state.settings.channel : changes.preferredChannel;
  if(effectiveChannel==='Email' && !isEmailAddress(changes.contact)){
    showToast('Email is selected. Enter a valid client email address, or choose WhatsApp/SMS.');
    e.target.elements.contact.focus();
    return;
  }
  if(editingAppointmentId){
    const appointment=state.appointments.find(x=>x.id===editingAppointmentId);
    if(!appointment) { showToast('This booking could not be found.'); return; }
    Object.assign(appointment,changes);
    save();
    editingAppointmentId=null;
    closeModal('appointmentModal');
    refreshBookingSurfaces();
    showToast('Booking changes saved.');
    haptic('success');
    return;
  }
  state.appointments.push({id:crypto.randomUUID(),...changes,selectedReminderChannel:null,reminderChannel:null,reminderHistory:[],reminderSkipped:false,status:'waiting',reminderSent:false});
  onboarding.bookingAdded=true; save(); saveOnboarding(); editingAppointmentId=null; closeModal('appointmentModal'); refreshBookingSurfaces(); showToast('Booking added. It is now ready for a reminder.');
}

function goToView(view){
  const nav=document.querySelector(`[data-view="${view}"]`); if(nav) nav.click();
}
async function refreshEmailStatus(){
  const title = document.getElementById('emailStatusTitle');
  const copy = document.getElementById('emailStatusCopy');
  const button = document.getElementById('checkEmailStatusBtn');
  if (!title || !copy) return;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  title.textContent = 'Checking live email setup…';
  copy.textContent = 'Confirmly is checking your Vercel email configuration.';
  if (button) button.disabled = true;
  try {
    const response = await fetch('/api/send-reminder', {
      headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache' },
      cache: 'no-store',
      signal: controller.signal
    });
    const raw = await response.text();
    let result = {};
    try { result = raw ? JSON.parse(raw) : {}; } catch { result = {}; }
    if (response.ok && result.configured === true) {
      title.textContent = 'Live email is configured';
      copy.textContent = result.senderUsesResendDev
        ? 'Testing sender detected: use the email on your Resend account, or verify your own domain in Resend before sending to clients.'
        : (result.testMode ? 'Test mode is on: email can only be sent to your configured test address.' : 'Email reminders can now be sent from this project.');
    } else if (response.status === 404) {
      title.textContent = 'Email status unavailable';
      copy.textContent = 'The email API route was not found. Upload the api folder, then redeploy on Vercel.';
    } else {
      title.textContent = 'Email needs setup';
      copy.textContent = result.error || 'Add RESEND_API_KEY and RESEND_FROM_EMAIL in Vercel, then redeploy.';
    }
  } catch (error) {
    title.textContent = error?.name === 'AbortError' ? 'Email status timed out' : 'Email status unavailable';
    copy.textContent = error?.name === 'AbortError'
      ? 'The check took too long. Confirm the Vercel deployment is live, then try again.'
      : 'Confirmly could not reach the email status endpoint. Check your connection and deployment, then try again.';
  } finally {
    clearTimeout(timeout);
    if (button) button.disabled = false;
  }
}

function bind(){
  document.querySelectorAll('.nav-item').forEach(btn=>btn.addEventListener('click',()=>{
    const view=btn.dataset.view;
    document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x===btn));
    document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===view));
    const titles={dashboard:'Your appointment control center',appointments:'Your bookings',messages:'Send reminders',settings:'Settings'};
    const eyebrows={dashboard:'YOUR DAILY WORKFLOW',appointments:'BOOKINGS',messages:'REMINDERS',settings:'CONFIRMLY WORKSPACE'};
    document.getElementById('pageTitle').textContent=titles[view];
    document.getElementById('pageEyebrow').textContent=eyebrows[view];
    document.getElementById('sidebar').classList.remove('open');
    setMobileView(view);
    // Re-render the destination immediately so Appointments never opens as an empty screen.
    if(view==='appointments') updateAppointmentsTable();
    if(view==='messages') updateMessages();
    if(view==='dashboard') updateDashboard();
    if(view==='settings') void refreshEmailStatus();
    haptic();
  }));
  document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>goToView(b.dataset.go)));
  document.getElementById('newAppointmentBtn').addEventListener('click',()=>{prepareAppointmentForm();openModal('appointmentModal')});
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>closeModal(b.dataset.close)));
  document.getElementById('appointmentForm').addEventListener('submit',addAppointment);
  document.getElementById('statusFilter').addEventListener('change',updateAppointmentsTable);
  document.getElementById('searchInput').addEventListener('input',updateAppointmentsTable);
  document.getElementById('sendAllBtn').addEventListener('click',(event)=>{ event.preventDefault(); void sendAll(); });
  document.getElementById('bannerSendBtn').addEventListener('click',(event)=>{ event.preventDefault(); goToView('messages'); });
  document.getElementById('sendAllQueueBtn').addEventListener('click',(event)=>{ event.preventDefault(); void sendAll(); });
  document.getElementById('refreshAppointmentsBtn')?.addEventListener('click',(event)=>{
    event.preventDefault();
    // Reload the persisted state; an empty array remains empty and is never reseeded with demo data.
    state = load();
    refreshBookingSurfaces();
    showToast('Appointments refreshed.');
  });
  document.getElementById('checkEmailStatusBtn')?.addEventListener('click',(event)=>{ event.preventDefault(); void refreshEmailStatus(); });
  document.getElementById('refreshAppBtn')?.addEventListener('click',(event)=>{
    event.preventDefault();
    // This refreshes from saved browser data only. It never restores demo bookings.
    state = load();
    render();
    showToast('App data refreshed.');
  });
  document.getElementById('confirmDeleteBtn')?.addEventListener('click', confirmDeleteAppointment);
  document.getElementById('cancelDeleteBtn')?.addEventListener('click',()=>{pendingDeleteAppointmentId=null; closeModal('deleteModal');});
  document.getElementById('deleteModal')?.addEventListener('click',event=>{if(event.target===event.currentTarget){pendingDeleteAppointmentId=null; closeModal('deleteModal');}});
  document.getElementById('upgradeBtn').addEventListener('click',openUpgradeModal);
  document.getElementById('accountMenuBtn')?.addEventListener('click',openAccountMenu);
  document.getElementById('accountWorkspaceBtn')?.addEventListener('click',()=>{ closeModal('accountMenuModal'); goToView('settings'); setTimeout(()=>document.getElementById('businessName')?.focus(), 0); });
  document.getElementById('accountPlanBtn')?.addEventListener('click',()=>{ closeModal('accountMenuModal'); openUpgradeModal(); });
  document.getElementById('accountInstallBtn')?.addEventListener('click',()=>{ closeModal('accountMenuModal'); document.getElementById('installAppBtn')?.click(); });
  document.querySelectorAll('[data-plan-select]').forEach(button=>button.addEventListener('click',()=>choosePlan(button.dataset.planSelect)));
  document.getElementById('mobileMenu').addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('open'));
  document.querySelectorAll('.queue-tab').forEach(b=>b.addEventListener('click',()=>{currentQueue=b.dataset.queue;updateMessages()}));
  document.getElementById('saveSettingsBtn').addEventListener('click',()=>{
    const enabled=[...document.querySelectorAll('#availableChannels input:checked')].map(input=>input.value);
    if(!enabled.length){ showToast('Choose at least one reminder channel.'); return; }
    state.settings.businessName=document.getElementById('businessName').value.trim()||'Your business';
    state.settings.availableChannels=enabled;
    const chosenChannel=document.getElementById('channel').value;
    state.settings.channel=enabled.includes(chosenChannel) ? chosenChannel : (enabled.includes('Email') ? 'Email' : enabled[0]);
    state.settings.defaultChannelMigrationV15=true;
    if(!persistDefaultChannel(state.settings.channel)) {
      showToast('Could not save the default channel. Browser storage is unavailable.');
      return;
    }
    state.settings.defaultValue=Number(document.getElementById('defaultValue').value||0);
    state.settings.message48=document.getElementById('message48').value;
    state.settings.message4=document.getElementById('message4').value;
    onboarding.detailsSet=true;
    save();
    // Re-read the saved value immediately to catch browser storage failures rather than silently reverting later.
    const savedSettings=JSON.parse(localStorage.getItem(storageKey)||'{}').settings||{};
    const savedDefault=readSavedDefaultChannel();
    if(savedSettings.channel!==state.settings.channel || savedDefault!==state.settings.channel){ showToast('Could not save the default channel. Check browser storage and try again.'); return; }
    saveOnboarding();
    render();
    showToast(`${state.settings.channel} is now the default for Send all.`);
  });
  document.getElementById('previewTemplateBtn').addEventListener('click',()=>{const sample={client:'Sofia Petrou',service:'Haircut',date:todayISO(),time:'15:00'};showToast(messageText(sample));});
  document.getElementById('openGuideBtn').addEventListener('click',startGuide);
  document.getElementById('skipOnboardingBtn').addEventListener('click',()=>handleOnboarding('skip'));
  document.addEventListener('click',e=>{
    const guide=e.target.closest('[data-onboarding]'); if(guide){handleOnboarding(guide.dataset.onboarding); return;}
    const viewBooking=e.target.closest('[data-view-booking]'); if(viewBooking){e.preventDefault(); openActions(viewBooking.dataset.viewBooking); return;}
    const actions=e.target.closest('[data-actions]'); if(actions){openActions(actions.dataset.actions); return;}
    const send=e.target.closest('[data-send]'); if(send){void sendReminder(send.dataset.send); return;}
    const selectChannel=e.target.closest('[data-select-channel]'); if(selectChannel){
      const [id,channel]=selectChannel.dataset.selectChannel.split('|');
      const appointment=state.appointments.find(x=>x.id===id);
      if(appointment){ appointment.selectedReminderChannel=channel; appointment.lastDeliveryError=''; save(); updateMessages(); showToast(`${channel} selected for ${appointment.client}.`); }
      return;
    }
    const sendSingle=e.target.closest('[data-send-single]'); if(sendSingle){
      const appointment=state.appointments.find(x=>x.id===sendSingle.dataset.sendSingle);
      if(appointment) void sendReminder(appointment.id, selectedQueueChannel(appointment));
      return;
    }
    const skip=e.target.closest('[data-skip]'); if(skip){const a=state.appointments.find(x=>x.id===skip.dataset.skip);if(a){a.reminderSkipped=true;save();render();showToast('Reminder skipped. You can re-queue it from the booking menu.');} return;}
    const requeue=e.target.closest('[data-requeue]'); if(requeue){const a=state.appointments.find(x=>x.id===requeue.dataset.requeue); if(a){a.reminderSent=false; a.reminderSkipped=false; save(); closeModal('actionModal'); render(); showToast('Reminder added back to the queue.');} return;}
    const update=e.target.closest('[data-update]'); if(update){updateStatus(update.dataset.update); return;}
    // Row-level Edit/Delete buttons have explicit listeners bound after rendering.
    // Keep this delegation only for action-modal controls outside the table.
    const edit=e.target.closest('#actionModal [data-edit]'); if(edit){openEditAppointment(edit.dataset.edit); return;}
    const del=e.target.closest('#actionModal [data-delete]'); if(del){requestDeleteAppointment(del.dataset.delete); return;}
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

const SUPABASE_URL=process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY;
const headers={'Content-Type':'application/json'};
function validEmail(value){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value||'').trim())}
module.exports=async(req,res)=>{
  if(req.method!=='POST') return res.status(405).setHeader('Allow','POST').json({error:'Method not allowed'});
  const body=req.body||{};
  const name=String(body.name||'').trim(), phone=String(body.phone||'').trim(), email=String(body.email||'').trim().toLowerCase(), workspaceKey=String(body.workspaceKey||'').trim();
  if(!workspaceKey||!name||(!phone&&!email)) return res.status(400).json({error:'Name, workspace and phone or email are required.'});
  if(email&&!validEmail(email)) return res.status(400).json({error:'Enter a valid email address.'});
  if(!SUPABASE_URL||!SUPABASE_SERVICE_ROLE_KEY) return res.status(503).json({error:'Customer intake backend is not configured.'});
  const payload={workspace_key:workspaceKey,name,phone:phone||null,email:email||null,preferred_channel:body.preferredChannel||'Email',reminder_consent:body.reminderConsent===true,marketing_consent:body.marketingConsent===true,whatsapp_opt_in:body.whatsappOptIn===true,source:'qr_form'};
  const response=await fetch(`${SUPABASE_URL.replace(/\/$/,'')}/rest/v1/customers`,{method:'POST',headers:{apikey:SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify(payload)});
  const text=await response.text();
  if(!response.ok) return res.status(response.status).json({error:'Could not create customer profile.',details:text.slice(0,500)});
  return res.status(201).json({ok:true,customer:JSON.parse(text)[0]||null});
};

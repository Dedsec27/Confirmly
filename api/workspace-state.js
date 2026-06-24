const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function configured(){ return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY); }
function endpoint(path){ return `${SUPABASE_URL.replace(/\/$/, '')}${path}`; }
function validKey(value){ return /^[a-zA-Z0-9-]{12,120}$/.test(String(value || '').trim()); }
function safeState(input){
  const value=input && typeof input==='object' ? input : {};
  const settings=value.settings && typeof value.settings==='object' ? value.settings : {};
  const appointments=Array.isArray(value.appointments) ? value.appointments : [];
  const customers=Array.isArray(value.customers) ? value.customers : [];
  return { settings, appointments, customers };
}
module.exports = async (req,res) => {
  res.setHeader('Cache-Control','no-store, max-age=0, must-revalidate');
  if(!configured()) return res.status(503).json({error:'Workspace sync backend is not configured.'});
  const headers={apikey:SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${SUPABASE_SERVICE_ROLE_KEY}`};
  if(req.method==='GET'){
    const workspaceKey=String(req.query?.workspace||'').trim();
    if(!validKey(workspaceKey)) return res.status(400).json({error:'A valid workspace is required.'});
    try{
      const response=await fetch(endpoint(`/rest/v1/workspace_state?workspace_key=eq.${encodeURIComponent(workspaceKey)}&select=state,updated_at&limit=1`),{headers});
      const text=await response.text();
      if(!response.ok) return res.status(response.status).json({error:'Could not load workspace data.',details:text.slice(0,500)});
      const rows=JSON.parse(text||'[]');
      return res.status(200).json({state:rows[0]?.state||null,updatedAt:rows[0]?.updated_at||null});
    }catch{ return res.status(500).json({error:'Workspace sync is temporarily unavailable.'}); }
  }
  if(req.method==='PUT'){
    const workspaceKey=String(req.body?.workspaceKey||'').trim();
    if(!validKey(workspaceKey)) return res.status(400).json({error:'A valid workspace is required.'});
    const payload={workspace_key:workspaceKey,state:safeState(req.body?.state),updated_at:new Date().toISOString()};
    try{
      const response=await fetch(endpoint('/rest/v1/workspace_state?on_conflict=workspace_key'),{
        method:'POST',
        headers:{...headers,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},
        body:JSON.stringify(payload)
      });
      const text=await response.text();
      if(!response.ok) return res.status(response.status).json({error:'Could not save workspace data.',details:text.slice(0,500)});
      return res.status(200).json({ok:true});
    }catch{ return res.status(500).json({error:'Workspace save is temporarily unavailable.'}); }
  }
  res.setHeader('Allow','GET, PUT');
  return res.status(405).json({error:'Method not allowed'});
};

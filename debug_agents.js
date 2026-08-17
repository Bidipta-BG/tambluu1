require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAgents() {
  // Query all users from auth.users (requires service role)
  const { data: users, error: authErr } = await supabase.auth.admin.listUsers();
  
  if (authErr) {
    console.error("Failed to list users:", authErr);
    return;
  }
  
  // Filter for agent emails
  const agentUsers = users.users.filter(u => u.email && u.email.includes('@agent.tambola.com'));
  
  console.log("=== AGENTS IN AUTH ===");
  agentUsers.forEach(u => {
    console.log(`- Email: ${u.email}`);
    console.log(`  Created: ${u.created_at}`);
    console.log(`  Tenant ID: ${u.app_metadata?.tenant_id}`);
    console.log(`  Phone (meta): ${u.user_metadata?.phone}`);
    console.log('');
  });
  
  // Query agents table
  const { data: agents, error: dbErr } = await supabase.from('agents').select('*');
  
  if (dbErr) {
    console.error("Failed to fetch agents table:", dbErr);
    return;
  }
  
  console.log("=== AGENTS IN DB ===");
  agents.forEach(a => {
    console.log(`- Name: ${a.name}, Phone: ${a.phone}`);
    console.log(`  Tenant ID: ${a.tenant_id}`);
    console.log(`  Plain Password: ${a.plain_password}`);
    console.log('');
  });
}

checkAgents();

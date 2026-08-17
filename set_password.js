const { createClient } = require('@supabase/supabase-js');

// Using the actual keys from your backend environment
const supabaseAdmin = createClient(
  'https://zbtdigmflkatfnwqfbox.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpidGRpZ21mbGthdGZud3FmYm94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc2NTgwMiwiZXhwIjoyMTAyMzQxODAyfQ.F3Stvk8uqm9DB5vyL7JObP5vgrasTV9qJhrtXasoahA'
);

async function setPassword() {
  console.log("Looking up user...");
  const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
  
  if (usersError) {
    console.error("Error fetching users:", usersError.message);
    return;
  }

  const user = usersData.users.find(u => u.email === 'hello@world.com');
  
  if (!user) {
    console.log("Could not find user with email hello@world.com");
    return;
  }

  console.log(`Found user: ${user.id}. Setting password to 'password123'...`);

  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    password: 'password123',
    email_confirm: true
  });

  if (error) {
    console.error("Error setting password:", error.message);
  } else {
    console.log("SUCCESS! You can now log in with:");
    console.log("Email: hello@world.com");
    console.log("Password: password123");
  }
}

setPassword();

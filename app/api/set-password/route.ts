import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabaseAdmin = createClient(
      'https://zbtdigmflkatfnwqfbox.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpidGRpZ21mbGthdGZud3FmYm94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc2NTgwMiwiZXhwIjoyMTAyMzQxODAyfQ.F3Stvk8uqm9DB5vyL7JObP5vgrasTV9qJhrtXasoahA',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) throw usersError;

    const user = usersData.users.find(u => u.email === 'hello@world.com');
    
    if (!user) {
      return NextResponse.json({ error: "User hello@world.com not found" });
    }

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: 'password123',
      email_confirm: true
    });

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Password successfully updated to password123" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}

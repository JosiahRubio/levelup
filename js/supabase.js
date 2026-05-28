import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://pwcjsfdtqlgylirgdxdw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3Y2pzZmR0cWxneWxpcmdkeGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMDEzMDIsImV4cCI6MjA5NTU3NzMwMn0.zSCDdt8ojDRtlztwbzagqbV6jW6U_gIM62O_qnLd6Cg";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

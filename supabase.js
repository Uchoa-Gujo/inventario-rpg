import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = 'https://njnvnefeygkndyhdnkqc.supabase.co'
const supabaseKey = 'sb_publishable_eZvcp6DhCI_L_St_ROcCqw_CIWIxDop'

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
})

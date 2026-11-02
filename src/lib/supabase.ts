import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

/** Null until Supabase env vars are set; history UI shows a notice in that case. */
export const supabase = url && key ? createClient(url, key) : null

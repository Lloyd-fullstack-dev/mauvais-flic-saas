import { createClient } from '@supabase/supabase-js';

// On va chercher les clés cachées dans ton fichier .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// On crée et on exporte la connexion (le "client")
export const supabase = createClient(supabaseUrl, supabaseKey);
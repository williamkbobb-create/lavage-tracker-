import { createClient } from "@supabase/supabase-js";

const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
const publishableKey = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined;

export const isSupabaseConfigured = Boolean(url && publishableKey);

if (!isSupabaseConfigured && typeof window !== "undefined") {
  console.warn(
    "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to your .env file.",
  );
}

/**
 * Browser Supabase client using the publishable/anon key only.
 * All access is protected by Row Level Security in supabase/schema.sql.
 */
export const supabase = createClient(
  url ?? "https://placeholder.supabase.co",
  publishableKey ?? "public-anon-key",
  {
    auth: {
      persistSession: typeof window !== "undefined",
      autoRefreshToken: typeof window !== "undefined",
      detectSessionInUrl: typeof window !== "undefined",
    },
  },
);

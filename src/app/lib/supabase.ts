import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

// createBrowserClient from @supabase/ssr handles cookie-based auth
// automatically in the browser — read AND write. This is what makes
// the session persist across page refreshes and what lets the middleware
// see the authenticated session.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

import { createBrowserClient } from '@supabase/ssr'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config'

const isProdDomain =
  typeof window !== "undefined" &&
  (window.location.hostname === "vishwakarmans.com" ||
    window.location.hostname.endsWith(".vishwakarmans.com"));

export const supabase = createBrowserClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  isProdDomain
    ? {
        cookieOptions: {
          domain: ".vishwakarmans.com",
          path: "/",
          sameSite: "lax",
          secure: true,
        },
      }
    : {}
);

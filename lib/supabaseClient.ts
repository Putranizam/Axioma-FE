import { createClient, SupabaseClient, User, Session } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  "664336778701-gqrpatehv6pvliigpdoilk7et8fo0cdi.apps.googleusercontent.com";

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey && supabase !== null);
}

/**
 * Generate a cryptographically secure random raw nonce and its SHA-256 hex hash.
 * Provider (Google) gets the hashedNonce, while Supabase signInWithIdToken gets the rawNonce.
 */
export async function generateNoncePair(): Promise<{ rawNonce: string; hashedNonce: string }> {
  const rawBytes = new Uint8Array(32);
  if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(rawBytes);
  } else {
    for (let i = 0; i < 32; i++) {
      rawBytes[i] = Math.floor(Math.random() * 256);
    }
  }

  const rawNonce = Array.from(rawBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  let hashedNonce = rawNonce;
  try {
    if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const encoded = encoder.encode(rawNonce);
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", encoded);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      hashedNonce = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }
  } catch (err) {
    console.warn("SHA-256 hash creation failed, fallback to raw nonce", err);
    hashedNonce = rawNonce;
  }

  return { rawNonce, hashedNonce };
}

/**
 * Authenticates with Supabase using a Google ID token.
 * Fully compatible with both strict nonce checks and "Skip nonce checks" enabled in Supabase.
 */
export async function signInWithGoogleIdToken(
  idToken: string,
  rawNonce?: string | null
): Promise<{ user: User | null; session: Session | null; error: Error | null }> {
  if (!supabase) {
    return {
      user: null,
      session: null,
      error: new Error("Koneksi Supabase belum dikonfigurasi."),
    };
  }

  try {
    // 1. If rawNonce is available, attempt sign in with nonce
    if (rawNonce) {
      const res = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
        nonce: rawNonce,
      });

      if (!res.error && res.data?.user) {
        return { user: res.data.user, session: res.data.session, error: null };
      }

      // If failed due to nonce check (e.g. Supabase dashboard has "Skip nonce checks" enabled and expects no nonce, or mismatch)
      if (res.error && res.error.message && res.error.message.toLowerCase().includes("nonce")) {
        const retry = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: idToken,
        });

        if (!retry.error && retry.data?.user) {
          return { user: retry.data.user, session: retry.data.session, error: null };
        }
        return { user: null, session: null, error: retry.error };
      }

      if (res.error) {
        return { user: null, session: null, error: res.error };
      }
    }

    // 2. Direct attempt without nonce
    const directRes = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
    });

    if (directRes.error) {
      return { user: null, session: null, error: directRes.error };
    }

    return { user: directRes.data?.user || null, session: directRes.data?.session || null, error: null };
  } catch (err: any) {
    return { user: null, session: null, error: err };
  }
}

export type { User as SupabaseUser, Session as SupabaseSession };

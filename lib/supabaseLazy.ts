import type { SupabaseClient } from "@supabase/supabase-js";
import type { SupabaseUser, SupabaseSession } from "./supabaseClient";

type SupabaseClientModule = typeof import("./supabaseClient");

let cachedModule: SupabaseClientModule | null = null;
let loadingPromise: Promise<SupabaseClientModule> | null = null;

/**
 * Returns the already-loaded Supabase client synchronously if available,
 * without pulling `@supabase/supabase-js` into the initial route bundle.
 */
export function getCachedSupabaseClient(): SupabaseClient | null {
  return cachedModule?.supabase ?? null;
}

/**
 * Dynamically loads `lib/supabaseClient` (and `@supabase/supabase-js`) outside the critical path
 * and caches the module for subsequent auth actions (session, OAuth, updateUser, signOut).
 */
export async function loadSupabaseClientModule(): Promise<SupabaseClientModule> {
  if (cachedModule) {
    return cachedModule;
  }
  if (!loadingPromise) {
    loadingPromise = import("./supabaseClient")
      .then((mod) => {
        cachedModule = mod;
        return mod;
      })
      .catch((err) => {
        loadingPromise = null;
        throw err;
      });
  }
  return loadingPromise;
}

export async function getSupabaseClient(): Promise<SupabaseClient | null> {
  const mod = await loadSupabaseClientModule();
  return mod.supabase;
}

export type { SupabaseUser, SupabaseSession };

/**
 * Whether the public Supabase settings were available to this build/runtime.
 *
 * Accounts, saved-to-account journeys and the case tracker need Supabase; the
 * public demo and guest (this-device) journeys do not. UI code checks this
 * instead of touching the client, so a deployment built without the public
 * URL/key still renders — with account features clearly unavailable.
 *
 * Reads the same variables as `client.ts`. Only presence is checked; values are
 * never logged.
 */
export function isSupabaseConfigured(): boolean {
  const url =
    import.meta.env["VITE_SUPABASE_URL"] ||
    (typeof process !== "undefined" ? process.env?.["SUPABASE_URL"] : undefined);
  const key =
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
    (typeof process !== "undefined" ? process.env?.["SUPABASE_PUBLISHABLE_KEY"] : undefined);
  return Boolean(url && key);
}

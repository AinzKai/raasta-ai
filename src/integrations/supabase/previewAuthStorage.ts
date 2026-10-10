// Standard browser localStorage-backed auth session storage for Supabase.
export function brokeredPreviewStorage() {
  if (typeof window === "undefined") return undefined;
  return localStorage;
}

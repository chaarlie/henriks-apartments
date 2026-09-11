export const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2026-09-08'

// Empty-string fallbacks so the module can be imported during Next.js static
// page collection without crashing. Real requests fail at runtime if the vars
// are genuinely missing (createClient rejects an empty projectId).
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? ''
export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? ''

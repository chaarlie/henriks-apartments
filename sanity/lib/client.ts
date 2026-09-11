import {createClient, type SanityClient} from 'next-sanity'
import {apiVersion, dataset, projectId} from '../env'

// Read token for the PRIVATE dataset. Server-only (no NEXT_PUBLIC_ prefix) so it
// is never shipped to the browser. A private dataset can't use the public CDN,
// so requests authenticate with this token instead.
const token = process.env.SANITY_API_READ_TOKEN

let _client: SanityClient | null = null

export function getClient(): SanityClient {
  if (!_client) {
    if (!projectId) throw new Error('Missing NEXT_PUBLIC_SANITY_PROJECT_ID')
    _client = createClient({
      projectId,
      dataset,
      apiVersion,
      useCdn: false,
      token,
      perspective: 'published',
    })
  }
  return _client
}

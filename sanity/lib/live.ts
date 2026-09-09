import {type QueryParams} from 'next-sanity'
import {getClient} from './client'

/**
 * Thin wrapper over client.fetch that returns the `{ data }` shape pages read.
 * next-sanity's SanityLive isn't used (it's flagged as not-recommended on
 * Next 16), so this is a plain server fetch with ISR revalidation.
 */
export async function sanityFetch<Result = unknown>({
  query,
  params,
  revalidate = 60,
  tags,
}: {
  query: string
  params?: QueryParams
  revalidate?: number | false
  tags?: string[]
}): Promise<{data: Result}> {
  const data = await getClient().fetch<Result>(query, params ?? {}, {
    next: {revalidate, tags},
  })
  return {data}
}

// No-op — keeps any `<SanityLive />` import in a layout working.
export function SanityLive() {
  return null
}

import "server-only";
import { createClient, type SanityClient } from "next-sanity";
import { apiVersion, dataset, projectId } from "../env";

// Server-only editor client for the /admin write path. The token has write
// access, so this module must NEVER be imported into client code — every caller
// runs inside a server action that has already checked the signed-in admin.
const token = process.env.SANITY_API_WRITE_TOKEN;

let _client: SanityClient | null = null;

export function getWriteClient(): SanityClient {
  if (!_client) {
    if (!projectId) throw new Error("Missing NEXT_PUBLIC_SANITY_PROJECT_ID");
    if (!token) throw new Error("Missing SANITY_API_WRITE_TOKEN");
    _client = createClient({
      projectId,
      dataset,
      apiVersion,
      useCdn: false,
      token,
      perspective: "published",
    });
  }
  return _client;
}

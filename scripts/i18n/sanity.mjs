/*
  One Sanity client for the translation scripts, and the errors worth failing on.

  `perspective: "raw"` on purpose. The app's two clients both pin "published" so
  a draft can never reach the public site or the /admin list — that is what makes
  the review gate work. These scripts need the opposite: status has to see a
  translation sitting in a draft awaiting review, and apply has to write one.

  The dataset is PRIVATE, so every read authenticates too. A sibling project got
  away with unauthenticated fetches; here an untokened query returns nothing,
  which reads exactly like "nothing to translate".
*/
import { createClient } from "@sanity/client";
import { usable } from "./lib.mjs";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2024-10-01";

export function die(message, hint) {
  console.error(`\n${message}`);
  if (hint) console.error(`  ${hint}`);
  console.error("");
  process.exit(1);
}

/**
 * @param {{write?: boolean}} opts  write:true needs the editor token; reads
 *   accept either, because the viewer token is enough to see drafts.
 */
export function sanity({ write = false } = {}) {
  if (!projectId) {
    die(
      "Missing NEXT_PUBLIC_SANITY_PROJECT_ID.",
      "Run these through npm (npm run i18n:status) — that passes --env-file-if-exists=.env.local. Node does not read .env files on its own.",
    );
  }

  const writeToken = usable(process.env.SANITY_API_WRITE_TOKEN)
    ? process.env.SANITY_API_WRITE_TOKEN
    : "";
  const readToken = usable(process.env.SANITY_API_READ_TOKEN)
    ? process.env.SANITY_API_READ_TOKEN
    : "";

  const token = write ? writeToken : readToken || writeToken;
  if (!token) {
    die(
      write
        ? "No SANITY_API_WRITE_TOKEN — apply needs the editor token to write a draft."
        : "No Sanity token. The dataset is private, so reads need one too.",
      "Set it in .env.local (see .env.example).",
    );
  }

  return createClient({
    projectId,
    dataset,
    apiVersion,
    token,
    useCdn: false,
    perspective: "raw",
  });
}

/** Fields every script pulls off a unit. Kept here so they cannot drift apart. */
export const UNIT_PROJECTION = `
  _id, _rev, tagline, keywords, saleNote, chips, coverImage, gallery,
  about, space, termsOverride, amenitiesOverride, i18n,
  "name": name,
  "slug": slug.current,
  "draftI18n": *[_id == "drafts." + ^._id][0].i18n
`;

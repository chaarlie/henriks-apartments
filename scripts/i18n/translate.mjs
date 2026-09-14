/*
  Fill in the pending files with Claude, into the same shape a person would have
  typed by hand.

  Deliberately not part of the build, for three reasons: a build should be
  deterministic and an LLM call is not; a build runs on every deploy and would
  re-spend on text that has not changed; and a build cannot wait for a human,
  which is the one thing this pipeline is built around. The output is a draft,
  and apply.mjs keeps it a draft until someone publishes it.

  Usage:
    npm run i18n:translate              everything pending
    npm run i18n:translate es
    npm run i18n:translate es apartment-1

  Needs ANTHROPIC_API_KEY. Run it through npm, which passes
  --env-file-if-exists=.env.local — node does not read .env files on its own, so
  running this file directly finds no key and fails with an unhelpful 401.
*/
import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { die } from "./sanity.mjs";
import { usable } from "./lib.mjs";
import { LOCALES, DEFAULT_LOCALE, isLocale } from "../../lib/locales.ts";

const MODEL = "claude-opus-5";

/** USD per million tokens, keyed by model so the figure printed cannot drift
    from the model actually called. */
const PRICING = {
  "claude-opus-5": { input: 5, output: 25 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

/*
  How each language should be written. The glossary is most of what separates a
  usable draft from a generic one: without it the same term comes back three
  different ways across four apartments — "depósito", "fianza", "garantía" for
  one deposit — and place names get helpfully translated into things nobody
  searches for.
*/
const TARGETS = {
  es: {
    language: "Spanish",
    brief: `Latin American Spanish for a Dominican Republic audience. Address the reader as "tú", never "usted" — the site is warm and plain-spoken, not corporate. Never Peninsular Spanish ("acá/aquí", never "vosotros").

GLOSSARY (use these consistently)
- monthly rent → alquiler mensual · nightly → por noche
- deposit → depósito · refundable → reembolsable
- utilities → servicios · metered electricity → electricidad por consumo
- water → agua · garbage → basura · fibre internet → internet de fibra
- furnished → amueblado · fully furnished → totalmente amueblado
- bedroom → habitación · bathroom → baño · kitchen → cocina
- balcony → balcón · pool → piscina · sun deck → solárium
- gated entry → entrada con portón · walk-up / no elevator → sin ascensor
- linens & towels → ropa de cama y toallas · cleaning → limpieza
- check-in → entrada · check-out → salida
- long stay → estancia larga · any length of stay → cualquier duración`,
  },
};

const [localeArg, slugArg] = process.argv.slice(2);
if (localeArg && !isLocale(localeArg)) {
  die(`"${localeArg}" is not a configured locale.`, `Known: ${LOCALES.join(", ")} (lib/locales.ts)`);
}

if (!usable(process.env.ANTHROPIC_API_KEY)) {
  die("No ANTHROPIC_API_KEY.", "Put it in .env.local, then: npm run i18n:translate");
}

const PENDING = path.join(import.meta.dirname, "pending");
if (!fs.existsSync(PENDING)) die("Nothing pending.", "Run: npm run i18n:extract");

const locales = (localeArg ? [localeArg] : fs.readdirSync(PENDING)).filter(
  (l) => isLocale(l) && l !== DEFAULT_LOCALE && fs.existsSync(path.join(PENDING, l)),
);
if (!locales.length) die("Nothing pending.", "Run: npm run i18n:extract");

const client = new Anthropic();
const spent = { input: 0, output: 0 };

function systemPrompt(locale) {
  const target = TARGETS[locale];
  if (!target) {
    die(
      `No translation brief for "${locale}".`,
      "Add one to TARGETS in scripts/i18n/translate.mjs — the glossary is what keeps terminology consistent.",
    );
  }
  return `You translate copy for a furnished apartment rental website from English into ${target.language}.

The apartments are in El Batey, Sosúa, on the north coast of the Dominican Republic. They are rented by the month or by the night to people relocating or staying a while. The voice is warm, plain and concrete — it states facts and prices in the open. Not brochure language.

${target.brief}

NEVER TRANSLATE
- Place names: Sosúa, El Batey, Playa Sosúa, Cabarete, Puerto Plata, Santo Domingo, Santiago.
- The property name "Sosúa studios", apartment names and unit codes (e.g. "101", "Apartment 1").
- "WhatsApp", "wifi", "Mbps", and anything inside a URL.

RULES
- Return a JSON object with EXACTLY the same keys you were given, and nothing else.
- Translate the value of every key. Never merge, split, reorder or drop keys.
- Keys like "about.a1b2c3.0" are fragments of one sentence split across formatting marks. Translate each fragment so that concatenating them in order reads as natural ${target.language}.
- Preserve leading and trailing spaces exactly as they appear in the source; they are what keeps the fragments apart.
- Keep every number, price, measurement and date exactly as it is. Never convert currencies or units.
- A value that is only punctuation or a number comes back unchanged.`;
}

async function translate(locale, strings) {
  /*
    Streamed because a full apartment runs to several thousand output tokens and
    a non-streaming request that size risks the SDK's HTTP timeout.

    Server-side fallbacks are on: if a safety classifier declines the request,
    the API re-runs it on a fallback model inside the same call rather than
    leaving the document half-translated.
  */
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    system: systemPrompt(locale),
    thinking: { type: "adaptive" },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    messages: [
      {
        role: "user",
        content: `Translate every value in this JSON object. Return only the JSON object.\n\n${JSON.stringify(strings, null, 1)}`,
      },
    ],
  });

  const message = await stream.finalMessage();
  spent.input += message.usage?.input_tokens ?? 0;
  spent.output += message.usage?.output_tokens ?? 0;

  if (message.stop_reason === "refusal") {
    throw new Error(`declined: ${message.stop_details?.category ?? "unknown"}`);
  }

  const text = message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  // The model is asked for bare JSON, but a stray fence is cheap to survive.
  const json = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "");
  return JSON.parse(json);
}

/*
  Whitespace is re-applied from the source rather than trusted from the model.

  These fragments concatenate around bold and links, so one dropped leading
  space silently glues two words together — and it is invisible in a diff of the
  translation.
*/
function restoreWhitespace(src, out) {
  const ws = /^(\s*)([\s\S]*?)(\s*)$/;
  const fixed = {};
  for (const [k, v] of Object.entries(src)) {
    const [, lead, , trail] = String(v).match(ws);
    const [, , body] = String(out[k] ?? "").match(ws);

    /*
      One exception: a fragment that now begins with punctuation. Spanish
      reorders — an adjective moves after the noun and the next fragment starts
      with a comma. Re-adding the source's leading space there produces
      "Sosúa , tranquilo", which looks like a typo rather than a tooling artifact.
    */
    const startsWithPunctuation = /^[,.;:!?)\]»”]/.test(body);
    fixed[k] = `${startsWithPunctuation ? "" : lead}${body}${trail}`;
  }
  return fixed;
}

let done = 0;

for (const locale of locales) {
  const root = path.join(PENDING, locale);
  // Pending files sit under a folder per document type (unit, hero, …), so the
  // listing goes one level deeper than it used to.
  const files = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .flatMap((e) =>
      fs
        .readdirSync(path.join(root, e.name))
        .filter((f) => f.endsWith(".json"))
        .filter((f) => !slugArg || f === `${slugArg}.json`)
        .map((f) => `${e.name}/${f}`),
    );

  for (const file of files) {
    const full = path.join(root, file);
    const doc = JSON.parse(fs.readFileSync(full, "utf8"));
    const src = doc.strings;

    process.stdout.write(`  ${locale}/${file.replace(".json", "").slice(0, 44)} — ${Object.keys(src).length} strings … `);
    try {
      const out = await translate(locale, src);

      /*
        Refuse a partial result rather than write a half-Spanish apartment. Two
        English paragraphs in the middle of a Spanish page are far harder to
        spot later than an error here.
      */
      const missing = Object.keys(src).filter((k) => !(k in out) || !String(out[k]).trim());
      if (missing.length) {
        console.log(`✗ ${missing.length} keys missing (${missing.slice(0, 3).join(", ")}…)`);
        continue;
      }

      doc.strings = restoreWhitespace(src, out);
      // The one place this flag is set. apply.mjs refuses anything still false,
      // which is what stops un-translated English being written as a translation.
      doc.translated = true;
      fs.writeFileSync(full, JSON.stringify(doc, null, 2) + "\n");
      done++;
      console.log("✓");
    } catch (error) {
      console.log(`✗ ${error instanceof Error ? error.message.slice(0, 160) : error}`);
    }
  }
}

const rate = PRICING[MODEL] ?? { input: 0, output: 0 };
const cost = (spent.input * rate.input + spent.output * rate.output) / 1_000_000;
console.log(
  `\n${MODEL}: ${spent.input.toLocaleString()} in / ${spent.output.toLocaleString()} out — about $${cost.toFixed(3)}`,
);

if (done) {
  console.log(`\nRead the drafts, then apply:`);
  console.log(`  npm run i18n:apply${localeArg ? ` ${localeArg}` : " <locale>"}`);
}

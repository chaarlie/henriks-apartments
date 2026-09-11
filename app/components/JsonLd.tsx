/**
 * Structured data as a native <script> (not next/script — it isn't executable),
 * per Next's JSON-LD guide. `<` is escaped so content can't break out of the tag.
 */
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

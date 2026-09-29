/**
 * "Make cover" in the photo editor.
 *
 * The invariant worth pinning is that NO PHOTO IS SILENTLY LOST. `coverImage` is
 * its own field, not a gallery entry, and none of the four apartments has its
 * cover in its gallery — so assigning a new cover over the old one would remove
 * the old photo from the site entirely, with nothing in the UI to say so. It is an
 * exchange instead: the outgoing cover takes the incoming photo's place.
 */
import { promoteToCover, pruneStaleAlts, type AltRow } from "@/lib/admin/gallery";
import type { MediaImage } from "@/lib/admin/types";

const img = (n: number): MediaImage => ({
  ref: `image-ref-${n}`,
  url: `/photo-${n}.jpg`,
  alt: `Photo ${n}`,
  key: `key${n}`,
});

const urls = (g: MediaImage[]) => g.map((p) => p.url);

describe("promoteToCover", () => {
  it("swaps the chosen photo with the old cover", () => {
    const gallery = [img(1), img(2), img(3)];
    const next = promoteToCover(gallery, img(9), 1);

    expect(next.cover?.url).toBe("/photo-2.jpg");
    // The old cover lands exactly where the promoted photo was.
    expect(urls(next.gallery)).toEqual(["/photo-1.jpg", "/photo-9.jpg", "/photo-3.jpg"]);
  });

  it("loses no photo and changes no count", () => {
    const gallery = [img(1), img(2), img(3)];
    const before = new Set([...urls(gallery), "/photo-9.jpg"]);
    const next = promoteToCover(gallery, img(9), 2);

    expect(next.gallery).toHaveLength(gallery.length);
    expect(new Set([...urls(next.gallery), next.cover!.url])).toEqual(before);
  });

  it("is undone by promoting the photo that moved", () => {
    const gallery = [img(1), img(2), img(3)];
    const once = promoteToCover(gallery, img(9), 1);
    const back = promoteToCover(once.gallery, once.cover, 1);

    expect(back.cover?.url).toBe("/photo-9.jpg");
    expect(urls(back.gallery)).toEqual(urls(gallery));
  });

  it("just takes the photo out of the gallery when there is no cover yet", () => {
    // Nothing to swap in, and the photo is about to lead the strip as the cover —
    // leaving it in both places would list it twice in the editor.
    const next = promoteToCover([img(1), img(2)], null, 0);

    expect(next.cover?.url).toBe("/photo-1.jpg");
    expect(urls(next.gallery)).toEqual(["/photo-2.jpg"]);
  });

  it("does nothing for an index that is not there", () => {
    const gallery = [img(1)];
    const cover = img(9);
    for (const i of [-1, 1, 99]) {
      const next = promoteToCover(gallery, cover, i);
      expect(next.cover).toBe(cover);
      expect(next.gallery).toBe(gallery);
    }
  });
});

/*
  The sharp edge in this data model: translated alt text is matched to a gallery
  photo by `_key`, but the COVER's translation is a single `coverAlt` string
  meaning "whatever the cover is". So changing the cover hands the new photo the
  old photo's Spanish caption — the Spanish page captions the wrong picture, and
  nothing falls back because a value is present.

  Real data at the time of writing: Unit 201 had 14 filled Spanish gallery alts
  and a Spanish coverAlt describing a "Loft de jardín" that no longer exists.
*/
describe("pruneStaleAlts", () => {
  const row = (over: Partial<AltRow> = {}): AltRow => ({
    _key: "es",
    locale: "es",
    coverAlt: "La portada anterior",
    galleryAlts: [{ _key: "k1", alt: "Uno" }, { _key: "k2", alt: "Dos" }],
    ...over,
  });
  const keys = (...k: string[]) => new Set(k);

  it("clears the cover caption when the cover photo changed", () => {
    const out = pruneStaleAlts([row()], { coverChanged: true, galleryKeys: keys("k1", "k2") });
    expect(out).not.toBeNull();
    expect(out![0].coverAlt).toBeUndefined();
    // The gallery captions are untouched — only the cover moved.
    expect(out![0].galleryAlts).toHaveLength(2);
  });

  it("drops a caption whose photo has left the gallery", () => {
    const out = pruneStaleAlts([row()], { coverChanged: false, galleryKeys: keys("k1") });
    expect(out![0].galleryAlts).toEqual([{ _key: "k1", alt: "Uno" }]);
    expect(out![0].coverAlt).toBe("La portada anterior");
  });

  it("leaves an ordinary save completely alone", () => {
    // null means "write nothing", so reordering photos does not touch translations.
    expect(pruneStaleAlts([row()], { coverChanged: false, galleryKeys: keys("k1", "k2") })).toBeNull();
  });

  it("is null when there are no translations at all", () => {
    expect(pruneStaleAlts([], { coverChanged: true, galleryKeys: keys() })).toBeNull();
  });

  it("keeps every other field on the row", () => {
    const out = pruneStaleAlts([row({ tagline: "Hola", sourceHash: "abc" })], {
      coverChanged: true,
      galleryKeys: keys("k1", "k2"),
    });
    expect(out![0].tagline).toBe("Hola");
    expect(out![0].sourceHash).toBe("abc");
    expect(out![0].locale).toBe("es");
  });

  it("handles a row with no galleryAlts and a row with unkeyed entries", () => {
    const out = pruneStaleAlts(
      [row({ galleryAlts: undefined }), row({ galleryAlts: [{ alt: "sin clave" } as { _key?: string }] })],
      { coverChanged: false, galleryKeys: keys("k1") },
    );
    // The unkeyed entry can describe nothing, so it goes.
    expect(out![1].galleryAlts).toEqual([]);
  });
});

/** Only words belong in a photo translation; never copy media or its category. */
export type AreaCaption = { _key: string; label?: string; title?: string; alt?: string };

export function mergeAreaCaptions<T extends { _key?: string; label?: string; title?: string; alt?: string }>(
  photos: T[] | undefined, captions: AreaCaption[] | undefined,
): T[] {
  const byKey = new Map((captions ?? []).filter(row => row._key).map(row => [row._key, row]));
  return (photos ?? []).map(photo => {
    const caption = photo._key ? byKey.get(photo._key) : undefined;
    if (!caption) return photo;
    return { ...photo, label: caption.label?.trim() || photo.label,
      title: caption.title?.trim() || photo.title, alt: caption.alt?.trim() || photo.alt };
  });
}

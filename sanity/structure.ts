import type {StructureResolver} from 'sanity/structure'

/**
 * The shared, edit-once documents. Each is pinned to a fixed document id so the
 * Studio always opens the same one instead of letting Henrik create duplicates.
 * Keep this list in sync with the singletons in ./schemaTypes/index.ts.
 */
const singletons = [
  {id: 'siteSettings', title: 'Property details', schemaType: 'siteSettings'},
  {id: 'hero', title: 'Homepage / Hero', schemaType: 'hero'},
  {id: 'location', title: 'Location', schemaType: 'location'},
  {id: 'stayDefaults', title: 'Stay defaults', schemaType: 'stayDefaults'},
]

export const singletonTypes = new Set(singletons.map((s) => s.schemaType))

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .title('Apartments')
        .schemaType('unit')
        .child(S.documentTypeList('unit').title('Apartments')),
      S.listItem()
        .title('Bookings')
        .schemaType('booking')
        .child(S.documentTypeList('booking').title('Bookings')),
      S.divider(),
      ...singletons.map((s) =>
        S.listItem()
          .title(s.title)
          .id(s.id)
          .child(S.document().schemaType(s.schemaType).documentId(s.id)),
      ),
    ])

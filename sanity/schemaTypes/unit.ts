import {defineType, defineField, defineArrayMember} from 'sanity'

const galleryImage = defineArrayMember({
  type: 'image',
  options: {hotspot: true},
  fields: [defineField({name: 'alt', title: 'Alt text', type: 'string'})],
})

/**
 * Unit — one apartment. Holds ONLY what differs between apartments. Shared info
 * (location, house rules, the amenity checklist, property/contact, pricing FX)
 * lives in the singletons and is merged in at query time — so Henrik edits the
 * address, terms, or amenities once and every unit reflects it.
 *
 * The two *Override fields are optional escape hatches for a unit that genuinely
 * differs; leave them empty to inherit the shared defaults.
 */
export const unit = defineType({
  name: 'unit',
  title: 'Apartment',
  type: 'document',
  groups: [
    {name: 'overview', title: 'Overview', default: true},
    {name: 'media', title: 'Media'},
    {name: 'content', title: 'Content'},
    {name: 'overrides', title: 'Overrides'},
  ],
  fields: [
    defineField({name: 'name', title: 'Name', type: 'string', group: 'overview', validation: (r) => r.required()}),
    defineField({name: 'hidden', title: 'Hidden from site', type: 'boolean', group: 'overview', initialValue: false, description: 'When on, the apartment is taken off the public site and all its dates are blocked.'}),
    defineField({name: 'code', title: 'Unit code', type: 'string', group: 'overview'}),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'overview',
      options: {source: 'name', maxLength: 64},
      validation: (r) => r.required(),
    }),
    defineField({name: 'tagline', title: 'Tagline', type: 'string', group: 'overview'}),
    defineField({name: 'priceUsd', title: 'Monthly rent (USD)', type: 'number', group: 'overview', validation: (r) => r.required().positive()}),
    defineField({name: 'priceNightlyUsd', title: 'Nightly rate (USD)', type: 'number', group: 'overview', validation: (r) => r.required().positive()}),
    defineField({
      name: 'deposits',
      title: 'Deposit by length of stay',
      type: 'array',
      group: 'overview',
      description:
        'The row with the highest "from months" the stay reaches applies. Use 0 months to cover short nightly stays. $0 is allowed.',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({name: 'fromMonths', title: 'From months', type: 'number'}),
            defineField({name: 'amountUsd', title: 'Deposit (USD)', type: 'number'}),
          ],
          preview: {
            select: {m: 'fromMonths', a: 'amountUsd'},
            prepare: ({m, a}) => ({title: `${m ?? 0}+ months`, subtitle: `$${a ?? 0} deposit`}),
          },
        }),
      ],
    }),
    defineField({name: 'availableFrom', title: 'Available from', type: 'date', group: 'overview', options: {dateFormat: 'YYYY-MM-DD'}}),
    defineField({
      name: 'spec',
      title: 'Specs',
      type: 'object',
      group: 'overview',
      fields: [
        defineField({name: 'area', title: 'Area', type: 'string'}),
        defineField({name: 'bath', title: 'Bathrooms', type: 'string'}),
        defineField({name: 'sleeps', title: 'Sleeps', type: 'string'}),
      ],
    }),
    // Also on the market — drives the "For sale" badge and the landing section.
    defineField({name: 'forSale', title: 'Also for sale', type: 'boolean', group: 'overview', initialValue: false}),
    defineField({name: 'salePriceUsd', title: 'Asking price (USD)', type: 'number', group: 'overview', description: 'Leave empty for "price on request".', hidden: ({parent}) => !parent?.forSale}),
    defineField({name: 'saleNote', title: 'Sale note', type: 'string', group: 'overview', description: 'One line shown with the For sale badge.', hidden: ({parent}) => !parent?.forSale}),

    defineField({name: 'chips', title: 'Card chips', type: 'array', group: 'overview', of: [defineArrayMember({type: 'string'})], options: {layout: 'tags'}}),
    defineField({name: 'keywords', title: 'Search keywords', type: 'text', group: 'overview', rows: 2}),

    // Media
    defineField({name: 'coverImage', title: 'Cover image', type: 'image', group: 'media', options: {hotspot: true}, fields: [defineField({name: 'alt', type: 'string', title: 'Alt text'})]}),
    defineField({name: 'gallery', title: 'Gallery', type: 'array', group: 'media', of: [galleryImage]}),
    defineField({
      name: 'tour',
      title: '360° tour stops',
      type: 'array',
      group: 'media',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({
              name: 'stopId',
              title: 'Stop ID',
              type: 'string',
              description: 'Stable id used by hotspot links, e.g. "living", "kitchen".',
              validation: (r) => r.required(),
            }),
            defineField({name: 'name', title: 'Stop name', type: 'string'}),
            defineField({
              name: 'panorama',
              title: 'Panorama (Supabase bucket path)',
              type: 'string',
              description:
                'Object path in the henriks-apartments bucket, e.g. "101/101-living-room.JPG". Served downscaled via the render endpoint.',
            }),
            defineField({
              name: 'links',
              title: 'Hotspots',
              type: 'array',
              of: [
                defineArrayMember({
                  type: 'object',
                  fields: [
                    defineField({name: 'to', title: 'Links to stop ID', type: 'string'}),
                    defineField({name: 'yaw', title: 'Yaw', type: 'string', description: 'e.g. "30deg"'}),
                  ],
                }),
              ],
            }),
          ],
          preview: {select: {title: 'name', subtitle: 'stopId'}},
        }),
      ],
    }),

    // Content
    defineField({name: 'about', title: 'About this apartment', type: 'array', group: 'content', of: [defineArrayMember({type: 'block'})]}),
    defineField({
      name: 'space',
      title: 'The space',
      type: 'array',
      group: 'content',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({name: 'key', title: 'Key', type: 'string'}),
            defineField({name: 'title', title: 'Title', type: 'string'}),
            defineField({name: 'desc', title: 'Description', type: 'string'}),
          ],
          preview: {select: {title: 'title', subtitle: 'key'}},
        }),
      ],
    }),

    // Overrides (optional — inherit shared defaults when empty)
    defineField({
      name: 'amenitiesOverride',
      title: 'Amenities override',
      type: 'object',
      group: 'overrides',
      description: 'Leave empty to use the shared checklist from Stay defaults.',
      fields: [
        defineField({name: 'inside', title: 'Inside', type: 'array', of: [defineArrayMember({type: 'object', fields: [defineField({name: 'label', type: 'string'}), defineField({name: 'included', type: 'boolean', initialValue: true})]})]}),
        defineField({name: 'building', title: 'Building & connectivity', type: 'array', of: [defineArrayMember({type: 'object', fields: [defineField({name: 'label', type: 'string'}), defineField({name: 'included', type: 'boolean', initialValue: true})]})]}),
      ],
    }),
    defineField({
      name: 'termsOverride',
      title: 'House rules override',
      type: 'array',
      group: 'overrides',
      description: 'Leave empty to use the shared house rules from Stay defaults.',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({name: 'icon', type: 'string'}),
            defineField({name: 'title', type: 'string'}),
            defineField({name: 'desc', type: 'text', rows: 2}),
          ],
        }),
      ],
    }),
  ],

  preview: {
    select: {title: 'name', subtitle: 'tagline', media: 'coverImage'},
  },
})

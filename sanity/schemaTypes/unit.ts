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
        defineField({
          name: 'bath',
          title: 'Bathrooms',
          type: 'string',
          description: 'Half bathrooms are supported: enter 1.5 for one full bathroom and one half bathroom.',
        }),
        defineField({name: 'sleeps', title: 'Sleeps', type: 'string'}),
        defineField({
          name: 'beds',
          title: 'Beds',
          type: 'string',
          description:
            'Bed configuration exactly as the Booking.com listing states it, e.g. "1 king bed". Unlike Sleeps, this is a fact the listing asserts rather than an occupancy we infer.',
        }),
      ],
    }),
    defineField({
      name: 'bookingUrl',
      title: 'Booking.com listing',
      type: 'url',
      group: 'overview',
      description:
        "Link to THIS apartment's room on the listing — keep the #RD… fragment, which is what selects the room, and drop Booking's aid/label/sid tracking params. Shown as a link guests can verify against; it is not a booking route. Leave empty to hide it.",
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
              name: 'sphereCorrection',
              title: 'Orientation correction',
              type: 'object',
              description:
                'Straightens a crooked or mis-aimed panorama. Degrees, e.g. "30deg" — pan turns it left/right, tilt aims up/down, roll levels the horizon. Leave blank for no correction.',
              options: {columns: 3},
              fields: [
                defineField({name: 'pan', title: 'Pan', type: 'string'}),
                defineField({name: 'tilt', title: 'Tilt', type: 'string'}),
                defineField({name: 'roll', title: 'Roll', type: 'string'}),
              ],
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

    /*
      Translations — one row per language.

      Kept ON the unit rather than in a translated copy of it. A unit is mostly
      language-neutral (price, deposits, dates, panoramas, photos), so a
      duplicated document would mean two prices — and the day someone edits one
      side, the other starts lying about money. Only prose lives here.

      A locale-keyed array rather than suffixed fields (taglineEs, taglineDe…)
      so that adding a language costs a row, not a schema change.

      Written by `npm run i18n:apply`, into a DRAFT. `sourceRev` records the
      English _rev it was translated from, which is what `npm run i18n:status`
      compares to tell a current translation from one that has quietly gone
      stale — the failure mode that looks identical to a finished one.

      Safe to edit by hand: correcting the Spanish here is the review step.
    */
    defineField({
      name: 'i18n',
      title: 'Translations',
      type: 'array',
      group: 'content',
      description: 'Generated by the translation scripts. Edit to correct the wording.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'unitTranslation',
          fields: [
            defineField({name: 'locale', title: 'Language', type: 'string', readOnly: true}),
            defineField({
              name: 'sourceHash',
              title: 'Source fingerprint',
              type: 'string',
              readOnly: true,
              description:
                'Fingerprint of the English this was translated from — what i18n:status compares to spot a stale translation. Do not edit.',
            }),
            defineField({
              name: 'sourceRev',
              title: 'Translated from revision',
              type: 'string',
              readOnly: true,
              description:
                'Provenance only. Not used for staleness: writing a translation bumps the unit’s _rev, so this stops matching as soon as it is published.',
            }),
            defineField({
              name: 'machine',
              title: 'Awaiting review',
              type: 'boolean',
              readOnly: true,
              description:
                'Written by the translation scripts and not yet read by a person. Saving the apartment in /admin clears it. Separate from the fingerprint on purpose: that records which English this came from, this records whether anyone has checked it.',
            }),
            defineField({name: 'tagline', title: 'Tagline', type: 'string'}),
            defineField({name: 'keywords', title: 'Search keywords', type: 'text', rows: 2}),
            defineField({
              name: 'spec',
              title: 'Specs',
              type: 'object',
              description:
                'Only the bed configuration translates. Area, baths and sleeps are a number and a unit — the same fact in every language — and live on the apartment itself.',
              fields: [defineField({name: 'beds', title: 'Beds', type: 'string'})],
            }),
            defineField({name: 'saleNote', title: 'For-sale note', type: 'text', rows: 2}),
            defineField({name: 'chips', title: 'Card chips', type: 'array', of: [defineArrayMember({type: 'string'})], options: {layout: 'tags'}}),
            defineField({name: 'coverAlt', title: 'Cover image alt text', type: 'string'}),
            defineField({
              name: 'galleryAlts',
              title: 'Gallery alt text',
              type: 'array',
              description: 'Alt text only — the photos themselves are shared across languages.',
              of: [defineArrayMember({type: 'object', fields: [defineField({name: 'alt', type: 'string'})]})],
            }),
            defineField({
              name: 'tour', title: 'Tour labels', type: 'array',
              of: [defineArrayMember({type: 'object', fields: [defineField({name: 'name', title: 'Name', type: 'string'})]})],
            }),
            defineField({name: 'about', title: 'About this apartment', type: 'array', of: [defineArrayMember({type: 'block'})]}),
            defineField({
              name: 'space',
              title: 'The space',
              type: 'array',
              of: [
                defineArrayMember({
                  type: 'object',
                  fields: [
                    defineField({name: 'key', title: 'Key', type: 'string'}),
                    defineField({name: 'title', title: 'Title', type: 'string'}),
                    defineField({name: 'desc', title: 'Description', type: 'string'}),
                  ],
                }),
              ],
            }),
            defineField({
              name: 'termsOverride',
              title: 'House rules',
              type: 'array',
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
            defineField({
              name: 'amenitiesOverride',
              title: 'Amenities',
              type: 'object',
              fields: [
                defineField({name: 'inside', title: 'Inside', type: 'array', of: [defineArrayMember({type: 'object', fields: [defineField({name: 'label', type: 'string'}), defineField({name: 'included', type: 'boolean'})]})]}),
                defineField({name: 'building', title: 'Building & connectivity', type: 'array', of: [defineArrayMember({type: 'object', fields: [defineField({name: 'label', type: 'string'}), defineField({name: 'included', type: 'boolean'})]})]}),
              ],
            }),
          ],
          preview: {
            select: {title: 'locale', subtitle: 'tagline'},
            prepare: ({title, subtitle}) => ({title: String(title ?? '').toUpperCase(), subtitle}),
          },
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

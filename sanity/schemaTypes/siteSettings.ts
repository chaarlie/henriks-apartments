import {defineType, defineField, defineArrayMember} from 'sanity'

/**
 * Site settings — SINGLETON. Global property + contact info and the numbers the
 * booking maths needs. Shared everywhere; never duplicated on a unit.
 */
export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Property details (shared)',
  type: 'document',
  groups: [
    {name: 'general', title: 'General', default: true},
    {name: 'pricing', title: 'Pricing'},
    {name: 'amenities', title: 'Amenities'},
    {name: 'seo', title: 'SEO'},
  ],
  fields: [
    defineField({name: 'propertyName', title: 'Property name', type: 'string', group: 'general'}),
    defineField({name: 'city', title: 'City', type: 'string', group: 'general'}),
    defineField({name: 'region', title: 'Region', type: 'string', group: 'general'}),
    defineField({name: 'whatsappNumber', title: 'WhatsApp number', type: 'string', group: 'general'}),

    // "Who you're renting from" — the landing trust section.
    defineField({name: 'languages', title: 'Languages Henrik speaks', type: 'array', group: 'general', of: [defineArrayMember({type: 'string'})], options: {layout: 'tags'}, description: 'Full names, e.g. "English", "Finnish".'}),
    defineField({name: 'ownerSince', title: 'Owner since', type: 'string', group: 'general', description: 'Year he took over the apartments, e.g. "2026".'}),
    defineField({name: 'replyTime', title: 'Typical WhatsApp reply', type: 'string', group: 'general', description: 'e.g. "< 1 h"'}),
    defineField({name: 'hostNote', title: 'About Henrik', type: 'text', rows: 5, group: 'general', description: 'The paragraph in the "Who you’re renting from" section.'}),

    defineField({name: 'checkIn', title: 'Check-in from', type: 'string', group: 'general', description: 'e.g. "3:00 PM"'}),
    defineField({name: 'checkOut', title: 'Check-out by', type: 'string', group: 'general', description: 'e.g. "12:00 PM"'}),
    defineField({name: 'stayNote', title: 'Arrival note', type: 'text', rows: 3, group: 'general', description: 'The friendly line under the times on every apartment page.'}),

    defineField({name: 'fxRate', title: 'DOP per 1 USD', type: 'number', group: 'pricing'}),
    defineField({
      name: 'internetMbps',
      title: 'Internet speed (Mbps)',
      type: 'number',
      group: 'pricing',
      description:
        'The building fibre’s download speed. Printed in the rent-includes lines and the cost breakdown, in both languages — one number, so the figure cannot drift between the homepage and an apartment page the way it had.',
      validation: (r) => r.positive().integer(),
    }),
    defineField({
      name: 'fxRateAsOf',
      title: 'Rate checked on',
      type: 'date',
      group: 'pricing',
      description: 'Shown next to peso prices. The /admin app sets it whenever the rate changes.',
    }),
    defineField({name: 'powerBaseUsd', title: 'Metered power estimate (USD/mo)', type: 'number', group: 'pricing'}),
    defineField({
      name: 'discounts',
      title: 'Length-of-stay discounts',
      type: 'array',
      group: 'pricing',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({name: 'months', title: 'Months', type: 'number'}),
            defineField({name: 'pct', title: 'Percent off', type: 'number', description: '0.05 = 5%'}),
          ],
          preview: {
            select: {m: 'months', p: 'pct'},
            prepare: ({m, p}) => ({title: `${m}+ months`, subtitle: `${Math.round((p ?? 0) * 100)}% off`}),
          },
        }),
      ],
    }),

    // Landing "Amenities across the property" tiles — property-wide, shared.
    defineField({
      name: 'propertyAmenities',
      title: 'Property amenity tiles',
      type: 'array',
      group: 'amenities',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({name: 'icon', title: 'Icon', type: 'string'}),
            defineField({name: 'title', title: 'Title', type: 'string'}),
            defineField({name: 'desc', title: 'Description', type: 'text', rows: 2}),
          ],
          preview: {select: {title: 'title', subtitle: 'desc'}},
        }),
      ],
    }),

    /*
      Landing "Beyond your apartment" band — the shared spaces.

      Property-wide, so it lives here rather than on a unit: the pool is the
      same pool whichever apartment you book. `kind` drives the filter chips,
      and is a fixed list because a free-text value would silently fall out of
      every chip and leave the photo unreachable.
    */
    defineField({
      name: 'commonAreas',
      title: 'Common area photos',
      type: 'array',
      group: 'amenities',
      description: 'The pool, lounge, gym and grounds. Shown high on the landing page.',
      of: [
        defineArrayMember({
          type: 'image',
          options: {hotspot: true},
          fields: [
            defineField({name: 'label', title: 'Area', type: 'string', description: 'Short name over the photo, e.g. "Sun deck".'}),
            defineField({name: 'title', title: 'Caption', type: 'string', description: 'The line under it, e.g. "A spot in the sun".'}),
            defineField({
              name: 'kind',
              title: 'Kind',
              type: 'string',
              initialValue: 'pool',
              options: {list: [
                {title: 'Pool', value: 'pool'},
                {title: 'Lounge', value: 'lounge'},
                {title: 'Gym', value: 'gym'},
                {title: 'Grounds', value: 'grounds'},
              ]},
            }),
            defineField({name: 'alt', title: 'Alt text', type: 'string', description: 'What the photo shows, for screen readers and Google.'}),
          ],
          preview: {select: {title: 'title', subtitle: 'label', media: 'asset'}},
        }),
      ],
    }),

    defineField({
      name: 'seo',
      title: 'SEO defaults',
      type: 'object',
      group: 'seo',
      fields: [
        defineField({name: 'title', title: 'Title', type: 'string'}),
        defineField({name: 'description', title: 'Description', type: 'text', rows: 3}),
      ],
    }),
    /*
      Translations — see hero.ts. Only prose is here: the WhatsApp number, the
      FX rate, the discounts and the check-in times are the same fact in every
      language, so there is exactly one of each.
    */
    defineField({
      name: 'i18n',
      title: 'Translations',
      type: 'array',
      group: 'general',
      description: 'Generated by the translation scripts. Edit to correct the wording.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'siteSettingsTranslation',
          fields: [
            defineField({name: 'locale', title: 'Language', type: 'string', readOnly: true}),
            defineField({name: 'sourceHash', title: 'Source fingerprint', type: 'string', readOnly: true}),
            defineField({name: 'sourceRev', title: 'Translated from revision', type: 'string', readOnly: true}),
            defineField({
              name: 'machine',
              title: 'Awaiting review',
              type: 'boolean',
              readOnly: true,
              description:
                'Written by the translation scripts and not yet read by a person. Saving the document in /admin clears it.',
            }),
            defineField({name: 'hostNote', title: 'About Henrik', type: 'text', rows: 5}),
            defineField({name: 'stayNote', title: 'Arrival note', type: 'text', rows: 3}),
            defineField({
              name: 'propertyAmenities',
              title: 'Property amenity tiles',
              type: 'array',
              of: [
                defineArrayMember({
                  type: 'object',
                  fields: [
                    defineField({name: 'title', title: 'Title', type: 'string'}),
                    defineField({name: 'desc', title: 'Description', type: 'text', rows: 2}),
                  ],
                }),
              ],
            }),
            defineField({
              name: 'seo',
              title: 'SEO defaults',
              type: 'object',
              fields: [
                defineField({name: 'title', title: 'Title', type: 'string'}),
                defineField({name: 'description', title: 'Description', type: 'text', rows: 3}),
              ],
            }),
          ],
          preview: {select: {title: 'locale', subtitle: 'hostNote'}},
        }),
      ],
    }),
  ],
  preview: {prepare: () => ({title: 'Property details'})},
})

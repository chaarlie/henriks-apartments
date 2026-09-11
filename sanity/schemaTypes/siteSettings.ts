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

    defineField({name: 'checkIn', title: 'Check-in from', type: 'string', group: 'general', description: 'e.g. "3:00 PM"'}),
    defineField({name: 'checkOut', title: 'Check-out by', type: 'string', group: 'general', description: 'e.g. "12:00 PM"'}),
    defineField({name: 'stayNote', title: 'Arrival note', type: 'text', rows: 3, group: 'general', description: 'The friendly line under the times on every apartment page.'}),

    defineField({name: 'fxRate', title: 'DOP per 1 USD', type: 'number', group: 'pricing'}),
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
  ],
  preview: {prepare: () => ({title: 'Property details'})},
})

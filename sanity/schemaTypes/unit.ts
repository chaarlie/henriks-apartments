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
            defineField({name: 'name', title: 'Stop name', type: 'string'}),
            defineField({name: 'panorama', title: 'Panorama (equirectangular)', type: 'image'}),
            defineField({
              name: 'links',
              title: 'Hotspots',
              type: 'array',
              of: [
                defineArrayMember({
                  type: 'object',
                  fields: [
                    defineField({name: 'to', title: 'Links to stop', type: 'string'}),
                    defineField({name: 'yaw', title: 'Yaw', type: 'string', description: 'e.g. "30deg"'}),
                  ],
                }),
              ],
            }),
          ],
          preview: {select: {title: 'name'}},
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

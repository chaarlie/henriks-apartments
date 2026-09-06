import {defineType, defineField, defineArrayMember} from 'sanity'

/**
 * Location — SINGLETON. All units share one building, so the address and the
 * "getting around" distances are edited here once, not per apartment.
 */
export const location = defineType({
  name: 'location',
  title: 'Location (shared)',
  type: 'document',
  fields: [
    defineField({name: 'heading', title: 'Eyebrow', type: 'string', initialValue: 'Getting around'}),
    defineField({name: 'addressLine', title: 'Address line', type: 'string'}),
    defineField({
      name: 'distances',
      title: 'Nearby places',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({name: 'label', title: 'Place', type: 'string'}),
            defineField({name: 'value', title: 'Distance', type: 'string', description: 'e.g. "4 min walk"'}),
          ],
          preview: {select: {title: 'label', subtitle: 'value'}},
        }),
      ],
    }),
  ],
  preview: {prepare: () => ({title: 'Location', subtitle: 'Shared by all apartments'})},
})

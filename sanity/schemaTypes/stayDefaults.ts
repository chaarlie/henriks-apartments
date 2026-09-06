import {defineType, defineField, defineArrayMember} from 'sanity'

/** Reusable amenity row: a label + whether it's included. */
const amenityItem = defineArrayMember({
  type: 'object',
  name: 'amenityItem',
  fields: [
    defineField({name: 'label', title: 'Label', type: 'string'}),
    defineField({name: 'included', title: 'Included', type: 'boolean', initialValue: true}),
  ],
  preview: {
    select: {title: 'label', included: 'included'},
    prepare: ({title, included}) => ({title, subtitle: included ? 'Included' : 'Not included'}),
  },
})

/**
 * Stay defaults — SINGLETON. The house rules and the "what this place offers"
 * checklist are the same across all four units, so they live here once. A unit
 * only overrides them if it genuinely differs (see unit.ts → *Override fields).
 */
export const stayDefaults = defineType({
  name: 'stayDefaults',
  title: 'Stay defaults (shared)',
  type: 'document',
  fields: [
    defineField({
      name: 'amenities',
      title: 'What this place offers',
      type: 'object',
      fields: [
        defineField({name: 'inside', title: 'Inside', type: 'array', of: [amenityItem]}),
        defineField({name: 'building', title: 'Building & connectivity', type: 'array', of: [amenityItem]}),
      ],
    }),
    defineField({
      name: 'houseRules',
      title: 'Terms & house rules',
      type: 'array',
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
  ],
  preview: {prepare: () => ({title: 'Stay defaults', subtitle: 'Amenities & house rules — shared'})},
})

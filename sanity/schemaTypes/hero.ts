import {defineType, defineField, defineArrayMember} from 'sanity'

/** Hero — SINGLETON for the landing cover. */
export const hero = defineType({
  name: 'hero',
  title: 'Homepage / Hero (shared)',
  type: 'document',
  fields: [
    defineField({name: 'eyebrow', title: 'Eyebrow', type: 'string'}),
    defineField({name: 'headline', title: 'Headline', type: 'string'}),
    defineField({name: 'sub', title: 'Sub-copy', type: 'text', rows: 3}),
    defineField({name: 'videoId', title: 'Walkthrough video (YouTube ID)', type: 'string'}),
    defineField({name: 'background', title: 'Background image', type: 'image', options: {hotspot: true}, fields: [defineField({name: 'alt', type: 'string', title: 'Alt text'})]}),
    defineField({
      name: 'stats',
      title: 'Stat cards',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({name: 'value', title: 'Value', type: 'string'}),
            defineField({name: 'label', title: 'Label', type: 'string'}),
          ],
          preview: {select: {title: 'value', subtitle: 'label'}},
        }),
      ],
    }),
  ],
  preview: {prepare: () => ({title: 'Homepage / Hero'})},
})

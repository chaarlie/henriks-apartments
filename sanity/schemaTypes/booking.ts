import {defineType, defineField} from 'sanity'

/**
 * Booking — a Henrik-only record of a blocked stay, optionally with the guest's
 * contact details so he can reach them later.
 *
 * PRIVACY: guest + note are never exposed on the public site. The calendar reads
 * `availabilityQuery` (see sanity/lib/queries.ts), which selects only the unit
 * slug and the dates — never `guest`/`note`. Keep this dataset private and read
 * it server-side with a token so these fields never reach the browser.
 */
export const booking = defineType({
  name: 'booking',
  title: 'Booking (manage in /admin)',
  readOnly: true,
  type: 'document',
  fields: [
    defineField({name: 'holdExpiresAt', title: 'Hold expires', type: 'datetime', readOnly: true}),
    defineField({name: 'notificationStatus', title: 'Owner email status', type: 'string', readOnly: true}),
    defineField({
      name: 'unit',
      title: 'Apartment',
      type: 'reference',
      to: [{type: 'unit'}],
      description: 'Leave empty for a whole-property closure (e.g. maintenance).',
    }),
    defineField({
      name: 'startDate',
      title: 'Check-in',
      type: 'date',
      options: {dateFormat: 'YYYY-MM-DD'},
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'endDate',
      title: 'Check-out',
      type: 'date',
      options: {dateFormat: 'YYYY-MM-DD'},
      validation: (r) =>
        r.required().custom((end, ctx) => {
          const start = (ctx.document as {startDate?: string} | undefined)?.startDate
          if (start && end && end <= start) return 'Check-out must be after check-in'
          return true
        }),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        layout: 'radio',
        list: [
          {title: 'Held (tentative)', value: 'held'},
          {title: 'Confirmed', value: 'confirmed'},
          {title: 'Cancelled', value: 'cancelled'},
        ],
      },
      initialValue: 'confirmed',
    }),

    // ── Private: guest contact, for Henrik only ──────────────────────────────
    defineField({
      name: 'guest',
      title: 'Guest (private)',
      type: 'object',
      description: 'Optional. Only visible in the Studio — never published to the site.',
      options: {collapsible: true, collapsed: false},
      fields: [
        defineField({name: 'name', title: 'Name', type: 'string'}),
        defineField({name: 'phone', title: 'Phone / WhatsApp', type: 'string'}),
        defineField({name: 'email', title: 'Email', type: 'string'}),
      ],
    }),
    defineField({
      name: 'note',
      title: 'Private note',
      type: 'text',
      rows: 3,
      description: 'Deposit paid, returning guest, etc. Henrik-only.',
    }),
    defineField({
      name: 'source',
      title: 'Source',
      type: 'string',
      options: {
        layout: 'radio',
        list: ['manual', 'web', 'airbnb', 'booking.com'],
      },
      initialValue: 'manual',
      description: '"web" = a hold requested by a guest from the public site.',
    }),
  ],

  preview: {
    select: {unit: 'unit.name', start: 'startDate', end: 'endDate', guest: 'guest.name', status: 'status'},
    prepare({unit, start, end, guest, status}) {
      return {
        title: `${unit ?? 'Whole property'} · ${start ?? '?'} → ${end ?? '?'}`,
        subtitle: [status, guest].filter(Boolean).join(' · '),
      }
    },
  },
  orderings: [
    {name: 'startAsc', title: 'Check-in ↑', by: [{field: 'startDate', direction: 'asc'}]},
  ],
})

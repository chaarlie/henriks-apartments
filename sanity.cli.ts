import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: '7x03o22u',
    dataset: 'production',
  },
  server: {
    /*
      3334, not Sanity's default 3333: the kitebarete Studio on this machine
      sits on 3333 more or less permanently, and `sanity dev` failing to bind is
      an unhelpful way to find that out.

      The only place the port is set — the npm script deliberately passes no
      --port flag, because a second copy of the number is how this drifts.
    */
    port: 3334,
  },
  typegen: {
    path: './sanity/**/*.{ts,tsx}',
    schema: './sanity/extract.json',
    generates: './sanity/types.ts',
  },
})

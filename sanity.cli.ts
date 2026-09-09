import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: '7x03o22u',
    dataset: 'production',
  },
  server: {
    port: 3333,
  },
  typegen: {
    path: './sanity/**/*.{ts,tsx}',
    schema: './sanity/extract.json',
    generates: './sanity/types.ts',
  },
})

import type { Config } from "jest";
import nextJest from "next/jest.js";

/*
  Two kinds of test live side by side, split by extension:

    *.test.ts   BACKEND — server actions, the Sanity adapter, availability,
                pricing. Runs in the default `node` environment.
    *.test.tsx  FRONT END — client components, via React Testing Library. Each
                one opens with an `@jest-environment jsdom` docblock.

  Per-file docblocks rather than Jest `projects`: it keeps one config, and the
  environment is declared in the file that needs it instead of being inferred
  from a glob somewhere else.

  What is NOT here is component tests for async Server Components — Jest does
  not support them (see the Next testing guide), so UnitContent, Trust, Footer
  and the pages themselves are e2e territory.

  `next/jest` supplies the SWC transform, so tests are TypeScript/TSX with the
  same `@/…` aliases the app uses and no separate babel config.
*/
const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  // Overridden per file by an `@jest-environment jsdom` docblock.
  testEnvironment: "node",
  coverageProvider: "v8",

  // Only this directory. scripts/i18n/lib.test.mjs is written against
  // `node:test`, whose `test` import would shadow Jest's global and register
  // its cases with the wrong runner — `npm test` runs it separately.
  testMatch: ["<rootDir>/__tests__/**/*.test.ts", "<rootDir>/__tests__/**/*.test.tsx"],

  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],

  moduleNameMapper: {
    /*
      `server-only` throws by design when pulled into a non-server bundle, which
      is exactly what a Jest module registry looks like. The Sanity adapter and
      the write client both import it, so it is stubbed out to an empty module —
      the guard protects the browser bundle, and there is no browser here.
    */
    "^server-only$": "<rootDir>/__mocks__/empty.ts",

    /*
      The `@/…` alias, spelled out even though next/jest already resolves it for
      `import`. It does NOT resolve it for `jest.mock()`, which is a separate
      resolver pass — mocking "@/sanity/lib/writeClient" failed with "Cannot
      find module" while importing the same path worked. Declaring it here makes
      both agree, so a test can mock a module by the same name the code imports
      it by, instead of counting ../ segments.
    */
    "^@/(.*)$": "<rootDir>/$1",
  },

  clearMocks: true,
};

export default createJestConfig(config);

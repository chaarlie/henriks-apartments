/*
  Stub for the `server-only` package.

  That module exists to BREAK the build if server code is imported into a client
  bundle. Jest's module registry trips the same guard, so it is mapped here (see
  jest.config.ts). Empty on purpose — there is no browser in these tests for the
  real one to protect.
*/
export {};

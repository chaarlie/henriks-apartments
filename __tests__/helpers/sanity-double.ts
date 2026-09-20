/**
 * A test double for the Sanity write client.
 *
 * `getWriteClient()` returns a real `SanityClient` that talks to the production
 * dataset over the network. Nothing in these tests may do that, so every suite
 * that touches a server action mocks `@/sanity/lib/writeClient` and hands back
 * one of these instead.
 *
 * It is a STUB for reads and a MOCK for writes, which is the distinction worth
 * keeping:
 *
 *   - `fetch` is a stub. Tests declare the answers a GROQ query should give
 *     ("this unit exists", "there are 2 clashing bookings"). Nothing is asserted
 *     about how it was called; it exists to put the code under test into a
 *     state.
 *   - `create` / `createOrReplace` / `delete` / `patch` are mocks. What matters
 *     is that they were called, with exactly what, and how often — a booking
 *     that silently fails to reach Sanity is the bug these tests exist to catch.
 *
 * Queries are matched loosely, by a substring of the GROQ, so a reformatted
 * query does not break a suite that only cares about which question was asked.
 */

export interface StubbedQuery {
  /** Substring that identifies the GROQ query, e.g. `'_type == "unit"'`. */
  match: string;
  /** What the client should resolve with when that query runs. */
  result: unknown;
}

export interface SanityDouble {
  fetch: jest.Mock;
  create: jest.Mock;
  createOrReplace: jest.Mock;
  delete: jest.Mock;
  patch: jest.Mock;
  /** Every `set()` payload committed through `patch()`, in order. */
  sets: Record<string, unknown>[];
  /** Every field list passed to `unset()`, in order. */
  unsets: string[][];
}

export function createSanityDouble(queries: StubbedQuery[] = []): SanityDouble {
  const sets: Record<string, unknown>[] = [];
  const unsets: string[][] = [];

  const fetch = jest.fn(async (groq: string) => {
    const hit = queries.find((q) => groq.includes(q.match));
    if (!hit) {
      // Louder than returning undefined: an unstubbed query means the code took
      // a path the test did not describe, and a silent null would usually
      // surface later as a confusing assertion failure somewhere else.
      throw new Error(
        `No stub for this query. Add one whose \`match\` appears in:\n${groq.trim()}`,
      );
    }
    return hit.result;
  });

  // A chainable patch builder, mirroring the real client's fluent API so the
  // code under test needs no knowledge that it is being tested.
  const patch = jest.fn(() => {
    const chain = {
      set(payload: Record<string, unknown>) {
        sets.push(payload);
        return chain;
      },
      unset(fields: string[]) {
        unsets.push(fields);
        return chain;
      },
      async commit() {
        return {};
      },
    };
    return chain;
  });

  return {
    fetch,
    create: jest.fn(async (doc: unknown) => doc),
    createOrReplace: jest.fn(async (doc: unknown) => doc),
    delete: jest.fn(async () => ({})),
    patch,
    sets,
    unsets,
  };
}

/**
 * Shared `test`/`expect` for behavioral E2E specs that require zero unexpected
 * console errors or failed requests.
 *
 * Every spec file in this phase (`routing.spec.ts`, `archive-search.spec.ts`,
 * `batch-ops.spec.ts`, `trigger.spec.ts`, `a11y.spec.ts`,
 * `permissions.spec.ts`) imports `test`/`expect` from HERE instead of
 * `@playwright/test` directly. The `consoleGuard` fixture below is `auto:
 * true` (it runs for every test in those files whether or not the test
 * destructures it), attaches `page.on('console')` / `page.on('pageerror')` /
 * `page.on('requestfailed')` listeners before the test body runs, and — in
 * its teardown (the code after `await use(...)`, which Playwright runs once
 * the test body has finished) — fails the test if anything was captured that
 * the test didn't explicitly allow-list.
 *
 * A test that deliberately drives a failing request/console error (e.g. the
 * 5xx retry scenario, or a Trigger network-error scenario) MUST allow-list it
 * explicitly via `consoleGuard.allowFailedRequest(...)` /
 * `consoleGuard.allowConsoleError(...)`: the invariant is not "no errors ever"
 * but "no unexpected errors."
 *
 * Deliberately not applied to `e2e/responsive-overflow.spec.ts`, whose focus
 * is layout measurement rather than behavioral request assertions.
 */
import { test as base, expect } from '@playwright/test';

export type Matcher = string | RegExp;

function matches(value: string, matchers: readonly Matcher[]): boolean {
  return matchers.some((matcher) =>
    typeof matcher === 'string' ? value.includes(matcher) : matcher.test(value)
  );
}

type ConsoleGuard = {
  /** Allow a console `error`/`pageerror` whose text/stack matches `matcher`. */
  allowConsoleError: (matcher: Matcher) => void;
  /** Allow a `requestfailed` event whose `"METHOD URL — errorText"` summary matches `matcher`. */
  allowFailedRequest: (matcher: Matcher) => void;
};

type Fixtures = {
  consoleGuard: ConsoleGuard;
};

export const test = base.extend<Fixtures>({
  consoleGuard: [
    async ({ page }, use) => {
      const allowedErrors: Matcher[] = [];
      const allowedFailedRequests: Matcher[] = [];
      const seenErrors: string[] = [];
      const seenFailedRequests: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          seenErrors.push(msg.text());
        }
      });
      page.on('pageerror', (err) => {
        seenErrors.push(err.stack ?? String(err));
      });
      page.on('requestfailed', (request) => {
        const failure = request.failure();
        seenFailedRequests.push(
          `${request.method()} ${request.url()} — ${failure?.errorText ?? 'unknown failure'}`
        );
      });

      await use({
        allowConsoleError: (matcher) => allowedErrors.push(matcher),
        allowFailedRequest: (matcher) => allowedFailedRequests.push(matcher),
      });

      const unexpectedErrors = seenErrors.filter(
        (text) => !matches(text, allowedErrors)
      );
      const unexpectedFailedRequests = seenFailedRequests.filter(
        (text) => !matches(text, allowedFailedRequests)
      );

      const problems: string[] = [];
      if (unexpectedErrors.length > 0) {
        problems.push(
          `Unexpected console error(s):\n${unexpectedErrors.map((e) => `  - ${e}`).join('\n')}`
        );
      }
      if (unexpectedFailedRequests.length > 0) {
        problems.push(
          `Unexpected failed request(s):\n${unexpectedFailedRequests.map((e) => `  - ${e}`).join('\n')}`
        );
      }

      if (problems.length > 0) {
        throw new Error(
          `[console-guard] ${problems.join('\n\n')}\n\nIf this failure is EXPECTED for this test (e.g. a deliberate 5xx/offline scenario), call consoleGuard.allowConsoleError(...)/allowFailedRequest(...) with a matcher for it.`
        );
      }
    },
    { auto: true },
  ],
});

export { expect };

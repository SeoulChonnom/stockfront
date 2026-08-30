/**
 * Auto-fails behavioral E2E tests on unexpected console or request failures.
 * Tests that deliberately trigger failures must allow-list them explicitly.
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

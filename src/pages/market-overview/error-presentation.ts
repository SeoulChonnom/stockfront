import { ApiError } from '@/lib/api/client';
import type { Audience } from '@/lib/audience-copy';
import {
  errorCodeCopy,
  marketNotFoundCopy,
  rawErrorMessageCopy,
  unknownErrorMessageCopy,
} from '@/lib/audience-copy';

/**
 * Maps a query error into the scoped, region-local presentation used for
 * Latest/Archive Detail's FAILED/5xx/offline/401/429/malformed
 * equivalence classes. The 429 message explicitly asks for a manual retry
 * because this client does not schedule automatic retries. Archive 404 uses
 * a dedicated no-snapshot state instead of the generic retry presentation.
 *
 * `ApiError.status` (from `src/lib/api/client.ts`) is `0` for a network
 * failure (no response at all) and the real HTTP status otherwise, which is
 * what lets this module tell offline/401/429/5xx/other apart without any
 * new prop being threaded down from `app-page-content.tsx` (out of this
 * agent's file-ownership scope — see the report for that constraint).
 *
 * `code`/`message` are audience-gated via `audience-copy.ts`: regular users
 * never see the raw English badge code or backend/client `error.message`
 * text, only operators do (see `errorCodeCopy`/`rawErrorMessageCopy`/
 * `unknownErrorMessageCopy`/`marketNotFoundCopy`).
 */

export type FetchErrorPresentation = {
  code: string | null;
  title: string;
  message: string;
  actionLabel: string;
  /** Archive Detail only: routes to the 404 state instead of a retry-styled alert. */
  isNotFound: boolean;
  /** The generic action is a real retry; some statuses navigate elsewhere instead. */
  actionKind: 'retry' | 'archive-search' | 'ops' | 'reload';
};

export function buildFetchErrorPresentation(
  error: Error,
  audience: Audience
): FetchErrorPresentation {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return {
        code: errorCodeCopy(audience, '404 · PAGE_NOT_FOUND'),
        title: '해당 날짜의 스냅샷이 없습니다',
        message: marketNotFoundCopy(audience),
        actionLabel: '아카이브에서 찾기',
        isNotFound: true,
        actionKind: 'archive-search',
      };
    }

    if (error.status === 401) {
      return {
        code: errorCodeCopy(audience, '401 · SESSION_EXPIRED'),
        title: '세션이 만료됐습니다',
        message: '다시 로그인하면 마지막으로 보던 화면으로 돌아옵니다.',
        actionLabel: '다시 로그인',
        isNotFound: false,
        actionKind: 'reload',
      };
    }

    if (error.status === 429) {
      return {
        code: errorCodeCopy(audience, '429 · RATE_LIMITED'),
        title: '요청이 너무 많습니다',
        message: '잠시 기다린 뒤 다시 시도해 주세요.',
        actionLabel: '지금 다시 시도',
        isNotFound: false,
        actionKind: 'retry',
      };
    }

    if (error.status === 0) {
      return {
        code: errorCodeCopy(audience, 'NETWORK_ERROR'),
        title: '네트워크에 연결할 수 없습니다',
        message:
          '연결을 확인한 뒤 다시 시도해 주세요. 마지막으로 불러온 내용은 아래에 그대로 유지됩니다.',
        actionLabel: '다시 시도',
        isNotFound: false,
        actionKind: 'retry',
      };
    }

    if (error.status >= 500) {
      return {
        code: errorCodeCopy(audience, `${error.status} · INTERNAL_ERROR`),
        title: '데이터를 불러오지 못했습니다',
        message:
          '서버가 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
        actionLabel: '다시 시도',
        isNotFound: false,
        actionKind: 'retry',
      };
    }

    // 200-with-thrown (e.g. `client.ts`'s "no data payload" / envelope
    // shape errors) surfaces here — this is the closest analogue this repo
    // has to the malformed-response class; the mapper itself
    // is defensive about a missing `markets` array (see report), so a
    // genuinely malformed *envelope* is what actually reaches this branch.
    return {
      code: errorCodeCopy(audience, `${error.status} · MALFORMED_RESPONSE`),
      title: '응답 형식이 올바르지 않습니다',
      message: rawErrorMessageCopy(audience, error.message),
      actionLabel: '배치 상태 열기',
      isNotFound: false,
      actionKind: 'ops',
    };
  }

  return {
    code: errorCodeCopy(audience, '오류'),
    title: '데이터를 불러오지 못했습니다',
    message: unknownErrorMessageCopy(audience, error.message),
    actionLabel: '다시 시도',
    isNotFound: false,
    actionKind: 'retry',
  };
}

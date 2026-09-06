import { ApiError } from '@/lib/api/client';
import { isRecord } from '@/lib/utils';

export type RetryErrorView = {
  code: string;
  message: string;
  /** `0` marks a transport failure that never reached the backend. */
  status: number;
};

type RetryErrorCopy = {
  conflictCode: string;
  fallbackCode: string;
  conflict: string;
  forbidden: string;
  fallback: string;
};

/** Backends nest the envelope error under `error`; older payloads keep it flat. */
function readErrorField(
  body: unknown,
  field: 'code' | 'message'
): string | null {
  if (!isRecord(body)) {
    return null;
  }

  const nested = isRecord(body.error) ? body.error[field] : undefined;

  if (typeof nested === 'string') {
    return nested;
  }

  const flat = body[field];

  return typeof flat === 'string' ? flat : null;
}

function toRetryErrorView(
  error: unknown,
  copy: RetryErrorCopy
): RetryErrorView {
  if (!(error instanceof ApiError)) {
    return {
      code: 'NETWORK_ERROR',
      message: '네트워크에 연결할 수 없습니다.',
      status: 0,
    };
  }

  const code =
    readErrorField(error.body, 'code') ??
    (error.status === 409 ? copy.conflictCode : copy.fallbackCode);

  return {
    code,
    // The backend owns the precise reason; the local copy is only a fallback.
    message:
      readErrorField(error.body, 'message') ??
      (error.status === 409
        ? copy.conflict
        : error.status === 403
          ? copy.forbidden
          : error.status === 0
            ? '네트워크에 연결할 수 없습니다.'
            : copy.fallback),
    status: error.status,
  };
}

export function toAiRetryErrorView(error: unknown): RetryErrorView {
  return toRetryErrorView(error, {
    conflictCode: 'AI_RETRY_IN_PROGRESS',
    fallbackCode: 'AI_RETRY_ERROR',
    conflict: 'AI 요약 재시도가 이미 진행 중입니다.',
    forbidden: 'AI 요약 재시도 권한이 없습니다.',
    fallback: 'AI 요약 재시도 요청을 처리하지 못했습니다.',
  });
}

export function toSnapshotRetryErrorView(
  error: unknown,
  businessDate: string
): RetryErrorView {
  return toRetryErrorView(error, {
    conflictCode: 'BATCH_ALREADY_RUNNING',
    fallbackCode: 'INTERNAL_BATCH_ERROR',
    conflict: `${businessDate} 스냅샷 생성 배치가 이미 실행 중입니다.`,
    forbidden: '스냅샷 생성 재시도 권한이 없습니다.',
    fallback: '스냅샷 생성 재시도 요청을 처리하지 못했습니다.',
  });
}

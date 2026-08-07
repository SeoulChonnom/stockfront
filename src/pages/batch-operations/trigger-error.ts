import { ApiError } from '@/lib/api/client';
import { isRecord } from '@/lib/utils';

export type TriggerErrorView = {
  httpStatus: number;
  code: string;
  message: string;
  /** 422 businessDate — the idle form should mark the date field invalid when this is true. */
  isFieldError: boolean;
  existingJobId: number | null;
};

function extractExistingJobId(body: unknown): number | null {
  if (!isRecord(body)) {
    return null;
  }

  const candidates = [
    body.existingJobId,
    body.existing_job_id,
    isRecord(body.error) ? body.error.existingJobId : undefined,
    isRecord(body.error) ? body.error.existing_job_id : undefined,
  ];

  const found = candidates.find(
    (value) => typeof value === 'number' && Number.isSafeInteger(value)
  );

  return typeof found === 'number' ? found : null;
}

function extractCode(body: unknown, fallback: string): string {
  if (isRecord(body)) {
    if (typeof body.code === 'string') {
      return body.code;
    }

    if (isRecord(body.error) && typeof body.error.code === 'string') {
      return body.error.code;
    }
  }

  return fallback;
}

export function toTriggerErrorView(
  error: unknown,
  businessDate: string
): TriggerErrorView {
  if (!(error instanceof ApiError)) {
    return {
      httpStatus: 0,
      code: 'NETWORK_ERROR',
      message: '네트워크에 연결할 수 없습니다.',
      isFieldError: false,
      existingJobId: null,
    };
  }

  const existingJobId = extractExistingJobId(error.body);

  if (error.status === 0) {
    return {
      httpStatus: 0,
      code: extractCode(error.body, 'NETWORK_ERROR'),
      message: '네트워크에 연결할 수 없습니다.',
      isFieldError: false,
      existingJobId,
    };
  }

  if (error.status === 409) {
    return {
      httpStatus: 409,
      code: extractCode(error.body, 'BATCH_ALREADY_RUNNING'),
      message: `${businessDate} 배치가 이미 실행 중입니다.`,
      isFieldError: false,
      existingJobId,
    };
  }

  if (error.status === 403) {
    return {
      httpStatus: 403,
      code: extractCode(error.body, 'FORBIDDEN'),
      message: '수동 실행 권한이 없습니다. 관리자(ADMIN) 권한이 필요합니다.',
      isFieldError: false,
      existingJobId,
    };
  }

  if (error.status === 422) {
    return {
      httpStatus: 422,
      code: extractCode(error.body, 'INVALID_BUSINESS_DATE'),
      message: '미래 날짜는 실행할 수 없습니다.',
      isFieldError: true,
      existingJobId,
    };
  }

  if (error.status === 429) {
    return {
      httpStatus: 429,
      code: extractCode(error.body, 'RATE_LIMITED'),
      message: '요청이 너무 많습니다. 60초 후 다시 시도해 주세요.',
      isFieldError: false,
      existingJobId,
    };
  }

  return {
    httpStatus: error.status,
    code: extractCode(error.body, 'INTERNAL_BATCH_ERROR'),
    message: '배치 실행 요청을 처리하지 못했습니다.',
    isFieldError: false,
    existingJobId,
  };
}

/** 권한별 문구를 모아 일반 사용자에게 내부 진단 정보를 노출하지 않는다. */
import type { MarketSnapshot } from '@/lib/view-models';

export type Audience = { canViewOps: boolean };

export function serviceTagline(audience: Audience): string {
  return audience.canViewOps
    ? '일간 시장 브리프 · 운영 콘솔'
    : 'AI 시장 브리프';
}

/** 시장 섹션이 없으면 아래 데이터를 안내하지 않고 빈 상태에 설명을 맡긴다. */
export function noHeadlineCopy(
  audience: Audience,
  context: { hasMarketSections: boolean }
): string {
  if (!context.hasMarketSections) {
    return '이 날짜의 브리프가 없습니다';
  }

  return audience.canViewOps
    ? '글로벌 헤드라인이 생성되지 않았습니다. AI 요약 단계가 실패했을 수 있습니다 — 아래 상태와 배치 로그에서 원인을 확인하세요.'
    : '오늘의 헤드라인이 아직 준비되지 않았습니다. 아래 시장별 지수와 이슈는 그대로 확인할 수 있습니다.';
}

export function noNarrativeCopy(audience: Audience): string {
  return audience.canViewOps
    ? '이 시장의 요약이 생성되지 않았습니다. 수집된 기사가 임계값에 미달했거나 AI 요약이 실패한 경우입니다. 지수와 원문은 아래에서 그대로 확인할 수 있습니다.'
    : '이 시장의 요약이 아직 준비되지 않았습니다. 지수와 원문 기사는 아래에서 확인할 수 있습니다.';
}

export function noIndexDataCopy(audience: Audience): string {
  return audience.canViewOps
    ? '지수 데이터가 수집되지 않았습니다. provider 응답 실패 시 부분 실패로 처리되며, 재수집은 배치 운영에서 같은 기준일로 실행합니다.'
    : '지수 데이터가 없습니다.';
}

export function partialBannerCopy(audience: Audience): {
  title: string;
  body: string;
} {
  if (audience.canViewOps) {
    return {
      title: '이 브리프는 일부 데이터가 누락된 상태로 생성됐습니다',
      body: '누락된 항목은 아래 해당 섹션에도 표시됩니다. 재생성이 필요하면 배치 운영에서 같은 기준일로 다시 실행할 수 있습니다.',
    };
  }

  return {
    title: '일부 데이터가 누락된 브리프입니다',
    body: '일부 데이터가 누락되어 이 브리프는 참고용으로 제공됩니다. 누락된 시장과 기준일을 확인해 주세요.',
  };
}

/** 원본 오류 코드는 운영자에게만 노출한다. */
export function errorCodeCopy(audience: Audience, code: string): string | null {
  return audience.canViewOps ? code : null;
}

/** 원본 오류 메시지는 운영자에게만 노출한다. */
export function rawErrorMessageCopy(
  audience: Audience,
  rawMessage: string
): string {
  return audience.canViewOps
    ? rawMessage
    : '요청을 처리하는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
}

export function unknownErrorMessageCopy(
  audience: Audience,
  rawMessage: string
): string {
  return audience.canViewOps
    ? rawMessage || '알 수 없는 오류가 발생했습니다.'
    : '알 수 없는 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
}

export function marketNotFoundCopy(audience: Audience): string {
  return audience.canViewOps
    ? '배치가 실행되지 않았거나 실패한 날짜일 수 있습니다.'
    : '해당 날짜의 브리프가 아직 생성되지 않았습니다.';
}

/** 빈 시장 상태의 배치·수집 용어는 운영자에게만 노출한다. */
export function emptyMarketsReasonCopy(
  audience: Audience,
  status: MarketSnapshot['status']
): string {
  if (status === 'failed') {
    return audience.canViewOps
      ? '이 날짜의 배치가 뉴스 수집 단계에서 실패해 시장 섹션이 생성되지 않았습니다.'
      : '이 날짜의 브리프가 생성되지 못했습니다.';
  }

  return audience.canViewOps
    ? '배치는 완료됐지만 시장 섹션이 비어 있습니다. 수집 결과가 0건이었을 수 있습니다.'
    : '이 날짜에 표시할 시장 데이터가 없습니다.';
}

/** 빈 클러스터의 파이프라인 원인은 운영자에게만 노출한다. */
export function emptyClustersCopy(audience: Audience): string {
  return audience.canViewOps
    ? '묶인 이슈가 없습니다. 수집 기사 수가 부족해 클러스터가 만들어지지 않은 경우이며, 원문 목록이 있으면 아래에서 직접 확인할 수 있습니다.'
    : '묶인 이슈가 없습니다. 원문 목록이 있으면 아래에서 직접 확인할 수 있습니다.';
}

/** 누락 상세의 원문은 운영자에게만 노출하고 일반 사용자에게는 중립화한다. */
export function missingDataDetailCopy(
  audience: Audience,
  rawMessage: string
): string {
  return audience.canViewOps
    ? rawMessage
    : '이 시장의 데이터 일부가 누락되었습니다.';
}

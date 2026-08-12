/**
 * 권한별 문구 선택. 컴포넌트마다 분기를 흩뿌리지 않기 위해 한 곳에 모은다.
 * 일반 사용자에게는 내부 파이프라인 용어와 접근할 수 없는 복구 수단을 노출하지 않는다.
 */

export type Audience = { canViewOps: boolean };

export function serviceTagline(audience: Audience): string {
  return audience.canViewOps
    ? '일간 시장 브리프 · 운영 콘솔'
    : 'AI 시장 브리프';
}

export function noHeadlineCopy(audience: Audience): string {
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

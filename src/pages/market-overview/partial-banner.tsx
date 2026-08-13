import { Button } from '@/components/ui/button';
import {
  DescriptionList,
  DescriptionListItem,
} from '@/components/ui/description-list';
import { missingDataDetailCopy, partialBannerCopy } from '@/lib/audience-copy';
import { navigate } from '@/lib/router';
import type { MarketSnapshot } from '@/lib/view-models';

/**
 * 데이터 누락 경고. 일반 사용자에게는 참고용 안내와 사실 요약만 보여주고,
 * 접근할 수 없는 배치 재실행 경로는 운영자에게만 노출한다.
 */

type MissingDetail = {
  marketLabel: string;
  message: string;
  sourceDate: string | null;
  lastUpdatedAt: string | null;
};

function collectMissingDetails(snapshot: MarketSnapshot): MissingDetail[] {
  return snapshot.markets
    .filter((market) => Boolean(market.metadata?.partialMessage))
    .map((market) => ({
      marketLabel: market.label,
      message: market.metadata?.partialMessage ?? '',
      sourceDate: market.metadata?.sourceDate ?? null,
      lastUpdatedAt: market.metadata?.lastUpdatedAt ?? null,
    }));
}

export function PartialBanner({
  snapshot,
  canViewOps,
}: {
  snapshot: MarketSnapshot;
  canViewOps: boolean;
}) {
  const shouldShow =
    snapshot.status === 'partial' || Boolean(snapshot.partialMessage);

  if (!shouldShow) {
    return null;
  }

  const copy = partialBannerCopy({ canViewOps });
  const details = collectMissingDetails(snapshot);

  return (
    <section
      aria-labelledby='partial-banner-heading'
      className='rounded-[var(--r-lg)] border border-[color:var(--warning-line)] border-l-4 border-l-[color:var(--warning)] bg-[color:var(--surface)] px-[18px] py-4'
    >
      <div className='flex items-start gap-2'>
        <span
          aria-hidden='true'
          className='font-bold text-[color:var(--warning)]'
        >
          !
        </span>
        <div className='min-w-0 flex-1'>
          <h2
            className='m-0 mb-1.5 text-card-heading font-semibold'
            id='partial-banner-heading'
          >
            {copy.title}
          </h2>
          <p className='m-0 mb-3 text-body text-fg-soft'>{copy.body}</p>

          {snapshot.issues.length > 0 ? (
            // 서버 `message`는 provider endpoint·SQL·스택 트레이스를 담지
            // 않도록 보장되어(A-1-4) 모든 사용자에게 그대로 노출해도 안전하다.
            // `KEY_POINTS_GENERATION_FAILED`처럼 코드별로 구체적인 문구가
            // 오기 때문에, 이 목록만으로 "핵심 포인트만 실패"와 "요약 전반
            // 실패"(`AI_SUMMARY_FALLBACK`)가 서로 다른 문장으로 구분된다 —
            // FE가 코드별 안내문을 별도로 합성하지 않는다.
            <ul className='m-0 mb-3 flex list-none flex-col gap-1 p-0'>
              {snapshot.issues.map((issue) => (
                <li
                  className='text-body text-fg-soft'
                  key={`${issue.category}-${issue.code}`}
                >
                  {issue.message}
                </li>
              ))}
            </ul>
          ) : null}

          {canViewOps && snapshot.partialMessage ? (
            <p className='wrap-anywhere m-0 mb-3 text-body text-fg-soft'>
              {snapshot.partialMessage}
            </p>
          ) : null}

          {details.length > 0 ? (
            <details className='mb-3'>
              <summary className='flex min-h-tap cursor-pointer items-center text-body font-semibold text-fg'>
                상세 정보
              </summary>
              <div className='flex flex-col gap-3 pt-2'>
                {details.map((detail) => (
                  <DescriptionList key={detail.marketLabel}>
                    <DescriptionListItem
                      label='영향받은 시장'
                      value={detail.marketLabel}
                    />
                    <DescriptionListItem
                      label='누락된 데이터'
                      value={missingDataDetailCopy(
                        { canViewOps },
                        detail.message
                      )}
                    />
                    <DescriptionListItem
                      label='사용된 데이터 기준일'
                      value={detail.sourceDate ?? '확인되지 않음'}
                    />
                    <DescriptionListItem
                      label='마지막 갱신 시각'
                      value={detail.lastUpdatedAt ?? '확인되지 않음'}
                    />
                  </DescriptionList>
                ))}
              </div>
            </details>
          ) : null}

          {canViewOps ? (
            <Button
              onClick={() => navigate('/ops/batches')}
              type='button'
              variant='secondary'
            >
              배치 운영에서 원인 보기
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

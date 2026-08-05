import { useAnnounce } from '@/components/shell/use-announce';
import { Card } from '@/components/ui/card';
import {
  FilterBar,
  FilterDirtyBadge,
  FilterField,
} from '@/components/ui/filter-bar';
import { Input } from '@/components/ui/input';
import { useFilterDraft } from '@/components/ui/use-filter-draft';
import { cn } from '@/lib/utils';

import {
  type BatchFilterDraft,
  getBatchStatusOptions,
  getBatchStatusSummaryLabel,
  getBatchTypeOptions,
  getBatchTypeSummaryLabel,
  getDefaultBatchFilters,
  validateBatchFilters,
} from './filter-copy';

/**
 * `/ops/batches` 조회 조건 필터 카드 — design v2
 * `Market Brief v2.dc.html` 733~769행("조회 조건" 섹션 마크업) +
 * 2059~2103행(적용/검증/초기화 동작).
 *
 * `ArchiveSearchFilters`(`src/pages/archive-search/archive-search-filters.tsx`)
 * 와 동일한 draft/applied 분리(`useFilterDraft`) + `FilterBar`/`FilterField`/
 * `FilterDirtyBadge`/`Card`/`Input` 조합을 그대로 재사용한다. `FilterBar`의
 * 버튼 라벨은 기본값이 '필터 적용'/'초기화'인데, 디자인은 '조회'/'초기화' —
 * `applyLabel` prop으로 그대로 맞출 수 있어 공용 컴포넌트를 건드릴 필요가
 * 없었다.
 *
 * 픽셀 정합 사이클(visual-audit `ops-batches` 필터 target들): 733~769행 카드는
 * 4필드(기준일 시작/종료/실행 상태/배치 타입)가 `grid-template-columns:
 * repeat(auto-fit,minmax(168px,1fr))`인 반응형 그리드인데 공용 `FilterBar`는
 * 고정 `grid-cols-1 sm:grid-cols-3`다. `FilterBar`/`FilterField`
 * (`src/components/ui/filter-bar.tsx`)는 공용 컴포넌트라 이 작업 범위에서
 * 수정 금지이고, 그 내부 grid/label 엘리먼트에는 override 가능한 className
 * prop이 없다 — 대신 `FilterBar`의 `className`이 `cn()`으로 `<form>` 자신에
 * 병합되는 점을 이용해, Tailwind 임의 값 디센던트 셀렉터
 * (`[&>div:first-child]:...`, `[&_label]:...`)로 `<form>`의 CSS 규칙이 그
 * 자식 grid/label에 닿게 한다 — 이 규칙들은 클래스 1개 + 엘리먼트
 * 셀렉터라서, FilterBar 내부의 단일 클래스 유틸리티보다 시디시(specificity)가
 * 항상 높아 순서와 무관하게 이긴다(archive-search-filters.tsx가 `Input`
 * className을 override하는 것과 같은 "공용 컴포넌트는 prop으로만 건드린다"
 * 원칙의 연장이지 FilterBar 내부를 직접 고치는 게 아니다):
 *  - `[&>div:first-child]:grid-cols-[repeat(auto-fit,minmax(168px,1fr))]`
 *    — 733~769행의 반응형 4필드 그리드.
 *  - `[&>div:first-child]:items-start` — 같은 마크업의 `align-items:start`.
 *  - `[&_label]:mb-[5px]` — 각 필드 라벨-입력 간격(디자인 736/741/746/751행
 *    `gap:5px`인 flex column, `FilterField`는 `mb-1`(4px) margin 고정이라
 *    5px로 override). `display:flex`로 바꾸지 않은 이유는 `FilterField`가
 *    라벨 자체의 클래스도 고정이라 flex+gap으로 바꾸면 margin(4px)과
 *    gap(5px)이 이중으로 더해져 9px이 되기 때문 — margin만 5px로 맞추는
 *    쪽이 실제 렌더 간격을 정확히 재현한다. (`display`/`row-gap` computed
 *    style 자체는 여전히 block/normal로 남는 의도된 잔차.)
 *  - `gap-3.5` — `<form>` 자신의 `flex flex-col gap-3`(12px)를 12px로
 *    override하는 게 아니라 14px로: 763행 버튼 행의 `margin-top:14px`에
 *    대응. `Card`(아래)의 `gap-3`(12px)는 733~734행 헤더 행의
 *    `margin-bottom:12px`에 대응 — 디자인은 헤더→그리드 12px,
 *    그리드→버튼행 14px로 서로 다른 두 간격을 쓰는데, `Card`가 감싸는
 *    두 자식(헤더 행, `FilterBar`의 `<form>`) 사이 간격과 `<form>` 내부
 *    (그리드, 버튼 행) 간격이 정확히 그 둘로 나뉘어 각자 override할 수
 *    있었다.
 *
 * 에러 시 announce 문구("입력값을 확인해 주세요. …")와 조회 성공/초기화
 * announce는 Archive Search와 다른 이 화면 전용 문구라 `handleSubmit`/
 * `onReset`에서 별도로 처리한다.
 */
export function BatchFilters({
  applied,
  onApply,
  onReset,
}: {
  applied: BatchFilterDraft;
  onApply: (next: BatchFilterDraft) => void;
  onReset: () => void;
}) {
  const announce = useAnnounce();
  const { draft, errors, isDirty, apply, reset, getFieldProps } =
    useFilterDraft<BatchFilterDraft>({
      applied,
      defaultValues: getDefaultBatchFilters(),
      validate: validateBatchFilters,
      onApply,
      onReset: () => {
        onReset();
        announce('조회 조건을 기본값으로 초기화했습니다.');
      },
    });

  function handleSubmit() {
    // design v2 2082~2103행: 검증 실패 시 "입력값을 확인해 주세요. " 뒤에
    // 첫 번째 에러 메시지를 그대로 붙인다 — Archive Search의 "입력 오류
    // N건을 확인해 주세요." 카운트 문구와는 다른, 이 화면 전용 문구다.
    const validationErrors = validateBatchFilters(draft);
    const succeeded = apply();

    if (!succeeded) {
      const [firstMessage] = Object.values(validationErrors);
      announce(`입력값을 확인해 주세요. ${firstMessage}`);
    }
  }

  return (
    <section aria-labelledby='ops-filter-heading'>
      {/* design v2 733~734행: 헤더 행 ↔ 필드 그리드 간격은 12px
          (`margin-bottom:12px`) — Card의 자식 간 gap이 이 간격에 해당한다. */}
      <Card className='flex flex-col gap-3 px-[18px] py-4'>
        <div className='flex flex-wrap items-center gap-2.5'>
          <h2
            className='m-0 text-[14px] font-semibold text-[color:var(--text)]'
            id='ops-filter-heading'
          >
            조회 조건
          </h2>
          <span className='mono wrap-anywhere text-[11.5px] text-[color:var(--text-faint)]'>
            적용됨 · {applied.from} ~ {applied.to} ·{' '}
            {getBatchStatusSummaryLabel(applied.status)} ·{' '}
            {getBatchTypeSummaryLabel(applied.type)}
          </span>
          <FilterDirtyBadge isDirty={isDirty} />
        </div>

        <FilterBar
          applyLabel='조회'
          className='gap-3.5 [&_label]:mb-[5px] [&>div:first-child]:grid-cols-[repeat(auto-fit,minmax(168px,1fr))] [&>div:first-child]:items-start'
          onReset={reset}
          onSubmit={handleSubmit}
        >
          <FilterField error={errors.from} htmlFor='from' label='기준일 시작'>
            <Input
              className={cn(
                'mono rounded-[var(--r-md)] bg-[color:var(--surface)] px-3 py-0 text-[13.5px]',
                !errors.from && 'border-[color:var(--line-strong)]'
              )}
              invalid={Boolean(errors.from)}
              type='date'
              {...getFieldProps('from')}
            />
          </FilterField>
          <FilterField error={errors.to} htmlFor='to' label='기준일 종료'>
            <Input
              className={cn(
                'mono rounded-[var(--r-md)] bg-[color:var(--surface)] px-3 py-0 text-[13.5px]',
                !errors.to && 'border-[color:var(--line-strong)]'
              )}
              invalid={Boolean(errors.to)}
              type='date'
              {...getFieldProps('to')}
            />
          </FilterField>
          <FilterField htmlFor='status' label='실행 상태'>
            <select
              className='flex min-h-11 w-full rounded-[var(--r-md)] border border-[color:var(--line-strong)] bg-[color:var(--surface)] px-2.5 py-0 text-[13.5px] text-[color:var(--text)] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[color:color-mix(in_srgb,var(--primary)_45%,transparent)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_16%,transparent)]'
              {...getFieldProps('status')}
            >
              {getBatchStatusOptions().map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField htmlFor='type' label='배치 타입'>
            <select
              className='flex min-h-11 w-full rounded-[var(--r-md)] border border-[color:var(--line-strong)] bg-[color:var(--surface)] px-2.5 py-0 text-[13.5px] text-[color:var(--text)] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[color:color-mix(in_srgb,var(--primary)_45%,transparent)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_16%,transparent)]'
              {...getFieldProps('type')}
            >
              {getBatchTypeOptions().map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FilterField>
        </FilterBar>
      </Card>
    </section>
  );
}

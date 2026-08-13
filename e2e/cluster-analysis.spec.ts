import { expect, test } from './fixtures/console-guard';
import { installMockApi } from './fixtures/mock-api';

/**
 * B-2 구조화 클러스터 분석 + 문장 단위 근거·충돌
 * (docs/backend-requests-2026-08-12.md#A-3).
 *
 * The live server currently returns `analysisStatus: 'UNAVAILABLE'` for
 * every cluster (A-3 "현재 서버 동작"), so the `READY`/`PARTIAL`/`FOUND`
 * paths below can only be exercised through `mock-api.ts`'s `clusterMode`
 * fixtures, not the real backend — see that file's `InstallMockApiOptions`
 * doc comment.
 */

const CLUSTER_ID = '51f0d9a0-9fc5-4f15-a4f9-62856f128683';

test.describe('B-2 구조화 클러스터 분석', () => {
  test('READY: renders the server sections in order with the server-fixed titles', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.goto(`market/cluster/${CLUSTER_ID}`);

    const section = page.getByRole('region', { name: 'AI 심층 분석' });
    await expect(section.getByRole('heading', { level: 3 })).toHaveText([
      '발생 배경',
      '시장 영향',
      '향후 관전 포인트',
    ]);
  });

  test('analysisGeneratedAt 표시가 클러스터 lastUpdatedAt과 다르다', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.goto(`market/cluster/${CLUSTER_ID}`);

    const section = page.getByRole('region', { name: 'AI 심층 분석' });
    // Fixture: analysisGeneratedAt = 2026-07-27T13:20:00Z -> 2026-07-27
    // 22:20 KST; lastUpdatedAt = 2026-07-27T06:12:10 (naive KST) -> 06:12
    // KST. Distinct values, both from the true UTC-`Z` conversion path
    // (A-1-5) for the former.
    await expect(
      section.getByText(/생성 기준 2026-07-27 22:20 KST/)
    ).toBeVisible();
    await expect(page.getByText(/06:12/)).toBeVisible();
  });

  test('READY + FOUND: 상충 표시는 정보로 제시되고, 지지·충돌 기사가 시각적으로 구분된다', async ({
    page,
  }) => {
    await installMockApi(page, {
      scenario: 'ready',
      clusterMode: 'analysisFound',
    });
    await page.goto(`market/cluster/${CLUSTER_ID}`);

    const section = page.getByRole('region', { name: 'AI 심층 분석' });
    await expect(
      section.getByText('상충하는 보도가 있음').first()
    ).toBeVisible();
    await expect(
      section.getByText('기사별 외국인 순매매 방향이 다르게 보도됐습니다.')
    ).toBeVisible();
    await expect(section.getByText('지지 기사')).toBeVisible();
    await expect(section.getByText('상충 기사')).toBeVisible();
    // Informational, not an error surface.
    await expect(section.getByRole('alert')).toHaveCount(0);
  });

  test('근거 참조를 클릭하면 같은 화면의 기사 행으로 이동해 포커스된다', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.goto(`market/cluster/${CLUSTER_ID}`);

    const section = page.getByRole('region', { name: 'AI 심층 분석' });
    const citation = section
      .getByRole('button', { name: /근거 기사로 이동/ })
      .first();
    await citation.click();

    const focused = page.locator(':focus');
    await expect(focused).toHaveAttribute('id', /^cluster-article-/);
  });

  test('PARTIAL + INVALID_SOURCE_REFERENCE: 비차단 안내와 함께 남은 섹션이 정상 렌더된다', async ({
    page,
  }) => {
    await installMockApi(page, {
      scenario: 'ready',
      clusterMode: 'analysisPartialInvalidSource',
    });
    await page.goto(`market/cluster/${CLUSTER_ID}`);

    const section = page.getByRole('region', { name: 'AI 심층 분석' });
    await expect(
      section.getByText('일부 분석 문장의 근거 기사를 확인하지 못했습니다.')
    ).toBeVisible();
    await expect(
      section.getByRole('heading', { name: '발생 배경' })
    ).toBeVisible();
  });

  test('PARTIAL + CONFLICT_CHECK_FAILED: 충돌 정보가 정규화됐다는 비차단 안내가 뜬다', async ({
    page,
  }) => {
    await installMockApi(page, {
      scenario: 'ready',
      clusterMode: 'analysisPartialConflictFailed',
    });
    await page.goto(`market/cluster/${CLUSTER_ID}`);

    const section = page.getByRole('region', { name: 'AI 심층 분석' });
    await expect(
      section.getByText('일부 분석 문장의 충돌 근거를 확인하지 못했습니다.')
    ).toBeVisible();
    // NOT_CHECKED is never phrased as "충돌 없음".
    await expect(section.getByText(/충돌\s*없음/)).toHaveCount(0);
  });

  for (const [name, clusterMode] of [
    ['생성 실패', 'analysisUnavailableGenerationFailed'],
    ['빈 결과', 'analysisUnavailableEmptyResult'],
    ['전 문장 제거', 'analysisUnavailableAllRemoved'],
  ] as const) {
    test(`UNAVAILABLE(${name}): 단일 안내 상태만 뜨고 핵심 요약은 유지된다`, async ({
      page,
    }) => {
      await installMockApi(page, { scenario: 'ready', clusterMode });
      await page.goto(`market/cluster/${CLUSTER_ID}`);

      const section = page.getByRole('region', { name: 'AI 심층 분석' });
      // Exactly ONE guidance heading replaces the whole section area — not
      // four empty per-kind subheadings.
      await expect(section.getByRole('heading', { level: 3 })).toHaveCount(1);
      await expect(
        section.getByRole('heading', {
          level: 3,
          name: '심층 분석을 표시할 수 없습니다',
        })
      ).toBeVisible();
      await expect(page.getByText(/분석 중/)).toHaveCount(0);
      // summary.short/long stay visible even though the analysis area is
      // replaced by a single guidance state (A-3 "UNAVAILABLE 렌더 주의"). The
      // fixture's `long` text is built as `${short} 관련 기사 ...`, so an
      // exact match is required — a substring match would also hit `long`.
      await expect(
        page.getByText(
          '정책금리 경로에 대한 신중론이 재확인되며 성장주 중심으로 장중 등락이 확대됐습니다.',
          { exact: true }
        )
      ).toBeVisible();
    });
  }

  test('섹션 2개만 오는 경우: 온 것만 순서대로 렌더한다', async ({ page }) => {
    await installMockApi(page, {
      scenario: 'ready',
      clusterMode: 'analysisTwoSections',
    });
    await page.goto(`market/cluster/${CLUSTER_ID}`);

    const section = page.getByRole('region', { name: 'AI 심층 분석' });
    await expect(section.getByRole('heading', { level: 3 })).toHaveText([
      '발생 배경',
      '향후 관전 포인트',
    ]);
  });
});

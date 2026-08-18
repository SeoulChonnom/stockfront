import { useEffect } from 'react';

import type { AppRoute } from '../lib/app-state';

import {
  loadArchiveSearchPage,
  loadBatchOperationsPage,
  loadClusterDetailPage,
} from './route-chunks';

/**
 * 지금 화면에서 갈 수 있는 곳의 청크를 브라우저가 한가할 때 미리 받아 둔다.
 *
 * 라우트 분할만 하면 착지 화면은 가벼워지지만 다음 이동에 왕복이 하나
 * 붙는다 — 측정값으로 브리프에서 이슈 상세로 들어갈 때 slow 3G에서 청크
 * 하나에 592ms가 걸렸고, 그게 이 제품의 주 동선이다. 유휴 프리페치는 그
 * 대가만 없애고 분할의 이득은 남긴다.
 *
 * 규칙은 하나다: **현재 화면이 링크로 가리키는 곳만** 데운다. 브리프에서는
 * 이슈 카드(클러스터 상세)와 좌측 내비의 아카이브가 그 대상이고, 배치 운영은
 * `ops.view`가 있어 실제로 내비에 보이는 사람에게만 해당한다. 권한이 없는
 * 사용자에게 운영 콘솔을 받아 두게 하면 분할한 이유가 사라진다.
 *
 * 실패는 삼킨다. 프리페치는 순수한 선행 최적화라, 오프라인이나 캐시 만료로
 * 실패해도 실제 이동 시점에 `React.lazy`가 다시 시도한다.
 */

type IdleHandle = { cancel: () => void };

/**
 * 첫 페인트 직후, 늦어도 `IDLE_TIMEOUT_MS` 안에 실행한다.
 *
 * 처음엔 여유롭게 `timeout: 2500`으로 뒀는데 측정에서 그게 실패 원인이었다.
 * 느린 회선에서는 메인 스레드가 몇 초 동안 바쁘므로 유휴 구간이 오지 않고,
 * 프리페치가 사용자의 클릭과 거의 동시에 떴다 — 클릭 85ms 전. 그 시점엔
 * 청크(6.7KB, slow 3G에서 773ms) 다운로드가 이동 시간의 86%를 차지한 뒤였다.
 *
 * 프리페치는 "한가할 때 해도 되는 일"이 아니라 "사용자가 읽는 동안 끝나
 * 있어야 하는 일"이다. 읽는 시간은 수 초이니 300ms 안에 시작하면 충분하고,
 * 6.7KB는 그 사이 회선을 의미 있게 뺏지 않는다.
 *
 * `requestAnimationFrame`을 한 번 거치는 것은 첫 페인트를 확실히 넘기기
 * 위해서다 — 프리페치가 콘텐츠보다 먼저 회선을 잡으면 안 된다.
 */
const IDLE_TIMEOUT_MS = 300;

function whenIdle(run: () => void): IdleHandle {
  if (typeof window === 'undefined') {
    return { cancel: () => undefined };
  }

  let inner: IdleHandle | null = null;
  let cancelled = false;

  const frame = window.requestAnimationFrame(() => {
    if (cancelled) {
      return;
    }

    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(run, { timeout: IDLE_TIMEOUT_MS });
      inner = { cancel: () => window.cancelIdleCallback?.(id) };
      return;
    }

    // Safari에는 requestIdleCallback이 없다.
    const id = window.setTimeout(run, IDLE_TIMEOUT_MS);
    inner = { cancel: () => window.clearTimeout(id) };
  });

  return {
    cancel: () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      inner?.cancel();
    },
  };
}

export function useRoutePrefetch(route: AppRoute, canViewOps: boolean): void {
  const page = route.page;
  const onBrief = page === 'latest' || page === 'archive-market';

  useEffect(() => {
    const targets: Array<() => Promise<unknown>> = [];

    if (onBrief) {
      targets.push(loadClusterDetailPage, loadArchiveSearchPage);
    }

    if (page === 'archive-search') {
      targets.push(loadClusterDetailPage);
    }

    if (canViewOps) {
      targets.push(loadBatchOperationsPage);
    }

    if (targets.length === 0) {
      return;
    }

    const handle = whenIdle(() => {
      for (const load of targets) {
        load().catch(() => undefined);
      }
    });

    return () => handle.cancel();
  }, [onBrief, page, canViewOps]);
}

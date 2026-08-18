/**
 * 지연 로드되는 라우트 청크의 단일 목록.
 *
 * `React.lazy`와 유휴 프리페치가 **같은 thunk**를 부르는 것이 핵심이다.
 * 모듈 지정자가 같으면 두 번째 호출은 이미 받아 둔 모듈을 그대로 쓰므로,
 * 프리페치가 끝난 뒤의 실제 이동은 네트워크를 타지 않는다. 목록이 갈라지면
 * 프리페치가 엉뚱한 청크를 데워 놓고 정작 필요한 건 그때 받게 된다.
 */

export const loadArchiveSearchPage = () =>
  import('../pages/archive-search-page');
export const loadClusterDetailPage = () =>
  import('../pages/cluster-detail-page');
export const loadBatchOperationsPage = () =>
  import('../pages/batch-operations-page');
export const loadNotFoundPage = () => import('../pages/not-found-page');

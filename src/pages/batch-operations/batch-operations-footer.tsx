export function BatchOperationsFooter({
  filteredCount,
  hasStartError,
  totalCount,
}: {
  filteredCount: number;
  hasStartError: boolean;
  totalCount: number;
}) {
  return (
    <footer className="page-intro">
      <p>
        Showing <strong>{filteredCount}</strong> of{' '}
        <strong>{totalCount}</strong> batch jobs
      </p>
      {hasStartError && (
        <p>배치 실행 요청에 실패했습니다. 다시 시도해 주세요.</p>
      )}
    </footer>
  );
}

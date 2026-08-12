export function BatchHeader() {
  return (
    <header className='flex flex-wrap items-end gap-3'>
      <div className='min-w-0 flex-1'>
        <h1
          className='m-0 mb-1 text-h1 font-semibold text-fg'
          id='page-title'
          tabIndex={-1}
        >
          배치 운영
        </h1>
        <p className='wrap-anywhere mt-1 max-w-[70ch] text-body text-fg-soft'>
          검색 결과 저장과 스냅샷 생성 배치는 각각 독립적으로 실행됩니다.
          기간·상태·타입으로 이력을 조회하고 단계별 진행, 실패 지점, 영향 범위를
          확인합니다.
        </p>
      </div>
    </header>
  );
}

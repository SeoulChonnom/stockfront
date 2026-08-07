import { EmptyState } from '@/components/state';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';

export type BatchHistoryEmptyProps = {
  onClearFilters: () => void;
};

export function BatchHistoryEmpty({ onClearFilters }: BatchHistoryEmptyProps) {
  return (
    <TableRow>
      <TableCell className='p-4 sm:p-[18px]' colSpan={5}>
        <EmptyState
          actions={
            <Button
              onClick={onClearFilters}
              size='sm'
              type='button'
              variant='secondary'
            >
              필터 해제
            </Button>
          }
          description='선택한 기간·상태·타입 조건에 해당하는 작업이 없습니다. 상태와 타입 조건을 해제하면 같은 기간의 전체 이력을 볼 수 있습니다.'
          kind='search-results'
          title='표시할 실행 이력이 없습니다'
        />
      </TableCell>
    </TableRow>
  );
}

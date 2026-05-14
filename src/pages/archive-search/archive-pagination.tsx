import { ArrowLeft, ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function ArchivePagination({
  currentPage,
  filteredCount,
  onNext,
  onPrev,
  totalPages,
  visibleCount,
}: {
  currentPage: number;
  filteredCount: number;
  onNext: () => void;
  onPrev: () => void;
  totalPages: number;
  visibleCount: number;
}) {
  return (
    <div className='table-footer'>
      <p>
        Showing <strong>{visibleCount}</strong> of{' '}
        <strong>{filteredCount}</strong> archive runs
      </p>
      <div className='pagination'>
        <Button
          disabled={currentPage <= 1}
          onClick={onPrev}
          type='button'
          variant='ghost'
        >
          <ArrowLeft size={16} />
          Prev
        </Button>
        <span className='pagination-label'>
          Page {currentPage} / {totalPages}
        </span>
        <Button
          disabled={currentPage >= totalPages}
          onClick={onNext}
          type='button'
          variant='ghost'
        >
          Next
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}

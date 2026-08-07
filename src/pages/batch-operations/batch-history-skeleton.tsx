import { Skeleton } from '@/components/state/skeleton';
import { TableCell, TableRow } from '@/components/ui/table';

/** Keep row placeholders inside this table; a nested `<table>` would be invalid HTML. */
export function BatchHistorySkeleton() {
  return (
    <>
      {Array.from({ length: 5 }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed 5-row aria-hidden placeholder, never reordered
        <TableRow aria-hidden='true' key={`skeleton-${index}`}>
          <TableCell>
            <Skeleton className='h-4 w-28' />
          </TableCell>
          <TableCell className='hidden min-[641px]:table-cell'>
            <Skeleton className='h-4 w-16' />
          </TableCell>
          <TableCell>
            <Skeleton className='h-4 w-20' />
          </TableCell>
          <TableCell>
            <Skeleton className='h-4 w-16' />
          </TableCell>
          <TableCell className='hidden min-[1181px]:table-cell'>
            <Skeleton className='h-4 w-24' />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

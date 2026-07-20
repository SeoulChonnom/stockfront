import { CircleDot } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {
  createNavigateHandler,
  formatDateDots,
  getStatusClass,
} from '../../lib/app-state';
import { buildUrl, withBasePath } from '../../lib/router';
import type { ArchiveRecord } from '../../lib/view-models';

function getArchiveDetailHref(record: ArchiveRecord) {
  return buildUrl(`/market/archive/${record.businessDate}`, {
    pageId: record.pageId,
  });
}

export function ArchiveResultsTable({ rows }: { rows: ArchiveRecord[] }) {
  return (
    <Card className='panel table-panel'>
      <CardContent className='p-6'>
        <div className='table-wrap'>
          <Table className='data-table'>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Global Headline Preview</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Generation Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>
                    조회 조건에 맞는 아카이브 결과가 없습니다.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((record) => {
                const detailHref = getArchiveDetailHref(record);

                return (
                  <TableRow key={record.pageId}>
                    <TableCell>
                      <div className='date-cell'>
                        <CircleDot
                          className={
                            record.status === 'FAILED'
                              ? 'trend-down'
                              : 'trend-up'
                          }
                          size={14}
                        />
                        <span>{formatDateDots(record.businessDate)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <a
                        className='headline-link'
                        href={withBasePath(detailHref)}
                        onClick={createNavigateHandler(detailHref)}
                      >
                        {record.headline}
                      </a>
                    </TableCell>
                    <TableCell>
                      <span className={getStatusClass(record.status)}>
                        {record.status}
                      </span>
                    </TableCell>
                    <TableCell className='numeric'>
                      {record.generatedAt}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

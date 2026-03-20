import { ArrowLeft, ArrowRight, CircleDot, Search } from 'lucide-react';
import { startTransition, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  getRelativeIso,
  getStatusClass,
  getTodayIso,
  normalizeDateParam,
} from '../lib/app-state';
import { buildUrl, navigate } from '../lib/router';
import { archiveRecords } from '../mock-data';

export function ArchiveSearchPage({
  searchParams,
}: {
  searchParams: URLSearchParams;
}) {
  const defaults = {
    from: getTodayIso(),
    to: getRelativeIso(14),
    status: '',
    page: '1',
  };

  const applied = {
    from: normalizeDateParam(searchParams.get('from'), defaults.from),
    to: normalizeDateParam(searchParams.get('to'), defaults.to),
    status: searchParams.get('status') ?? defaults.status,
    page: Number(searchParams.get('page') ?? defaults.page) || 1,
  };

  const filtered = useMemo(() => {
    return archiveRecords.filter((record) => {
      if (applied.status && record.status !== applied.status) {
        return false;
      }

      return (
        record.businessDate <= applied.from && record.businessDate >= applied.to
      );
    });
  }, [applied.from, applied.status, applied.to]);

  const pageSize = 4;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(applied.page, totalPages);
  const rows = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <ArchiveSearchContent
      key={`${applied.from}:${applied.to}:${applied.status}:${applied.page}`}
      applied={applied}
      currentPage={currentPage}
      filteredCount={filtered.length}
      rows={rows}
      totalPages={totalPages}
    />
  );
}

function ArchiveSearchContent({
  applied,
  currentPage,
  filteredCount,
  rows,
  totalPages,
}: {
  applied: {
    from: string;
    to: string;
    status: string;
    page: number;
  };
  currentPage: number;
  filteredCount: number;
  rows: typeof archiveRecords;
  totalPages: number;
}) {
  const [draft, setDraft] = useState({
    from: applied.from,
    to: applied.to,
    status: applied.status,
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(() => {
      navigate(
        buildUrl('/market/archive/search', {
          from: draft.from,
          to: draft.to,
          status: draft.status,
          page: 1,
        }),
      );
    });
  }

  return (
    <div className="page-stack">
      <section className="page-intro">
        <div>
          <span className="eyebrow">Archive Search</span>
          <h1 id="page-title" tabIndex={-1}>
            과거 시장 기록 탐색
          </h1>
          <p>
            날짜 범위와 상태 기준으로 과거 요약 생성 결과를 검색합니다. 테이블
            결과는 상세 페이지 이동을 제목 셀 링크에만 부여해 접근성과 의미를
            분리했습니다.
          </p>
        </div>
      </section>

      <Card className="panel filter-card">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit}>
            <div className="filter-grid">
              <div className="field">
                <label htmlFor="archive-from">From</label>
                <Input
                  id="archive-from"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      from: event.target.value,
                    }))
                  }
                  type="date"
                  value={draft.from}
                />
              </div>
              <div className="field">
                <label htmlFor="archive-to">To</label>
                <Input
                  id="archive-to"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      to: event.target.value,
                    }))
                  }
                  type="date"
                  value={draft.to}
                />
              </div>
              <div className="field">
                <label
                  htmlFor="archive-status-trigger"
                  id="archive-status-label"
                >
                  Status
                </label>
                <Select
                  onValueChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      status: value === 'all' ? '' : value,
                    }))
                  }
                  value={draft.status || undefined}
                >
                  <SelectTrigger
                    aria-labelledby="archive-status-label"
                    id="archive-status-trigger"
                  >
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="READY">READY</SelectItem>
                    <SelectItem value="PARTIAL">PARTIAL</SelectItem>
                    <SelectItem value="FAILED">FAILED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="filter-submit" type="submit" variant="primary">
                <Search size={16} />
                Search
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="panel table-panel">
        <CardContent className="p-6">
          <div className="table-wrap">
            <Table className="data-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Global Headline Preview</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Generation Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((record) => (
                  <TableRow key={record.clusterId}>
                    <TableCell>
                      <div className="date-cell">
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
                        className="headline-link"
                        href={`/market/cluster/${record.clusterId}`}
                        onClick={createNavigateHandler(
                          `/market/cluster/${record.clusterId}`,
                        )}
                      >
                        {record.headline}
                      </a>
                    </TableCell>
                    <TableCell>
                      <span className={getStatusClass(record.status)}>
                        {record.status}
                      </span>
                    </TableCell>
                    <TableCell className="numeric">
                      {record.generatedAt}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="table-footer">
            <p>
              Showing <strong>{rows.length}</strong> of{' '}
              <strong>{filteredCount}</strong> archive runs
            </p>
            <div className="pagination">
              <Button
                disabled={currentPage <= 1}
                onClick={() =>
                  navigate(
                    buildUrl('/market/archive/search', {
                      from: applied.from,
                      to: applied.to,
                      status: applied.status,
                      page: currentPage - 1,
                    }),
                  )
                }
                type="button"
                variant="ghost"
              >
                <ArrowLeft size={16} />
                Prev
              </Button>
              <span className="pagination-label">
                Page {currentPage} / {totalPages}
              </span>
              <Button
                disabled={currentPage >= totalPages}
                onClick={() =>
                  navigate(
                    buildUrl('/market/archive/search', {
                      from: applied.from,
                      to: applied.to,
                      status: applied.status,
                      page: currentPage + 1,
                    }),
                  )
                }
                type="button"
                variant="ghost"
              >
                Next
                <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

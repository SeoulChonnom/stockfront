import { Search } from 'lucide-react';
import { startTransition, useState } from 'react';
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

export function ArchiveSearchFilters({
  initialFilters,
  onApply,
}: {
  initialFilters: {
    from: string;
    to: string;
    status: string;
  };
  onApply: (filters: { from: string; to: string; status: string }) => void;
}) {
  const [draft, setDraft] = useState(initialFilters);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(() => {
      onApply(draft);
    });
  }

  return (
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
              <label htmlFor="archive-status-trigger" id="archive-status-label">
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
  );
}

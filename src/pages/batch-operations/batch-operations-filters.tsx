import { Filter } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function BatchOperationsFilters({
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
    onApply(draft);
  }

  return (
    <form className="ops-filter-bar" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="ops-status-trigger" id="ops-status-label">
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
            aria-labelledby="ops-status-label"
            id="ops-status-trigger"
          >
            <SelectValue placeholder="ALL STATUSES" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ALL STATUSES</SelectItem>
            <SelectItem value="SUCCESS">SUCCESS</SelectItem>
            <SelectItem value="PARTIAL">PARTIAL</SelectItem>
            <SelectItem value="FAILED">FAILED</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="field">
        <label htmlFor="ops-from">From</label>
        <Input
          id="ops-from"
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
        <label htmlFor="ops-to">To</label>
        <Input
          id="ops-to"
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
      <Button className="ops-apply" type="submit" variant="ghost">
        <Filter size={15} />
        Apply Filters
      </Button>
    </form>
  );
}

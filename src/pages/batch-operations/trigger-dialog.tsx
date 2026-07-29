import { X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import { useAnnounce } from '@/components/shell/use-announce';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import type { BatchRunResponse } from '@/lib/api/types';
import type { useStartBatchRunMutation } from '@/lib/query-hooks';

import { getTodayKstDateString } from './format-batch';
import { type TriggerFormValues, TriggerIdleForm } from './trigger-dialog-idle';
import {
  TriggerErrorState,
  TriggerPendingState,
  TriggerSuccessState,
} from './trigger-dialog-states';
import { toTriggerErrorView } from './trigger-error';

/**
 * README §7-7 Manual Trigger dialog. States are driven directly by the
 * `useStartBatchRunMutation()` instance the parent owns (not duplicated
 * into local state) so the parent can keep the mutation alive across the
 * dialog's own open/close — e.g. a success needs to survive the dialog
 * closing so the list page's persistent success banner (§7-6 point 2) can
 * read it.
 *
 * `mutation.reset()` runs on every close (Escape/overlay/✕/취소/닫기) so the
 * NEXT open always starts idle rather than resuming a stale success/error —
 * the parent is expected to have already captured whatever it needed from
 * a success via the mutation's own `onSuccess` before the user closes.
 */

export type TriggerMutation = ReturnType<typeof useStartBatchRunMutation>;

export function TriggerDialog({
  isOpen,
  onClose,
  mutation,
  canUseAdvancedOptions,
  initialBusinessDate,
  onOpenJobDetail,
  onTriggered,
}: {
  isOpen: boolean;
  onClose: () => void;
  mutation: TriggerMutation;
  canUseAdvancedOptions: boolean;
  initialBusinessDate?: string;
  onOpenJobDetail: (jobId: number) => void;
  /** Lets the parent leave a persistent success banner on the list page (README §7-6 point 2) even after this dialog closes. */
  onTriggered: (result: BatchRunResponse) => void;
}) {
  const titleId = useId();
  const announce = useAnnounce();
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState<TriggerFormValues>(() => ({
    businessDate: initialBusinessDate ?? getTodayKstDateString(),
    force: false,
    rebuildPageOnly: false,
  }));
  const [dateFieldFlagged, setDateFieldFlagged] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setValues({
      businessDate: initialBusinessDate ?? getTodayKstDateString(),
      force: false,
      rebuildPageOnly: false,
    });
    setDateFieldFlagged(false);
    // Reset to a fresh form every time the dialog transitions closed→open —
    // intentionally NOT re-running on `initialBusinessDate` alone (a parent
    // re-render with the same open dialog shouldn't clobber in-progress
    // edits).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  function handleClose() {
    mutation.reset();
    onClose();
  }

  function handleValuesChange(next: TriggerFormValues) {
    setValues(next);
    if (dateFieldFlagged && next.businessDate !== values.businessDate) {
      setDateFieldFlagged(false);
    }
  }

  function handleSubmit() {
    if (mutation.isPending) {
      return;
    }

    announce('배치 실행을 요청하고 있습니다.');

    mutation.mutate(
      {
        businessDate: values.businessDate,
        force: canUseAdvancedOptions ? values.force : undefined,
        rebuildPageOnly: canUseAdvancedOptions
          ? values.rebuildPageOnly
          : undefined,
      },
      {
        onSuccess: (result) => {
          announce(
            `job ${result.jobId} 실행을 시작했습니다. 상태 ${result.status}.`
          );
          onTriggered(result);
        },
      }
    );
  }

  function handleOpenReferencedJob(jobId: number) {
    mutation.reset();
    onClose();
    onOpenJobDetail(jobId);
  }

  const errorView = mutation.isError
    ? toTriggerErrorView(mutation.error, values.businessDate)
    : null;

  return (
    <Dialog
      initialFocusRef={dateInputRef}
      isOpen={isOpen}
      labelledBy={titleId}
      onClose={handleClose}
    >
      <div className='mb-4 flex items-start justify-between gap-3'>
        <h2
          className='m-0 text-[17px] font-semibold text-[color:var(--text)]'
          id={titleId}
        >
          수동 실행
        </h2>
        <Button
          aria-label='닫기'
          onClick={handleClose}
          size='icon'
          type='button'
          variant='ghost'
        >
          <X aria-hidden='true' size={16} />
        </Button>
      </div>

      {mutation.isPending ? (
        <TriggerPendingState />
      ) : mutation.isSuccess && mutation.data ? (
        <TriggerSuccessState
          onClose={handleClose}
          onOpenDetail={handleOpenReferencedJob}
          result={mutation.data}
        />
      ) : errorView ? (
        <TriggerErrorState
          error={errorView}
          onBackToInput={() => {
            setDateFieldFlagged(errorView.isFieldError);
            mutation.reset();
          }}
          onClose={handleClose}
          onOpenExistingJob={handleOpenReferencedJob}
        />
      ) : (
        <TriggerIdleForm
          canUseAdvancedOptions={canUseAdvancedOptions}
          dateFieldInvalid={dateFieldFlagged}
          dateInputRef={dateInputRef}
          onCancel={handleClose}
          onChange={handleValuesChange}
          onSubmit={handleSubmit}
          values={values}
        />
      )}
    </Dialog>
  );
}

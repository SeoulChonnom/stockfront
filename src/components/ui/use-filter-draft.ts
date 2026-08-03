import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

/**
 * Draft/applied separation for filter forms (README §7-4 Archive Search,
 * §7-6 Batch Operations filters).
 *
 * Typing into a field only updates local `draft` state — it never touches
 * the URL. Only `apply()` calls `onApply`, which is where the consumer
 * (Archive/Batch page) is expected to `navigate(...)` with `page=1`.
 *
 * `applied` is expected to come from the URL (via `parseListFilters` et al
 * upstream) — when it changes (e.g. browser Back restores a previous
 * filter), `draft` resyncs to it and any stale errors are cleared.
 */

export type FilterErrors<T> = Partial<Record<keyof T, string>>;

export type UseFilterDraftOptions<T extends Record<string, string>> = {
  applied: T;
  defaultValues: T;
  validate?: (draft: T) => FilterErrors<T>;
  onApply: (next: T) => void;
  onReset: () => void;
};

export type FieldProps = {
  id: string;
  name: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  'aria-invalid': true | undefined;
  'aria-describedby': string | undefined;
  ref: (element: HTMLElement | null) => void;
};

export function fieldErrorId(name: string): string {
  return `${name}-error`;
}

export function useFilterDraft<T extends Record<string, string>>({
  applied,
  defaultValues,
  validate,
  onApply,
  onReset,
}: UseFilterDraftOptions<T>) {
  const [draft, setDraft] = useState<T>(applied);
  const [errors, setErrors] = useState<FilterErrors<T>>({});
  const fieldRefs = useRef(new Map<keyof T, HTMLElement | null>());

  // biome-ignore lint/correctness/useExhaustiveDependencies: resync keys off `applied`'s value, not its identity — see the note at the end of the effect
  useEffect(() => {
    setDraft(applied);
    setErrors({});
    // Only resync when the URL-derived `applied` value itself changes —
    // intentionally excludes `applied` object identity churn from re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(applied)]);

  const setField = useCallback((name: keyof T, value: string) => {
    setDraft((current) => ({ ...current, [name]: value }));
  }, []);

  const registerField = useCallback(
    (name: keyof T) => (element: HTMLElement | null) => {
      fieldRefs.current.set(name, element);
    },
    []
  );

  const isDirty = (Object.keys(applied) as (keyof T)[]).some(
    (key) => draft[key] !== applied[key]
  );

  const focusFirstInvalid = useCallback((nextErrors: FilterErrors<T>) => {
    const [firstKey] = Object.keys(nextErrors) as (keyof T)[];
    if (firstKey) {
      fieldRefs.current.get(firstKey)?.focus();
    }
  }, []);

  const apply = useCallback((): boolean => {
    const nextErrors = validate ? validate(draft) : {};
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      focusFirstInvalid(nextErrors);
      return false;
    }

    onApply(draft);
    return true;
  }, [draft, validate, onApply, focusFirstInvalid]);

  const reset = useCallback(() => {
    setDraft(defaultValues);
    setErrors({});
    onReset();
  }, [defaultValues, onReset]);

  const getFieldProps = useCallback(
    (name: keyof T): FieldProps => ({
      id: String(name),
      name: String(name),
      value: draft[name],
      onChange: (event) => setField(name, event.target.value),
      'aria-invalid': errors[name] ? true : undefined,
      'aria-describedby': errors[name] ? fieldErrorId(String(name)) : undefined,
      ref: registerField(name),
    }),
    [draft, errors, setField, registerField]
  );

  return { draft, errors, isDirty, apply, reset, getFieldProps };
}

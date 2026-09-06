import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

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

function fieldErrorId(name: string): string {
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
    // Resync URL-derived values, not object identity churn.
  }, [JSON.stringify(applied)]);

  const setField = useCallback((name: keyof T, value: string) => {
    setDraft((current) => ({ ...current, [name]: value }));
  }, []);

  // 프리셋처럼 여러 필드를 한 번에 바꿔야 하는 호출부를 위한 원자적
  // setter다. `setField`를 두 번 잇달아 부르면 그 사이 렌더에서 draft가
  // 반쪽짜리 상태(예: from만 바뀌고 to는 아직 이전 값)로 잠깐 노출된다.

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

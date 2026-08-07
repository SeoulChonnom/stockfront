import { useState } from 'react';

/** Retains the last successful value across loading/error renders. */
export function useLastGoodData<T>(value: T | undefined): T | null {
  const [lastGood, setLastGood] = useState<T | null>(value ?? null);

  if (value !== undefined && value !== lastGood) {
    setLastGood(value);
  }

  return value !== undefined ? value : lastGood;
}

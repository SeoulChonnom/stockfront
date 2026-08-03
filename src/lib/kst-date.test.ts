import { describe, expect, it } from 'vitest';

import {
  getRelativeIso,
  getTodayBusinessDateKst,
  getTodayIso,
  parseKstAwareDate,
} from './kst-date';

describe('parseKstAwareDate', () => {
  it('reads a naive (no offset/Z) timestamp as literal KST wall-clock digits', () => {
    // '2026-07-27T08:24:31' has no offset, so it must be read as
    // 2026-07-27 08:24:31 KST, i.e. 2026-07-26T23:24:31Z.
    const date = parseKstAwareDate('2026-07-27T08:24:31');
    expect(date?.toISOString()).toBe('2026-07-26T23:24:31.000Z');
  });

  it('parses a space-separated naive datetime the same way', () => {
    const date = parseKstAwareDate('2026-07-27 08:24:31');
    expect(date?.toISOString()).toBe('2026-07-26T23:24:31.000Z');
  });

  it('parses a UTC-qualified (Z) timestamp as an absolute instant, not KST digits', () => {
    const date = parseKstAwareDate('2026-07-27T08:24:31Z');
    expect(date?.toISOString()).toBe('2026-07-27T08:24:31.000Z');
  });

  it('returns null for unparseable input', () => {
    expect(parseKstAwareDate('not-a-date')).toBeNull();
    expect(parseKstAwareDate(null)).toBeNull();
    expect(parseKstAwareDate('')).toBeNull();
  });
});

describe('getTodayIso', () => {
  it('rolls the KST calendar date forward across the UTC day boundary (D6)', () => {
    // 2026-07-27T15:00:00Z is 2026-07-28 00:00 KST — an instant between
    // 00:00 and 09:00 KST where the UTC calendar date is still the
    // PREVIOUS day. A naive `toISOString().slice(0, 10)` on the raw
    // instant would read '2026-07-27' (wrong); the KST-shifted value must
    // read '2026-07-28'.
    const utcJustBeforeKstMidnight = new Date('2026-07-27T14:59:59Z');
    const utcJustAfterKstMidnight = new Date('2026-07-27T15:00:00Z');

    expect(getTodayIso(utcJustBeforeKstMidnight)).toBe('2026-07-27');
    expect(getTodayIso(utcJustAfterKstMidnight)).toBe('2026-07-28');
  });

  it('agrees with the Intl-based getTodayBusinessDateKst technique at the D6 boundary', () => {
    // Both techniques are correct for Korea (no DST); prove they produce
    // identical output for the boundary instant so unifying the module
    // does not silently change behavior for either caller.
    const boundaryInstant = new Date('2026-07-27T15:00:00Z');

    expect(getTodayIso(boundaryInstant)).toBe(
      getTodayBusinessDateKst(boundaryInstant)
    );
  });
});

describe('getRelativeIso', () => {
  it('subtracts whole KST calendar days from the reference instant', () => {
    const now = new Date('2026-07-27T06:12:10Z'); // 2026-07-27 15:12 KST

    expect(getRelativeIso(0, now)).toBe('2026-07-27');
    expect(getRelativeIso(14, now)).toBe('2026-07-13');
  });

  it('subtracts days across a KST day boundary consistently with getTodayIso', () => {
    const boundaryInstant = new Date('2026-07-27T15:00:00Z'); // 2026-07-28 00:00 KST

    expect(getRelativeIso(0, boundaryInstant)).toBe(
      getTodayIso(boundaryInstant)
    );
    expect(getRelativeIso(1, boundaryInstant)).toBe('2026-07-27');
  });
});

describe('getTodayBusinessDateKst', () => {
  it('formats the KST calendar date via Intl.DateTimeFormat', () => {
    expect(getTodayBusinessDateKst(new Date('2026-07-27T06:12:10Z'))).toBe(
      '2026-07-27'
    );
  });
});

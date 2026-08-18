import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ARRIVAL_MARK_MS, markArrival } from './arrival-mark';

const MARK = 'data-arrived';

function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.body;
}

describe('markArrival', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('marks the jump target itself when nothing declares a host', () => {
    const body = mount('<li id="row">기사</li>');
    const row = body.querySelector('#row');

    markArrival(row);

    expect(row?.hasAttribute(MARK)).toBe(true);
  });

  it('clears the mark once the animation has finished', () => {
    const body = mount('<li id="row">기사</li>');
    const row = body.querySelector('#row');

    markArrival(row);
    vi.advanceTimersByTime(ARRIVAL_MARK_MS - 1);
    expect(row?.hasAttribute(MARK)).toBe(true);

    vi.advanceTimersByTime(1);
    expect(row?.hasAttribute(MARK)).toBe(false);
  });

  it('marks a descendant host — the market section scrolls, its header band lights up', () => {
    const body = mount(
      '<section id="market"><div data-arrival-host id="band"></div><p>본문</p></section>'
    );

    markArrival(body.querySelector('#market'));

    expect(body.querySelector('#market')?.hasAttribute(MARK)).toBe(false);
    expect(body.querySelector('#band')?.hasAttribute(MARK)).toBe(true);
  });

  it('marks an ancestor host — the results heading is focused, its whole header row lights up', () => {
    const body = mount(
      '<div data-arrival-host id="row"><h2 id="heading">검색 결과</h2><span>46건</span></div>'
    );

    markArrival(body.querySelector('#heading'));

    expect(body.querySelector('#heading')?.hasAttribute(MARK)).toBe(false);
    expect(body.querySelector('#row')?.hasAttribute(MARK)).toBe(true);
  });

  it('keeps exactly one mark alive — a second jump moves it rather than adding one', () => {
    const body = mount('<li id="a"></li><li id="b"></li>');

    markArrival(body.querySelector('#a'));
    markArrival(body.querySelector('#b'));

    expect(body.querySelector('#a')?.hasAttribute(MARK)).toBe(false);
    expect(body.querySelector('#b')?.hasAttribute(MARK)).toBe(true);
    expect(document.querySelectorAll(`[${MARK}]`)).toHaveLength(1);
  });

  it('restarts the full duration when the same target is jumped to twice', () => {
    const body = mount('<li id="row"></li>');
    const row = body.querySelector('#row');

    markArrival(row);
    vi.advanceTimersByTime(ARRIVAL_MARK_MS - 100);
    markArrival(row);

    // The first jump's timer must not survive to cut the second one short.
    vi.advanceTimersByTime(ARRIVAL_MARK_MS - 1);
    expect(row?.hasAttribute(MARK)).toBe(true);

    vi.advanceTimersByTime(1);
    expect(row?.hasAttribute(MARK)).toBe(false);
  });

  it('ignores a missing target instead of throwing', () => {
    expect(() => markArrival(null)).not.toThrow();
    expect(() => markArrival(undefined)).not.toThrow();
  });
});

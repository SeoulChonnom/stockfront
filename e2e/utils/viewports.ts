/**
 * README §11 responsive matrix — the six widths every route/state combination
 * must be checked at. Heights are arbitrary (tall enough to avoid vertical
 * scroll noise in screenshots/traces); only `width` is contractually required
 * by §11's `scrollWidth <= clientWidth` assertion.
 */
export type Viewport = {
  name: string;
  width: number;
  height: number;
};

export const VIEWPORTS: readonly Viewport[] = [
  { name: '320', width: 320, height: 900 },
  { name: '390', width: 390, height: 900 },
  { name: '768', width: 768, height: 1024 },
  { name: '1024', width: 1024, height: 900 },
  { name: '1280', width: 1280, height: 900 },
  { name: '1440', width: 1440, height: 940 },
];

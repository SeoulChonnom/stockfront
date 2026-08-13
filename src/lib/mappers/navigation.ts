import type { NavigationResponse } from '../api/types';
import { asNullableString, asOptionalBoolean, asString } from './coerce';

export type NavigationView = {
  businessDate: string;
  pageExists: boolean;
  previousBusinessDate: string | null;
  nextBusinessDate: string | null;
};

/** Maps `GET /pages/navigation` (B-5). Types stay narrow; this stays lenient against a malformed wire response. */
export function mapNavigationToView(
  response: NavigationResponse
): NavigationView {
  return {
    businessDate: asString(response.businessDate, ''),
    pageExists: asOptionalBoolean(response.pageExists) ?? false,
    previousBusinessDate: asNullableString(response.previousBusinessDate),
    nextBusinessDate: asNullableString(response.nextBusinessDate),
  };
}

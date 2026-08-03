import type {
  ArticleLinkResponse,
  ClusterArticleResponse,
  DailyPageResponse,
  IndexCardResponse,
} from '../api/types';
import { isRecord } from '../utils';

type DailyMarketResponse = DailyPageResponse['markets'][number];
type DailyClusterResponse = DailyMarketResponse['topClusters'][number];

export function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

export function asArticleArray(value: unknown): ClusterArticleResponse[] {
  return Array.isArray(value)
    ? value.filter((item): item is ClusterArticleResponse => isRecord(item))
    : [];
}

export function asArticleLinkArray(value: unknown): ArticleLinkResponse[] {
  return Array.isArray(value)
    ? value.filter((item): item is ArticleLinkResponse => isRecord(item))
    : [];
}

export function asDailyMarketArray(value: unknown): DailyMarketResponse[] {
  return Array.isArray(value)
    ? value.filter((item): item is DailyMarketResponse => isRecord(item))
    : [];
}

export function asIndexArray(value: unknown): IndexCardResponse[] {
  return Array.isArray(value)
    ? value.filter((item): item is IndexCardResponse => isRecord(item))
    : [];
}

export function asDailyClusterArray(value: unknown): DailyClusterResponse[] {
  return Array.isArray(value)
    ? value.filter((item): item is DailyClusterResponse => isRecord(item))
    : [];
}

export function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

export function asNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export function asOptionalBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

export function asFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function asNonNegativeSafeInteger(
  value: unknown,
  fallback: number
): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : fallback;
}

export function asNullableFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function asDisplayId(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return fallback;
}

export function toUpperStatus<
  T extends
    | 'READY'
    | 'PARTIAL'
    | 'FAILED'
    | 'SUCCESS'
    | 'RUNNING'
    | 'PENDING'
    | 'SKIPPED',
>(value: unknown, allowed: readonly T[]): T | 'FAILED' {
  if (typeof value !== 'string') {
    return 'FAILED';
  }

  const normalized = value.toUpperCase();

  return allowed.includes(normalized as T) ? (normalized as T) : 'FAILED';
}

export function firstString(values: unknown[], fallback: string): string {
  return (
    values.find((value): value is string => typeof value === 'string') ??
    fallback
  );
}

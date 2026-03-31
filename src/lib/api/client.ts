import type { ApiEnvelope } from './types';

type QueryValue = string | number | boolean | null | undefined;

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

function getApiHost() {
  const host = import.meta.env.VITE_API_HOST;

  if (typeof host !== 'string' || host.trim().length === 0) {
    throw new Error('VITE_API_HOST is not configured.');
  }

  return host.replace(/\/+$/, '');
}

function buildQueryString(query?: Record<string, QueryValue>) {
  if (!query) {
    return '';
  }

  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      return;
    }

    params.set(key, String(value));
  });

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

type ApiRequestOptions = {
  method?: 'GET' | 'POST';
  query?: Record<string, QueryValue>;
  body?: unknown;
  headers?: HeadersInit;
  signal?: AbortSignal;
};

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(
    `${getApiHost()}${path}${buildQueryString(options.query)}`,
    {
      method: options.method ?? 'GET',
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    },
  );

  let parsedBody: unknown = null;

  try {
    parsedBody = await response.json();
  } catch {
    parsedBody = null;
  }

  if (!response.ok) {
    throw new ApiError(
      `API request failed with status ${response.status}.`,
      response.status,
      parsedBody,
    );
  }

  const envelope = parsedBody as ApiEnvelope<T>;

  if (!envelope || typeof envelope !== 'object' || !('data' in envelope)) {
    throw new ApiError(
      'API response does not contain a data payload.',
      200,
      parsedBody,
    );
  }

  if (envelope.success === false) {
    throw new ApiError('API responded with success=false.', 200, parsedBody);
  }

  return envelope.data;
}

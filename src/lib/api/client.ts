import type { ApiEnvelope } from './types';
import { getAccessToken } from '../auth-bootstrap';

type QueryValue = string | number | boolean | null | undefined;

function readEnvString(name: string) {
  const value = (import.meta.env as Record<string, unknown>)[name];

  return typeof value === 'string' ? value : undefined;
}

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
  const host = readEnvString('VITE_API_HOST');

  if (typeof host !== 'string' || host.trim().length === 0) {
    throw new Error('VITE_API_HOST is not configured.');
  }

  return host.replace(/\/+$/, '');
}

function getAuthToken() {
  const accessToken = getAccessToken();

  if (typeof accessToken !== 'string') {
    return null;
  }

  const normalizedAccessToken = accessToken.trim();
  return normalizedAccessToken.length > 0 ? normalizedAccessToken : null;
}

function getResponseErrorMessage(status: number, body: unknown) {
  if (status === 401) {
    return 'Unauthorized (401). Check the Bearer token used by the frontend.';
  }

  const detail =
    body &&
    typeof body === 'object' &&
    'detail' in body &&
    typeof body.detail === 'string'
      ? body.detail
      : '';

  if (detail.length > 0) {
    return `API request failed with status ${status}. ${detail}`;
  }

  return `API request failed with status ${status}.`;
}

function getNetworkErrorMessage() {
  return 'Network request failed. Check that the backend is running, VITE_API_HOST is correct, and CORS allows the frontend origin.';
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
  options: ApiRequestOptions = {}
): Promise<T> {
  const headers = new Headers(options.headers);

  const authToken = getAuthToken();
  if (authToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(
      `${getApiHost()}${path}${buildQueryString(options.query)}`,
      {
        method: options.method ?? 'GET',
        headers,
        body:
          options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: options.signal,
      }
    );
  } catch {
    throw new ApiError(getNetworkErrorMessage(), 0, null);
  }

  let parsedBody: unknown = null;

  try {
    parsedBody = await response.json();
  } catch {
    parsedBody = null;
  }

  if (!response.ok) {
    throw new ApiError(
      getResponseErrorMessage(response.status, parsedBody),
      response.status,
      parsedBody
    );
  }

  const envelope = parsedBody as ApiEnvelope<T>;

  if (!envelope || typeof envelope !== 'object' || !('data' in envelope)) {
    throw new ApiError(
      'API response does not contain a data payload.',
      200,
      parsedBody
    );
  }

  if (envelope.success === false) {
    throw new ApiError('API responded with success=false.', 200, parsedBody);
  }

  return envelope.data;
}

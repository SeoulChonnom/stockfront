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

function getAuthToken() {
  const apiToken = import.meta.env.VITE_API_BEARER_TOKEN;

  if (typeof apiToken === 'string' && apiToken.trim().length > 0) {
    return apiToken.trim();
  }

  const devToken = import.meta.env.VITE_DEV_BEARER_TOKEN;
  if (typeof devToken === 'string' && devToken.trim().length > 0) {
    return devToken.trim();
  }

  if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
    return 'dev-token';
  }

  return null;
}

function getResponseErrorMessage(status: number, body: unknown) {
  if (status === 401) {
    return 'Unauthorized (401). Check the Bearer token used by the frontend.';
  }

  const detail =
    body && typeof body === 'object' && 'detail' in body
      ? String((body as { detail?: unknown }).detail ?? '')
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
  options: ApiRequestOptions = {},
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
      },
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

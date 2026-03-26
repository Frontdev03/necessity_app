import { NECESSITY_BASE_URL } from 'src/config/necessity';

export interface NecessityErrorBody {
  message?: string;
  error?: string;
  errors?: string[] | Record<string, string[] | string>;
  /** Nested NECESSITY error: { data: { message, status } } */
  data?: { message?: string; status?: number };
}

export interface NecessityError extends Error {
  status?: number;
  data?: NecessityErrorBody;
}

function formatErrorsObject(errors: Record<string, string[] | string>): string {
  const parts: string[] = [];
  for (const key of Object.keys(errors)) {
    const val = errors[key];
    const messages = Array.isArray(val) ? val : val ? [val] : [];
    if (messages.length > 0) {
      const label = key.replace(/_/g, ' ');
      parts.push(`${label}: ${messages.join(', ')}`);
    }
  }
  return parts.join('. ');
}

function getMessageFromData(data: NecessityErrorBody): string | null {
  if (Array.isArray(data.errors) && data.errors.length > 0) {
    return data.errors.join(', ');
  }
  if (data.errors && typeof data.errors === 'object') {
    const formatted = formatErrorsObject(data.errors as Record<string, string[] | string>);
    if (formatted) return formatted;
  }
  if (typeof data.error === 'string' && data.error) return data.error;
  if (typeof data.message === 'string' && data.message) return data.message;
  if (data.data && typeof data.data.message === 'string' && data.data.message) {
    return data.data.message;
  }
  return null;
}

export function getNecessityErrorMessage(error: unknown): string {
  const err = error as NecessityError & { data?: NecessityErrorBody; status?: number };
  if (err?.data) {
    const msg = getMessageFromData(err.data);
    if (msg) return msg;
  }
  if (err?.status === 401) return 'Invalid email or password.';
  if (err?.status === 403) return 'Access denied.';
  if (err?.status === 404) return 'Service not found.';
  if (err?.status && err.status >= 500)
    return 'Server error. Please try again later.';
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong. Please try again.';
}

const defaultHeaders: any = {
  'Content-Type': 'application/json',
};

let authTokenGetter: (() => string | null) | null = null;

export function setAuthTokenGetter(getter: () => string | null): void {
  authTokenGetter = getter;
}

export async function necessityFormRequest<T>(
  path: string,
  options: RequestInit & { body: FormData } = {} as RequestInit & { body: FormData }
): Promise<T> {
  const { body, ...rest } = options;
  const url = `${NECESSITY_BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;

  const headers: any = { ...options.headers };
  delete (headers as Record<string, unknown>)['Content-Type'];
  const token = authTokenGetter?.() ?? null;
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      ...rest,
      method: options.method ?? 'POST',
      signal: controller.signal,
      headers,
      body,
    });


    clearTimeout(timeoutId);

    const data = await response.json().catch(() => ({}));

    console.log('data', data)

    if (!response.ok) {
      const necessityErr: NecessityError = new Error(
        getMessageFromData(data as NecessityErrorBody) ||
        response.statusText ||
        'Request failed'
      ) as NecessityError;
      necessityErr.status = response.status;
      necessityErr.data = data as NecessityErrorBody;
      throw necessityErr;
    }

    const success = (data as { success?: boolean }).success;
    if (success === false) {
      const necessityErr: NecessityError = new Error(
        getMessageFromData(data as NecessityErrorBody) || 'Request failed'
      ) as NecessityError;
      necessityErr.status = response.status;
      necessityErr.data = data as NecessityErrorBody;
      throw necessityErr;
    }

    return data as T;
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof Error) {
      if (e.name === 'AbortError') {
        const timeoutErr: NecessityError = new Error(
          'Request timed out. Please try again.'
        ) as NecessityError;
        throw timeoutErr;
      }
      throw e;
    }
    throw e;
  }
}

export async function necessityRequest<T>(
  path: string,
  options: Omit<RequestInit, 'body'> & { body?: any } = {}
): Promise<T> {
  const { body, ...rest } = options;
  const url = `${NECESSITY_BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;

  const headers: any = { ...defaultHeaders, ...options.headers };
  const token = authTokenGetter?.() ?? null;
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    console.log('Request URL:', url);
    console.log('Request options:', { ...rest, headers, body });
    console.log('Request body:', JSON.stringify(body));
    const response = await fetch(url, {
      ...rest,
      signal: controller.signal,
      headers,
      body: body ? JSON.stringify(body) : options.body,
    });

    clearTimeout(timeoutId);

    const data = await response.json().catch(() => ({}));

    console.log(data, "----")

    if (!response.ok) {
      const necessityErr: NecessityError = new Error(
        getMessageFromData(data as NecessityErrorBody) ||
        response.statusText ||
        'Request failed'
      ) as NecessityError;
      necessityErr.status = response.status;
      necessityErr.data = data as NecessityErrorBody;
      throw necessityErr;
    }

    const success = (data as { success?: boolean }).success;
    if (success === false) {
      const necessityErr: NecessityError = new Error(
        getMessageFromData(data as NecessityErrorBody) || 'Request failed'
      ) as NecessityError;
      necessityErr.status = response.status;
      necessityErr.data = data as NecessityErrorBody;
      throw necessityErr;
    }

    return data as T;
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof Error) {
      if (e.name === 'AbortError') {
        const timeoutErr: NecessityError = new Error(
          'Request timed out. Please try again.'
        ) as NecessityError;
        throw timeoutErr;
      }
      throw e;
    }
    throw e;
  }
}

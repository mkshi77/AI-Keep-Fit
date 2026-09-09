export interface ApiRequest {
  method?: string;
  url?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
}

export interface ApiResponse {
  setHeader(name: string, value: string): void;
  status(code: number): ApiResponse;
  json(body: unknown): unknown;
}

const header = (request: ApiRequest, name: string) => {
  const value = request.headers[name] ?? request.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
};

export const isAllowedBrowserOrigin = (request: ApiRequest) => {
  const origin = header(request, 'origin');
  if (!origin) return !process.env.VERCEL_ENV;
  const host = header(request, 'x-forwarded-host') || header(request, 'host');
  if (!host) return false;
  try { return new URL(origin).host === host; } catch { return false; }
};

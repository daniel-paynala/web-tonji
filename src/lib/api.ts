const BASE = import.meta.env.VITE_API_URL ?? 'http://51.44.254.213'

function token(): string | null {
  try {
    const raw = localStorage.getItem('tonji-auth')
    if (!raw) return null
    return JSON.parse(raw)?.state?.token ?? null
  } catch {
    return null
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
  const t = token()
  if (t) headers['Authorization'] = `Bearer ${t}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    // Laravel renvoie les erreurs dans `message` ou `errors`
    const msg =
      (data as { message?: string }).message ||
      Object.values((data as { errors?: Record<string, string[]> }).errors ?? {})
        .flat()
        .join(' ') ||
      `Erreur ${res.status}`
    throw new ApiError(res.status, msg)
  }

  return data as T
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export const api = {
  get:    <T>(path: string)              => request<T>('GET',    path),
  post:   <T>(path: string, body: unknown) => request<T>('POST',   path, body),
  patch:  <T>(path: string, body: unknown) => request<T>('PATCH',  path, body),
  delete: <T>(path: string)              => request<T>('DELETE', path),
}

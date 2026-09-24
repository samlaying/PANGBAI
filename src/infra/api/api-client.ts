/**
 * ApiClient
 * 统一的基础 HTTP 请求客户端
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function request<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let errorDetail: unknown;
    try {
      errorDetail = await response.json();
    } catch {
      errorDetail = await response.text();
    }
    throw new ApiError(
      `Request failed with status ${response.status}`,
      response.status,
      errorDetail,
    );
  }

  return response.json() as Promise<T>;
}

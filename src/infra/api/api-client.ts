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
  const method = (options?.method || "GET").toUpperCase();
  const maxRetries = method === "GET" ? 1 : 0;
  let attempt = 0;

  while (true) {
    try {
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

        if (response.status >= 500 && attempt < maxRetries) {
          attempt++;
          await new Promise((resolve) => setTimeout(resolve, 500));
          continue;
        }

        throw new ApiError(
          `Request failed with status ${response.status}`,
          response.status,
          errorDetail,
        );
      }

      return (await response.json()) as T;
    } catch (err) {
      if (
        attempt < maxRetries &&
        err instanceof Error &&
        !(err instanceof ApiError && err.status < 500)
      ) {
        attempt++;
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      }
      throw err;
    }
  }
}

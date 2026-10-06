export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(path, options);
  } catch {
    throw new ApiError("Cannot reach the SafeTour 360 server.", 0);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message === "string"
        ? data.message
        : "The request could not be completed.";
    throw new ApiError(message, response.status);
  }

  return data as T;
}

export function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export function jsonRequest(body: unknown, token?: string): RequestInit {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? authHeaders(token) : {}),
    },
    body: JSON.stringify(body),
  };
}

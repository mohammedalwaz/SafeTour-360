import type {
  LoginInput,
  LoginResponse,
  PublicUser,
  RegisterInput,
  UserRole,
} from "../features/auth/types";

const AUTH_PATH = "/api/auth";

export class AuthApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AuthApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(path, options);
  } catch {
    throw new AuthApiError("Cannot reach the SafeTour 360 server.", 0);
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
    throw new AuthApiError(message, response.status);
  }

  return data as T;
}

function jsonRequest(body: unknown): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export const authApi = {
  register(input: RegisterInput): Promise<{ message: string; user: PublicUser }> {
    return request(`${AUTH_PATH}/register`, jsonRequest(input));
  },

  login(input: LoginInput): Promise<LoginResponse> {
    return request(`${AUTH_PATH}/login`, jsonRequest(input));
  },

  getCurrentUser(token: string): Promise<{ user: PublicUser }> {
    return request(`${AUTH_PATH}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  checkRole(token: string, role: UserRole): Promise<{ message: string }> {
    return request(`/api/${role}/access`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

import type {
  LoginInput,
  LoginResponse,
  PublicUser,
  RegisterInput,
  UserRole,
} from "../features/auth/types";
import { apiRequest, authHeaders, jsonRequest, ApiError } from "./http";

export class AuthApiError extends ApiError {
  constructor(message: string, status: number) {
    super(message, status);
    this.name = "AuthApiError";
  }
}

const AUTH_PATH = "/api/auth";

export const authApi = {
  register(input: RegisterInput): Promise<{ message: string; user: PublicUser }> {
    return apiRequest(`${AUTH_PATH}/register`, jsonRequest(input));
  },

  login(input: LoginInput): Promise<LoginResponse> {
    return apiRequest(`${AUTH_PATH}/login`, jsonRequest(input));
  },

  getCurrentUser(token: string): Promise<{ user: PublicUser }> {
    return apiRequest(`${AUTH_PATH}/me`, {
      headers: authHeaders(token),
    });
  },

  checkRole(token: string, role: UserRole): Promise<{ message: string }> {
    return apiRequest(`/api/${role}/access`, {
      headers: authHeaders(token),
    });
  },
};

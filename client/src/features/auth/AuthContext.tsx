import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authApi } from "../../services/auth-api";
import { ApiError } from "../../services/http";
import type {
  LoginInput,
  PublicUser,
  RegisterInput,
} from "./types";

const TOKEN_STORAGE_KEY = "safetour360_access_token";

export type AuthStatus =
  | "loading"
  | "authenticated"
  | "unauthenticated"
  | "unavailable";

interface AuthContextValue {
  status: AuthStatus;
  user: PublicUser | null;
  token: string | null;
  error: string | null;
  login: (input: LoginInput) => Promise<PublicUser>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<PublicUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!savedToken) {
      setStatus("unauthenticated");
      return;
    }

    let isCurrent = true;
    setToken(savedToken);

    void authApi
      .getCurrentUser(savedToken)
      .then(({ user: currentUser }) => {
        if (!isCurrent) return;
        setUser(currentUser);
        setStatus("authenticated");
      })
      .catch((requestError: unknown) => {
        if (!isCurrent) return;

        if (
          requestError instanceof ApiError &&
          requestError.status === 401
        ) {
          window.localStorage.removeItem(TOKEN_STORAGE_KEY);
          setToken(null);
          setUser(null);
          setStatus("unauthenticated");
          setError("Your login has expired. Please log in again.");
          return;
        }

        setStatus("unavailable");
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Authentication is temporarily unavailable.",
        );
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const login = useCallback(async (input: LoginInput): Promise<PublicUser> => {
    const session = await authApi.login(input);
    window.localStorage.setItem(TOKEN_STORAGE_KEY, session.token);
    setToken(session.token);
    setUser(session.user);
    setError(null);
    setStatus("authenticated");
    return session.user;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    await authApi.register(input);
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setError(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo(
    () => ({ status, user, token, error, login, register, logout }),
    [status, user, token, error, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return context;
}

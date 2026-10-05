import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "./AuthContext";
import type { UserRole } from "./types";
import { authApi, AuthApiError } from "../../services/auth-api";

interface AuthenticatedAreaProps {
  role: UserRole;
}

export default function AuthenticatedArea({ role }: AuthenticatedAreaProps) {
  const { user, token, logout } = useAuth();
  const [accessMessage, setAccessMessage] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const title = role === "admin" ? "Admin area" : "Tourist area";

  useEffect(() => {
    if (!token) return;

    let isCurrent = true;
    void authApi
      .checkRole(token, role)
      .then(({ message }) => {
        if (isCurrent) setAccessMessage(message);
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          setAccessError(
            error instanceof AuthApiError || error instanceof Error
              ? error.message
              : "Could not verify this account's role.",
          );
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [role, token]);

  return (
    <main className="account-page">
      <header className="account-topbar">
        <Link className="brand" to="/" aria-label="SafeTour 360 home">
          <span className="brand-mark" aria-hidden="true">
            S
          </span>
          <span>SafeTour 360</span>
        </Link>
        <button className="button button-quiet" onClick={logout}>
          Log out
        </button>
      </header>
      <section className="account-content">
        <p className="eyebrow">
          {role === "admin" ? "ADMIN ACCOUNT" : "TOURIST ACCOUNT"}
        </p>
        <h1>{title}</h1>
        <p className="account-welcome">
          Welcome, <strong>{user?.name}</strong>
        </p>
        <div className="account-panel">
          <span className="account-role">{user?.role}</span>
          <p>{user?.email}</p>
          <p className="account-helper">
            This page confirms your authenticated account and role. Other
            SafeTour 360 features will be added in later phases.
          </p>
          {accessMessage && (
            <p className="form-notice" role="status">
              {accessMessage}
            </p>
          )}
          {accessError && (
            <p className="form-error" role="alert">
              {accessError}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

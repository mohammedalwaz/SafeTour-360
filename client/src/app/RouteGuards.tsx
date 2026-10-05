import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import type { UserRole } from "../features/auth/types";

function destinationFor(role: UserRole): string {
  return role === "admin" ? "/admin" : "/tourist";
}

function AuthLoading() {
  return (
    <main className="auth-state-screen" aria-live="polite">
      <span className="loading-indicator" />
      <p>Checking your login…</p>
    </main>
  );
}

function AuthUnavailable({ message }: { message: string | null }) {
  return (
    <main className="auth-state-screen">
      <p className="eyebrow">AUTHENTICATION UNAVAILABLE</p>
      <h1>We couldn’t confirm your account.</h1>
      <p>{message ?? "Please check the server and try again."}</p>
      <button className="button button-primary" onClick={() => window.location.reload()}>
        Try again
      </button>
    </main>
  );
}

export function PublicOnlyRoute() {
  const { status, user } = useAuth();

  if (status === "loading") return <AuthLoading />;
  if (status === "authenticated" && user) {
    return <Navigate to={destinationFor(user.role)} replace />;
  }

  return <Outlet />;
}

export function RequireRoleRoute({ role }: { role: UserRole }) {
  const { status, user, error } = useAuth();
  const location = useLocation();

  if (status === "loading") return <AuthLoading />;
  if (status === "unavailable") return <AuthUnavailable message={error} />;
  if (status !== "authenticated" || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (user.role !== role) {
    return <Navigate to={destinationFor(user.role)} replace />;
  }

  return <Outlet />;
}

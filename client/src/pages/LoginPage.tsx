import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { useAuth } from "../features/auth/AuthContext";
import { AuthApiError } from "../services/auth-api";

interface LoginLocationState {
  notice?: string;
}

export default function LoginPage() {
  const { login, error: authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LoginLocationState | null;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const user = await login({ email, password });
      navigate(user.role === "admin" ? "/admin" : "/tourist", {
        replace: true,
      });
    } catch (submitError) {
      setError(
        submitError instanceof AuthApiError || submitError instanceof Error
          ? submitError.message
          : "Could not log in. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="WELCOME BACK"
      title="Log in"
      description="Use your SafeTour 360 account to continue."
      footer={
        <span>
          New to SafeTour 360? <Link to="/register">Create an account</Link>
        </span>
      }
    >
      {locationState?.notice && (
        <p className="form-notice" role="status">
          {locationState.notice}
        </p>
      )}
      {(error || authError) && (
        <p className="form-error" role="alert">
          {error ?? authError}
        </p>
      )}
      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="form-field">
          <span>Email address</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="form-field">
          <span>Password</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <button
          className="button button-primary"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Logging in…" : "Log in"}
        </button>
      </form>
    </AuthLayout>
  );
}

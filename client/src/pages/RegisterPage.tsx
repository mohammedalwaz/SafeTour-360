import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { useAuth } from "../features/auth/AuthContext";
import { AuthApiError } from "../services/auth-api";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await register({
        name,
        email,
        password,
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      });
      navigate("/login", {
        replace: true,
        state: { notice: "Your tourist account is ready. Please log in." },
      });
    } catch (submitError) {
      setError(
        submitError instanceof AuthApiError || submitError instanceof Error
          ? submitError.message
          : "Could not create your account. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="JOIN SAFETOUR 360"
      title="Create your account"
      description="Register as a tourist to get started."
      footer={
        <span>
          Already registered? <Link to="/login">Log in</Link>
        </span>
      }
    >
      <p className="form-helper">
        Public registration creates a tourist account. Admin accounts are
        created separately by the project administrator.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="form-field">
          <span>Full name</span>
          <input
            type="text"
            name="name"
            autoComplete="name"
            minLength={2}
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </label>
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
          <span>Phone <span className="form-optional">Optional</span></span>
          <input
            type="tel"
            name="phone"
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </label>
        <label className="form-field">
          <span>Password</span>
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <small>Use at least 8 characters.</small>
        </label>
        <button
          className="button button-primary"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating account…" : "Create tourist account"}
        </button>
      </form>
    </AuthLayout>
  );
}

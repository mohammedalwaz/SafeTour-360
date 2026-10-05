import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface AuthLayoutProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}

export default function AuthLayout({
  eyebrow,
  title,
  description,
  children,
  footer,
}: AuthLayoutProps) {
  return (
    <main className="auth-page">
      <header className="auth-topbar">
        <Link className="brand" to="/" aria-label="SafeTour 360 home">
          <span className="brand-mark" aria-hidden="true">
            S
          </span>
          <span>SafeTour 360</span>
        </Link>
        <span className="auth-topbar-note">PHASE 2 · AUTHENTICATION</span>
      </header>

      <section className="auth-content">
        <div className="auth-panel">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="auth-description">{description}</p>
          {children}
          <div className="auth-footer">{footer}</div>
        </div>
      </section>
    </main>
  );
}

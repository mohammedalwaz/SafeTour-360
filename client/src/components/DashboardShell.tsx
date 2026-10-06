import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface DashboardShellProps {
  roleLabel: string;
  title: string;
  welcome: string;
  onLogout: () => void;
  children: ReactNode;
}

export default function DashboardShell({
  roleLabel,
  title,
  welcome,
  onLogout,
  children,
}: DashboardShellProps) {
  return (
    <main className="dash-page">
      <header className="dash-topbar">
        <Link className="brand brand-light" to="/" aria-label="SafeTour 360 home">
          <span className="brand-mark" aria-hidden="true">
            S
          </span>
          <span>SafeTour 360</span>
        </Link>
        <button className="button button-quiet-light" onClick={onLogout} type="button">
          Log out
        </button>
      </header>
      <section className="dash-hero">
        <p className="eyebrow">{roleLabel}</p>
        <h1>{title}</h1>
        <p className="dash-welcome">{welcome}</p>
      </section>
      <section className="dash-grid">{children}</section>
    </main>
  );
}

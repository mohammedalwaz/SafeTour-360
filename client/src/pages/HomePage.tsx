import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="page-shell">
      <header className="topbar">
        <Link className="brand" to="/" aria-label="SafeTour 360 home">
          <span className="brand-mark" aria-hidden="true">
            S
          </span>
          <span>SafeTour 360</span>
        </Link>
        <nav className="home-nav" aria-label="Account">
          <Link to="/login">Log in</Link>
          <Link className="home-nav-primary" to="/register">
            Create account
          </Link>
        </nav>
      </header>

      <main className="hero">
        <div className="hero-copy">
          <p className="eyebrow">TOURIST SAFETY PLATFORM</p>
          <h1>SafeTour 360</h1>
          <p className="subtitle">
            Intelligent Tourist Safety &amp; Incident Response Platform
          </p>
          <p className="supporting-copy">
            A responsive foundation for safer, more informed journeys.
          </p>
        </div>

        <div className="visual" aria-hidden="true">
          <div className="visual-orbit visual-orbit-outer" />
          <div className="visual-orbit visual-orbit-inner" />
          <div className="visual-center">
            <span className="visual-center-dot" />
          </div>
          <span className="visual-point visual-point-one" />
          <span className="visual-point visual-point-two" />
          <span className="visual-point visual-point-three" />
        </div>
      </main>

      <footer className="footer">
        <span>Designed for mobile and desktop</span>
        <span className="footer-indicator">
          <span className="indicator-dot" />
          Phase 2 · Authentication
        </span>
      </footer>
    </div>
  );
}

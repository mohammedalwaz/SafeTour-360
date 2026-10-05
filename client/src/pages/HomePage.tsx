export default function HomePage() {
  return (
    <div className="page-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="SafeTour 360 home">
          <span className="brand-mark" aria-hidden="true">
            S
          </span>
          <span>SafeTour 360</span>
        </a>
        <span className="phase-label">PHASE 1 · FOUNDATION</span>
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
          Project foundation
        </span>
      </footer>
    </div>
  );
}

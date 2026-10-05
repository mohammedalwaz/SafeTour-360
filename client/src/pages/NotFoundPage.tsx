import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <main className="not-found">
      <p className="eyebrow">PAGE NOT FOUND</p>
      <h1>This page isn’t available yet.</h1>
      <Link to="/">Return to SafeTour 360</Link>
    </main>
  );
}

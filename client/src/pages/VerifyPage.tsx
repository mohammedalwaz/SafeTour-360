import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../services/http";
import { verifyApi } from "../services/safetour-api";

export default function VerifyPage() {
  const { token } = useParams();
  const [message, setMessage] = useState("Checking Digital ID…");
  const [valid, setValid] = useState<boolean | null>(null);
  const [details, setDetails] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setValid(false);
      setMessage("Missing verification token.");
      return;
    }

    void verifyApi
      .verify(token)
      .then((result) => {
        setValid(result.valid);
        setMessage(result.message);
        if (result.holder) {
          setDetails(
            `${result.holder.name} · ${result.holder.idNumber} · expires ${new Date(result.holder.expiresAt).toLocaleString()}`,
          );
        }
      })
      .catch((error: unknown) => {
        setValid(false);
        setMessage(
          error instanceof ApiError || error instanceof Error
            ? error.message
            : "Could not verify this Digital ID.",
        );
      });
  }, [token]);

  return (
    <main className="auth-page">
      <header className="auth-topbar">
        <Link className="brand" to="/" aria-label="SafeTour 360 home">
          <span className="brand-mark" aria-hidden="true">
            S
          </span>
          <span>SafeTour 360</span>
        </Link>
      </header>
      <section className="auth-content">
        <div className="auth-panel">
          <p className="eyebrow">DIGITAL ID CHECK</p>
          <h1>{valid ? "Valid ID" : valid === false ? "Not valid" : "Verifying"}</h1>
          <p className="auth-description">{message}</p>
          {details && <p>{details}</p>}
          <p className="muted">
            This check uses a hashed token and expiry. It is not a blockchain record.
          </p>
        </div>
      </section>
    </main>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import QRCode from "qrcode";
import DashboardShell from "../components/DashboardShell";
import TouristMap from "../components/TouristMap";
import { useAuth } from "../features/auth/AuthContext";
import {
  INCIDENT_CATEGORIES,
  type SosAlert,
  type TouristOverview,
} from "../features/safety/types";
import { useGeolocation } from "../hooks/useGeolocation";
import { useSafetySocket } from "../hooks/useSafetySocket";
import { ApiError } from "../services/http";
import { touristApi } from "../services/safetour-api";

function labelCategory(value: string): string {
  return value.replaceAll("_", " ");
}

export default function TouristDashboard() {
  const { user, token, logout } = useAuth();
  const { status: gpsStatus, position, message: gpsMessage } = useGeolocation();
  const [overview, setOverview] = useState<TouristOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sosBusy, setSosBusy] = useState(false);
  const [incidentBusy, setIncidentBusy] = useState(false);
  const [idBusy, setIdBusy] = useState(false);
  const [category, setCategory] = useState<(typeof INCIDENT_CATEGORIES)[number]>("unsafe_area");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState(2);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const lastSent = useRef(0);

  const loadOverview = useCallback(async () => {
    if (!token) return;
    try {
      const data = await touristApi.overview(token);
      setOverview(data);
      setError(null);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError || requestError instanceof Error
          ? requestError.message
          : "Could not load the tourist dashboard.",
      );
    }
  }, [token]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const onSocketEvent = useCallback(
    (event: string, payload: unknown) => {
      if (event === "sos:updated" && payload && typeof payload === "object") {
        setOverview((current) =>
          current
            ? { ...current, sos: payload as SosAlert }
            : current,
        );
      }
      if (event === "safety:updated") {
        void loadOverview();
      }
    },
    [loadOverview],
  );

  useSafetySocket(token, onSocketEvent);

  useEffect(() => {
    if (!token || !position || gpsStatus !== "granted") return;
    const now = Date.now();
    if (now - lastSent.current < 15_000) return;
    lastSent.current = now;

    void touristApi
      .saveLocation(token, {
        latitude: position.latitude,
        longitude: position.longitude,
        ...(position.accuracy !== undefined ? { accuracy: position.accuracy } : {}),
      })
      .then((result) => {
        setOverview((current) =>
          current
            ? {
                ...current,
                location: result.location,
                locationStatus: "available",
                dangerZones: result.dangerZones,
                nearbyZones: result.nearbyZones,
                risk: result.risk,
              }
            : current,
        );
      })
      .catch((requestError: unknown) => {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Could not save your location.",
        );
      });
  }, [gpsStatus, position, token]);

  const mapPosition = position ?? (overview?.location
    ? {
        latitude: overview.location.latitude,
        longitude: overview.location.longitude,
      }
    : null);

  const canUseLiveMap = gpsStatus === "granted" && position !== null;

  const verificationUrl = overview?.digitalId?.verificationUrl;
  useEffect(() => {
    if (!verificationUrl) {
      setQrDataUrl(null);
      return;
    }
    void QRCode.toDataURL(verificationUrl, { width: 240, margin: 1 }).then(setQrDataUrl);
  }, [verificationUrl]);

  async function handleSos() {
    if (!token) return;
    setSosBusy(true);
    setError(null);
    try {
      const result = await touristApi.createSos(token, {
        ...(position
          ? {
              latitude: position.latitude,
              longitude: position.longitude,
              accuracy: position.accuracy,
            }
          : {}),
      });
      setOverview((current) => (current ? { ...current, sos: result.sos } : current));
      setNotice(result.message ?? "SOS sent. Responders can now see this alert.");
      void loadOverview();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not send SOS.");
    } finally {
      setSosBusy(false);
    }
  }

  async function handleIncident(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setIncidentBusy(true);
    setError(null);
    try {
      await touristApi.createIncident(token, {
        category,
        description,
        severity,
        ...(position
          ? { latitude: position.latitude, longitude: position.longitude }
          : {}),
      });
      setDescription("");
      setNotice("Incident reported. An admin can review it from the responder dashboard.");
      await loadOverview();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not report the incident.");
    } finally {
      setIncidentBusy(false);
    }
  }

  async function handleIssueId() {
    if (!token) return;
    setIdBusy(true);
    setError(null);
    try {
      const result = await touristApi.issueDigitalId(token);
      const url = result.digitalId.verificationUrl;
      setOverview((current) =>
        current ? { ...current, digitalId: result.digitalId } : current,
      );
      if (url) {
        setQrDataUrl(await QRCode.toDataURL(url, { width: 240, margin: 1 }));
      }
      setNotice("Digital ID issued. The QR encodes a verification URL, not a blockchain record.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not issue a Digital ID.");
    } finally {
      setIdBusy(false);
    }
  }

  async function handleRevokeId() {
    if (!token) return;
    setIdBusy(true);
    try {
      const result = await touristApi.revokeDigitalId(token);
      setOverview((current) =>
        current ? { ...current, digitalId: result.digitalId } : current,
      );
      setQrDataUrl(null);
      setNotice("Digital ID revoked.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not revoke the Digital ID.");
    } finally {
      setIdBusy(false);
    }
  }

  const risk = overview?.risk;
  const sos = overview?.sos;
  const danger = overview?.dangerZones?.[0];

  const gpsLabel = useMemo(() => {
    if (gpsStatus === "granted") return "Location available";
    if (gpsStatus === "denied") return "Permission denied";
    if (gpsStatus === "requesting") return "Requesting GPS…";
    if (gpsStatus === "unavailable") return "GPS unavailable";
    return "Waiting for location";
  }, [gpsStatus]);

  return (
    <DashboardShell
      roleLabel="TOURIST DASHBOARD"
      title="Stay visible. Stay safe."
      welcome={`Welcome, ${user?.name ?? "tourist"}.`}
      onLogout={logout}
    >
      {error && (
        <p className="form-error dash-banner" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="form-notice dash-banner" role="status">
          {notice}
        </p>
      )}

      <article className="dash-card">
        <h2>Account</h2>
        <p className="dash-kicker">{user?.email}</p>
        {user?.phone && <p>{user.phone}</p>}
        <p className="muted">Role is locked to tourist for public registration.</p>
      </article>

      <article className="dash-card">
        <h2>Location status</h2>
        <p className="status-pill">{gpsLabel}</p>
        {gpsMessage && <p className="muted">{gpsMessage}</p>}
        {canUseLiveMap && mapPosition ? (
          <TouristMap
            latitude={mapPosition.latitude}
            longitude={mapPosition.longitude}
            zones={overview?.nearbyZones ?? []}
          />
        ) : (
          <p className="muted">
            The map appears after the browser grants location access. SafeTour 360
            will not invent a GPS position.
          </p>
        )}
      </article>

      <article className={`dash-card ${danger ? "dash-card-alert" : ""}`}>
        <h2>Danger zone</h2>
        {danger ? (
          <p>
            You are inside <strong>{danger.name}</strong> ({danger.radiusMeters} m
            radius).
          </p>
        ) : (
          <p className="muted">No active danger zone detected at your current position.</p>
        )}
      </article>

      <article className="dash-card">
        <h2>Safety / risk</h2>
        <p className={`risk-level risk-${risk?.level?.toLowerCase() ?? "low"}`}>
          {risk?.level ?? "—"} · {risk?.score ?? "—"}
        </p>
        <p className="muted">Rules-based assessment, not machine learning.</p>
        <ul className="reason-list">
          {(risk?.reasons ?? []).map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </article>

      <article className="dash-card dash-card-sos">
        <h2>Emergency SOS</h2>
        <p className="muted">
          Current status: <strong>{sos?.status ?? "none"}</strong>
        </p>
        <button
          className="button button-sos"
          type="button"
          onClick={() => void handleSos()}
          disabled={sosBusy || Boolean(sos && sos.status !== "resolved")}
        >
          {sosBusy ? "Sending…" : sos && sos.status !== "resolved" ? "SOS already open" : "Send SOS"}
        </button>
      </article>

      <article className="dash-card">
        <h2>Report incident</h2>
        <form className="auth-form" onSubmit={(event) => void handleIncident(event)}>
          <label className="form-field">
            <span>Category</span>
            <select value={category} onChange={(event) => setCategory(event.target.value as typeof category)}>
              {INCIDENT_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {labelCategory(item)}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Severity (1–5)</span>
            <input
              type="number"
              min={1}
              max={5}
              value={severity}
              onChange={(event) => setSeverity(Number(event.target.value))}
              required
            />
          </label>
          <label className="form-field">
            <span>Description</span>
            <textarea
              minLength={8}
              maxLength={2000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
            />
          </label>
          <button className="button button-primary" type="submit" disabled={incidentBusy}>
            {incidentBusy ? "Submitting…" : "Submit report"}
          </button>
        </form>
      </article>

      <article className="dash-card">
        <h2>Digital ID</h2>
        <p className="muted">
          {overview?.digitalId
            ? `ID ${overview.digitalId.idNumber} · ${overview.digitalId.isValid ? "valid" : "inactive"}`
            : "No Digital ID issued yet."}
        </p>
        {qrDataUrl && (
          <img className="qr-image" src={qrDataUrl} alt="Digital ID verification QR code" />
        )}
        {overview?.digitalId?.verificationUrl && (
          <p className="muted break-all">{overview.digitalId.verificationUrl}</p>
        )}
        <div className="button-row">
          <button className="button button-primary" type="button" onClick={() => void handleIssueId()} disabled={idBusy}>
            {idBusy ? "Working…" : "Generate / refresh QR"}
          </button>
          <button className="button button-quiet" type="button" onClick={() => void handleRevokeId()} disabled={idBusy || !overview?.digitalId}>
            Revoke
          </button>
        </div>
      </article>

      <article className="dash-card dash-card-wide">
        <h2>Recent incidents & SOS</h2>
        <ul className="plain-list">
          {sos && (
            <li>
              SOS · {sos.status} · {new Date(sos.createdAt).toLocaleString()}
            </li>
          )}
          {(overview?.incidents ?? []).map((incident) => (
            <li key={incident.id}>
              {labelCategory(incident.category)} · {incident.status} · severity {incident.severity}
            </li>
          ))}
          {!sos && (overview?.incidents.length ?? 0) === 0 && (
            <li className="muted">No recent reports.</li>
          )}
        </ul>
      </article>
    </DashboardShell>
  );
}

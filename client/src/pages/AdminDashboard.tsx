import { useCallback, useEffect, useState, type FormEvent } from "react";
import DashboardShell from "../components/DashboardShell";
import { useAuth } from "../features/auth/AuthContext";
import type {
  AdminOverview,
  IncidentRecord,
  SosAlert,
  SosStatus,
} from "../features/safety/types";
import { useSafetySocket } from "../hooks/useSafetySocket";
import { ApiError } from "../services/http";
import { adminApi } from "../services/safetour-api";

const SOS_ACTIONS: { status: Exclude<SosStatus, "active">; label: string }[] = [
  { status: "acknowledged", label: "Acknowledge" },
  { status: "responding", label: "Responding" },
  { status: "resolved", label: "Resolve" },
];

export default function AdminDashboard() {
  const { user, token, logout } = useAuth();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<IncidentRecord | null>(null);
  const [zoneName, setZoneName] = useState("Demo danger zone");
  const [zoneLat, setZoneLat] = useState("");
  const [zoneLng, setZoneLng] = useState("");
  const [zoneRadius, setZoneRadius] = useState("400");
  const [zoneBusy, setZoneBusy] = useState(false);

  const loadOverview = useCallback(async () => {
    if (!token) return;
    try {
      const data = await adminApi.overview(token);
      setOverview(data);
      setError(null);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError || requestError instanceof Error
          ? requestError.message
          : "Could not load the admin dashboard.",
      );
    }
  }, [token]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const onSocketEvent = useCallback(() => {
    void loadOverview();
  }, [loadOverview]);

  useSafetySocket(token, onSocketEvent);

  async function handleSos(id: string, status: Exclude<SosStatus, "active">) {
    if (!token) return;
    try {
      await adminApi.updateSos(token, id, { status });
      setNotice(`SOS marked as ${status}.`);
      await loadOverview();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not update SOS.");
    }
  }

  async function openIncident(id: string) {
    if (!token) return;
    try {
      const result = await adminApi.getIncident(token, id);
      setSelectedIncident(result.incident);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load incident.");
    }
  }

  async function updateIncident(id: string, status: IncidentRecord["status"]) {
    if (!token) return;
    try {
      const result = await adminApi.updateIncident(token, id, { status });
      setSelectedIncident(result.incident);
      setNotice(`Incident marked ${status.replaceAll("_", " ")}.`);
      await loadOverview();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not update incident.");
    }
  }

  async function createZone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const latitude = Number(zoneLat);
    const longitude = Number(zoneLng);
    const radiusMeters = Number(zoneRadius);
    setZoneBusy(true);
    try {
      await adminApi.createGeofence(token, {
        name: zoneName,
        type: "danger",
        latitude,
        longitude,
        radiusMeters,
        severity: 4,
        isActive: true,
      });
      setNotice("Danger zone saved. Tourists inside this radius will see a warning.");
      await loadOverview();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not create geofence.");
    } finally {
      setZoneBusy(false);
    }
  }

  const analytics = overview?.analytics;

  return (
    <DashboardShell
      roleLabel="ADMIN / RESPONDER"
      title="Live safety operations"
      welcome={`Signed in as ${user?.name ?? "admin"}.`}
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

      <article className="dash-card dash-card-wide">
        <h2>Analytics</h2>
        <div className="stat-row">
          <div>
            <strong>{analytics?.totalTourists ?? "—"}</strong>
            <span>Tourists</span>
          </div>
          <div>
            <strong>{analytics?.activeSos ?? "—"}</strong>
            <span>Active SOS</span>
          </div>
          <div>
            <strong>{analytics?.openIncidents ?? "—"}</strong>
            <span>Open incidents</span>
          </div>
          <div>
            <strong>{analytics?.resolvedIncidents ?? "—"}</strong>
            <span>Resolved incidents</span>
          </div>
          <div>
            <strong>{analytics?.highOrCriticalRiskTourists ?? "—"}</strong>
            <span>High / critical risk</span>
          </div>
        </div>
      </article>

      <article className="dash-card dash-card-wide">
        <h2>Active SOS</h2>
        {(overview?.sosAlerts.length ?? 0) === 0 && (
          <p className="muted">No open SOS alerts in the database.</p>
        )}
        <ul className="plain-list">
          {overview?.sosAlerts.map((alert: SosAlert) => (
            <li key={alert.id} className="stack-item">
              <div>
                <strong>{alert.tourist?.name ?? "Tourist"}</strong>
                <p className="muted">
                  {alert.status}
                  {alert.location
                    ? ` · ${alert.location.latitude.toFixed(4)}, ${alert.location.longitude.toFixed(4)}`
                    : " · no GPS attached"}
                </p>
              </div>
              <div className="button-row">
                {SOS_ACTIONS.filter((action) => {
                  if (alert.status === "active") return true;
                  if (alert.status === "acknowledged") return action.status !== "acknowledged";
                  if (alert.status === "responding") return action.status === "resolved";
                  return false;
                }).map((action) => (
                  <button
                    key={action.status}
                    className="button button-quiet"
                    type="button"
                    onClick={() => void handleSos(alert.id, action.status)}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </article>

      <article className="dash-card dash-card-wide">
        <h2>Tourists</h2>
        <ul className="plain-list">
          {(overview?.tourists ?? []).map((tourist) => (
            <li key={tourist.id}>
              <strong>{tourist.name}</strong> · {tourist.email}
              {tourist.risk
                ? ` · ${tourist.risk.level} (${tourist.risk.score})`
                : " · no risk yet"}
              {tourist.location
                ? ` · ${tourist.location.latitude.toFixed(3)}, ${tourist.location.longitude.toFixed(3)}`
                : " · location unknown"}
            </li>
          ))}
          {(overview?.tourists.length ?? 0) === 0 && (
            <li className="muted">No tourists registered yet.</li>
          )}
        </ul>
      </article>

      <article className="dash-card dash-card-wide">
        <h2>Incidents</h2>
        <ul className="plain-list">
          {(overview?.incidents ?? []).map((incident) => (
            <li key={incident.id} className="stack-item">
              <div>
                <strong>{incident.category.replaceAll("_", " ")}</strong>
                <p className="muted">
                  {incident.status} · severity {incident.severity} ·{" "}
                  {incident.reporter?.name ?? "tourist"}
                </p>
              </div>
              <button
                className="button button-quiet"
                type="button"
                onClick={() => void openIncident(incident.id)}
              >
                View
              </button>
            </li>
          ))}
        </ul>
        {selectedIncident && (
          <div className="incident-detail">
            <h3>Incident detail</h3>
            <p>{selectedIncident.description}</p>
            <p className="muted">
              Status {selectedIncident.status}
              {selectedIncident.latitude != null && selectedIncident.longitude != null
                ? ` · ${selectedIncident.latitude}, ${selectedIncident.longitude}`
                : ""}
            </p>
            <div className="button-row">
              <button className="button button-quiet" type="button" onClick={() => void updateIncident(selectedIncident.id, "under_review")}>
                Under review
              </button>
              <button className="button button-quiet" type="button" onClick={() => void updateIncident(selectedIncident.id, "resolved")}>
                Resolve
              </button>
            </div>
          </div>
        )}
      </article>

      <article className="dash-card dash-card-wide">
        <h2>Danger zones</h2>
        <ul className="plain-list">
          {(overview?.geofences ?? []).map((zone) => (
            <li key={zone.id}>
              {zone.name} · {zone.type} · {zone.radiusMeters} m ·{" "}
              {zone.isActive ? "active" : "inactive"}
            </li>
          ))}
        </ul>
        <form className="auth-form" onSubmit={(event) => void createZone(event)}>
          <label className="form-field">
            <span>Name</span>
            <input value={zoneName} onChange={(event) => setZoneName(event.target.value)} required />
          </label>
          <label className="form-field">
            <span>Center latitude</span>
            <input value={zoneLat} onChange={(event) => setZoneLat(event.target.value)} required />
          </label>
          <label className="form-field">
            <span>Center longitude</span>
            <input value={zoneLng} onChange={(event) => setZoneLng(event.target.value)} required />
          </label>
          <label className="form-field">
            <span>Radius (meters)</span>
            <input value={zoneRadius} onChange={(event) => setZoneRadius(event.target.value)} required />
          </label>
          <button className="button button-primary" type="submit" disabled={zoneBusy}>
            {zoneBusy ? "Saving…" : "Add danger zone"}
          </button>
        </form>
      </article>
    </DashboardShell>
  );
}

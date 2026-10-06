import { apiRequest, authHeaders, jsonRequest } from "./http";
import type {
  AdminOverview,
  DigitalIdSummary,
  IncidentRecord,
  SosAlert,
  TouristOverview,
} from "../features/safety/types";

export const touristApi = {
  overview(token: string): Promise<TouristOverview> {
    return apiRequest("/api/tourist/overview", { headers: authHeaders(token) });
  },

  saveLocation(
    token: string,
    body: { latitude: number; longitude: number; accuracy?: number },
  ) {
    return apiRequest<{
      location: TouristOverview["location"];
      dangerZones: TouristOverview["dangerZones"];
      nearbyZones: TouristOverview["nearbyZones"];
      risk: TouristOverview["risk"];
    }>("/api/tourist/location", jsonRequest(body, token));
  },

  createSos(
    token: string,
    body: { latitude?: number; longitude?: number; accuracy?: number },
  ): Promise<{ sos: SosAlert; message?: string }> {
    return apiRequest("/api/tourist/sos", jsonRequest(body, token));
  },

  createIncident(
    token: string,
    body: {
      category: string;
      description: string;
      severity: number;
      latitude?: number;
      longitude?: number;
    },
  ): Promise<{ incident: IncidentRecord }> {
    return apiRequest("/api/tourist/incidents", jsonRequest(body, token));
  },

  issueDigitalId(token: string): Promise<{ digitalId: DigitalIdSummary }> {
    return apiRequest("/api/tourist/digital-id", {
      method: "POST",
      headers: authHeaders(token),
    });
  },

  revokeDigitalId(token: string): Promise<{ digitalId: DigitalIdSummary }> {
    return apiRequest("/api/tourist/digital-id/revoke", {
      method: "POST",
      headers: authHeaders(token),
    });
  },
};

export const adminApi = {
  overview(token: string): Promise<AdminOverview> {
    return apiRequest("/api/admin/overview", { headers: authHeaders(token) });
  },

  updateSos(
    token: string,
    id: string,
    body: { status: string; adminNote?: string },
  ): Promise<{ sos: SosAlert }> {
    return apiRequest(`/api/admin/sos/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(token),
      },
      body: JSON.stringify(body),
    });
  },

  getIncident(token: string, id: string): Promise<{ incident: IncidentRecord }> {
    return apiRequest(`/api/admin/incidents/${id}`, {
      headers: authHeaders(token),
    });
  },

  updateIncident(
    token: string,
    id: string,
    body: { status?: string; adminNote?: string },
  ): Promise<{ incident: IncidentRecord }> {
    return apiRequest(`/api/admin/incidents/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(token),
      },
      body: JSON.stringify(body),
    });
  },

  createGeofence(
    token: string,
    body: {
      name: string;
      type: "safe" | "danger";
      latitude: number;
      longitude: number;
      radiusMeters: number;
      severity: number;
      isActive?: boolean;
    },
  ) {
    return apiRequest("/api/admin/geofences", jsonRequest(body, token));
  },
};

export const verifyApi = {
  verify(token: string): Promise<{
    valid: boolean;
    status: string;
    message: string;
    holder?: { name: string; idNumber: string; expiresAt: string };
    idNumber?: string;
  }> {
    return apiRequest(`/api/verify/${encodeURIComponent(token)}`);
  },
};

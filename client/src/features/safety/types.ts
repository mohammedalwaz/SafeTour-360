export const INCIDENT_CATEGORIES = [
  "accident",
  "medical",
  "lost_tourist",
  "unsafe_area",
  "suspicious_activity",
  "natural_disaster",
  "other",
] as const;

export type IncidentCategory = (typeof INCIDENT_CATEGORIES)[number];
export type IncidentStatus = "new" | "under_review" | "resolved";
export type SosStatus = "active" | "acknowledged" | "responding" | "resolved";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type GeofenceType = "safe" | "danger";

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  recordedAt?: string;
}

export interface NearbyGeofence {
  id: string;
  name: string;
  type: GeofenceType;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  severity: number;
  distanceMeters: number;
  isInside: boolean;
}

export interface RiskSummary {
  score: number;
  level: RiskLevel;
  reasons: string[];
  latitude: number | null;
  longitude: number | null;
  locationAvailable: boolean;
  insideDangerZone: boolean;
  assessedAt: string;
}

export interface SosAlert {
  id: string;
  userId: string;
  status: SosStatus;
  location: Coordinates | null;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  tourist?: { id: string; name: string; email: string; phone?: string };
}

export interface IncidentRecord {
  id: string;
  reportedBy: string;
  category: IncidentCategory;
  description: string;
  latitude: number | null;
  longitude: number | null;
  severity: number;
  status: IncidentStatus;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  reporter?: { id: string; name: string; email: string; phone?: string };
}

export interface DigitalIdSummary {
  idNumber: string;
  expiresAt: string | null;
  isRevoked: boolean;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isValid: boolean;
  verificationUrl?: string;
  token?: string;
}

export interface GeofenceRecord {
  id: string;
  name: string;
  type: GeofenceType;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  severity: number;
  isActive: boolean;
}

export interface TouristOverview {
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    role: "tourist" | "admin";
  };
  location: Coordinates | null;
  locationStatus: "available" | "unavailable";
  dangerZones: NearbyGeofence[];
  nearbyZones: NearbyGeofence[];
  risk: RiskSummary;
  sos: SosAlert | null;
  incidents: IncidentRecord[];
  digitalId: DigitalIdSummary | null;
}

export interface AdminAnalytics {
  totalTourists: number;
  activeSos: number;
  openIncidents: number;
  resolvedIncidents: number;
  highOrCriticalRiskTourists: number;
}

export interface AdminTourist {
  id: string;
  name: string;
  email: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  location: Coordinates | null;
  risk: {
    level: RiskLevel;
    score: number;
    insideDangerZone: boolean;
    assessedAt: string;
    reasons: string[];
  } | null;
}

export interface AdminOverview {
  analytics: AdminAnalytics;
  tourists: AdminTourist[];
  sosAlerts: SosAlert[];
  incidents: IncidentRecord[];
  geofences: GeofenceRecord[];
}

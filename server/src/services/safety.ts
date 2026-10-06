import { Types } from "mongoose";
import { IncidentModel } from "../models/Incident";
import { GeofenceModel, type GeofenceRecord } from "../models/Geofence";
import {
  RiskAssessmentModel,
  type RiskLevel,
} from "../models/RiskAssessment";
import { SOSAlertModel } from "../models/SOSAlert";

const EARTH_RADIUS_METERS = 6_371_000;
const INCIDENT_RADIUS_METERS = 2_000;
const INCIDENT_LOOKBACK_HOURS = 24;
const OPEN_SOS_STATUSES = ["active", "acknowledged", "responding"] as const;
const SAVE_THROTTLE_MS = 2 * 60 * 1000;

export interface NearbyGeofence {
  id: string;
  name: string;
  type: "safe" | "danger";
  latitude: number;
  longitude: number;
  radiusMeters: number;
  severity: number;
  distanceMeters: number;
  isInside: boolean;
}

export function distanceInMeters(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDifference = toRadians(latitudeB - latitudeA);
  const longitudeDifference = toRadians(longitudeB - longitudeA);
  const a =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(toRadians(latitudeA)) *
      Math.cos(toRadians(latitudeB)) *
      Math.sin(longitudeDifference / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function describeGeofence(
  zone: GeofenceRecord & { _id: Types.ObjectId },
  latitude: number,
  longitude: number,
): NearbyGeofence {
  const distanceMeters = Math.round(
    distanceInMeters(latitude, longitude, zone.latitude, zone.longitude),
  );

  return {
    id: zone._id.toString(),
    name: zone.name,
    type: zone.type,
    latitude: zone.latitude,
    longitude: zone.longitude,
    radiusMeters: zone.radiusMeters,
    severity: zone.severity,
    distanceMeters,
    isInside: distanceMeters <= zone.radiusMeters,
  };
}

export async function getNearbyGeofences(
  latitude: number,
  longitude: number,
): Promise<NearbyGeofence[]> {
  const zones = await GeofenceModel.find({ isActive: true }).lean();
  return zones
    .map((zone) =>
      describeGeofence(zone as GeofenceRecord & { _id: Types.ObjectId }, latitude, longitude),
    )
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}

export async function getActiveGeofences() {
  return GeofenceModel.find({ isActive: true })
    .select("name type latitude longitude radiusMeters severity isActive")
    .lean();
}

export function serializeRiskAssessment(assessment: {
  score: number;
  level: RiskLevel;
  reasons: string[];
  latitude?: number;
  longitude?: number;
  locationAvailable: boolean;
  insideDangerZone: boolean;
  assessedAt: Date;
}) {
  return {
    score: assessment.score,
    level: assessment.level,
    reasons: assessment.reasons,
    latitude: assessment.latitude ?? null,
    longitude: assessment.longitude ?? null,
    locationAvailable: assessment.locationAvailable,
    insideDangerZone: assessment.insideDangerZone,
    assessedAt: assessment.assessedAt.toISOString(),
  };
}

export async function getRiskAssessment(input: {
  userId: string;
  latitude?: number;
  longitude?: number;
  nearbyZones?: NearbyGeofence[];
  persist?: boolean;
}) {
  const now = new Date();
  const locationAvailable =
    typeof input.latitude === "number" && typeof input.longitude === "number";
  const nearbyZones =
    input.nearbyZones ??
    (locationAvailable
      ? await getNearbyGeofences(input.latitude!, input.longitude!)
      : []);

  const lookback = new Date(
    now.getTime() - INCIDENT_LOOKBACK_HOURS * 60 * 60 * 1000,
  );

  const openSos = await SOSAlertModel.findOne({
    userId: input.userId,
    status: { $in: OPEN_SOS_STATUSES },
  })
    .sort({ createdAt: -1 })
    .lean();

  const recentUserIncidents = await IncidentModel.find({
    reportedBy: input.userId,
    createdAt: { $gte: lookback },
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  let nearbyIncidents: typeof recentUserIncidents = [];
  if (locationAvailable) {
    const recentIncidents = await IncidentModel.find({
      status: { $ne: "resolved" },
      createdAt: { $gte: lookback },
      latitude: { $exists: true },
      longitude: { $exists: true },
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    nearbyIncidents = recentIncidents.filter(
      (incident) =>
        typeof incident.latitude === "number" &&
        typeof incident.longitude === "number" &&
        distanceInMeters(
          input.latitude!,
          input.longitude!,
          incident.latitude,
          incident.longitude,
        ) <= INCIDENT_RADIUS_METERS,
    );
  }

  const dangerZone = nearbyZones.find(
    (zone) => zone.type === "danger" && zone.isInside,
  );
  const safeZone = nearbyZones.find(
    (zone) => zone.type === "safe" && zone.isInside,
  );

  let score = 8;
  const reasons: string[] = [];

  if (!locationAvailable) {
    score += 18;
    reasons.push("Current location is unavailable, so zone checks are limited.");
  } else {
    reasons.push("Current location is available and was used for nearby checks.");
  }

  if (openSos) {
    if (openSos.status === "active") {
      score += 42;
      reasons.push("An active SOS alert is open for this tourist.");
    } else {
      score += 28;
      reasons.push(
        `An SOS alert is currently ${openSos.status} and has not been resolved.`,
      );
    }
  } else {
    reasons.push("No open SOS alert.");
  }

  if (dangerZone) {
    const dangerPoints = 22 + dangerZone.severity * 8;
    score += dangerPoints;
    reasons.push(
      `Inside danger zone "${dangerZone.name}" (severity ${dangerZone.severity}/5).`,
    );
  } else if (safeZone) {
    score = Math.max(0, score - 8);
    reasons.push(`Inside designated safe zone "${safeZone.name}".`);
  } else if (locationAvailable) {
    reasons.push("Not currently inside a known danger zone.");
  }

  const highestNearbySeverity = nearbyIncidents.reduce(
    (highest, incident) => Math.max(highest, incident.severity),
    0,
  );
  const incidentPoints = Math.min(
    32,
    nearbyIncidents.length * 6 + highestNearbySeverity * 4,
  );
  score += incidentPoints;

  if (nearbyIncidents.length > 0) {
    reasons.push(
      `${nearbyIncidents.length} recent open incident(s) within 2 km in the past 24 hours (highest severity ${highestNearbySeverity}/5).`,
    );
  } else if (locationAvailable) {
    reasons.push("No recent nearby incidents were found in available data.");
  }

  const ownSevereCount = recentUserIncidents.filter(
    (incident) => incident.severity >= 4,
  ).length;
  if (ownSevereCount > 0) {
    score += Math.min(12, ownSevereCount * 6);
    reasons.push(
      `${ownSevereCount} high-severity incident report(s) from this tourist in the past 24 hours.`,
    );
  }

  score = Math.min(100, Math.round(score));

  let level: RiskLevel = "LOW";
  if (openSos?.status === "active" || score >= 78) {
    level = "CRITICAL";
  } else if (score >= 55) {
    level = "HIGH";
  } else if (score >= 30) {
    level = "MEDIUM";
  }

  if (level === "CRITICAL" && openSos?.status === "active") {
    if (!reasons.some((reason) => reason.includes("active SOS"))) {
      reasons.unshift("Risk is CRITICAL because an SOS is active.");
    }
  }

  const payload = {
    userId: input.userId,
    score,
    level,
    reasons,
    ...(locationAvailable
      ? { latitude: input.latitude, longitude: input.longitude }
      : {}),
    locationAvailable,
    insideDangerZone: Boolean(dangerZone),
    dangerZoneEntered: Boolean(dangerZone),
    assessedAt: now,
  };

  if (input.persist === false) {
    return payload;
  }

  const latest = await RiskAssessmentModel.findOne({ userId: input.userId })
    .sort({ assessedAt: -1 })
    .lean();

  const shouldSave =
    !latest ||
    latest.level !== level ||
    latest.insideDangerZone !== Boolean(dangerZone) ||
    now.getTime() - new Date(latest.assessedAt).getTime() >= SAVE_THROTTLE_MS;

  if (shouldSave) {
    await RiskAssessmentModel.create(payload);
  }

  return payload;
}

import type { Types } from "mongoose";
import { IncidentModel } from "../models/Incident";
import { GeofenceModel, type GeofenceRecord } from "../models/Geofence";
import {
  RiskAssessmentModel,
  type RiskLevel,
} from "../models/RiskAssessment";

const EARTH_RADIUS_METERS = 6_371_000;
const INCIDENT_RADIUS_METERS = 2_000;
const INCIDENT_LOOKBACK_HOURS = 24;

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
    .map((zone) => describeGeofence(zone, latitude, longitude))
    .filter((zone) => zone.distanceMeters <= Math.max(zone.radiusMeters * 2, 5000))
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}

export async function getRiskAssessment(input: {
  userId: string;
  latitude: number;
  longitude: number;
  nearbyZones: NearbyGeofence[];
  dangerZoneEntered: boolean;
}) {
  const { userId, latitude, longitude, nearbyZones, dangerZoneEntered } = input;
  const now = new Date();
  const lookback = new Date(
    now.getTime() - INCIDENT_LOOKBACK_HOURS * 60 * 60 * 1000,
  );
  const recentIncidents = await IncidentModel.find({
    status: { $ne: "resolved" },
    createdAt: { $gte: lookback },
    latitude: { $exists: true },
    longitude: { $exists: true },
  })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  const nearbyIncidents = recentIncidents.filter(
    (incident) =>
      typeof incident.latitude === "number" &&
      typeof incident.longitude === "number" &&
      distanceInMeters(
        latitude,
        longitude,
        incident.latitude,
        incident.longitude,
      ) <= INCIDENT_RADIUS_METERS,
  );

  const dangerZone = nearbyZones.find(
    (zone) => zone.type === "danger" && zone.isInside,
  );
  const safeZone = nearbyZones.find(
    (zone) => zone.type === "safe" && zone.isInside,
  );
  const incidentPoints = Math.min(
    40,
    nearbyIncidents.reduce((total, incident) => total + incident.severity * 8, 0),
  );
  const dangerZonePoints = dangerZone ? 20 + dangerZone.severity * 10 : 0;
  const score = Math.min(100, 5 + dangerZonePoints + incidentPoints);
  const level: RiskLevel =
    score >= 60 ? "HIGH" : score >= 30 ? "MEDIUM" : "LOW";

  const reasons: string[] = [];
  if (dangerZone) {
    reasons.push(
      `Inside danger zone "${dangerZone.name}" (severity ${dangerZone.severity}/5).`,
    );
  } else if (safeZone) {
    reasons.push(`Inside designated safe zone "${safeZone.name}".`);
  } else {
    reasons.push("Not currently inside a known safe or danger zone.");
  }

  if (nearbyIncidents.length > 0) {
    reasons.push(
      `${nearbyIncidents.length} recent active incident(s) within 2 km in the past 24 hours.`,
    );
  } else {
    reasons.push("No recent nearby incidents were found in available data.");
  }

  const assessment = await RiskAssessmentModel.create({
    userId,
    score,
    level,
    reasons,
    latitude,
    longitude,
    insideDangerZone: Boolean(dangerZone),
    dangerZoneEntered,
    assessedAt: now,
  });

  return assessment;
}

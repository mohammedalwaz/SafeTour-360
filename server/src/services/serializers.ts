import { Types } from "mongoose";
import type { IncidentRecord } from "../models/Incident";
import type { SOSAlertRecord } from "../models/SOSAlert";
import type { LocationRecord } from "../models/Location";
import type { GeofenceRecord } from "../models/Geofence";
import type { PublicUser } from "../modules/auth/auth.types";

export function serializeLocation(record: LocationRecord & { _id: Types.ObjectId }) {
  return {
    id: record._id.toString(),
    latitude: record.latitude,
    longitude: record.longitude,
    accuracy: record.accuracy ?? null,
    recordedAt: record.recordedAt.toISOString(),
  };
}

export function serializeSos(
  record: SOSAlertRecord & { _id: Types.ObjectId },
  tourist?: Pick<PublicUser, "id" | "name" | "email">,
) {
  return {
    id: record._id.toString(),
    userId: record.userId.toString(),
    status: record.status,
    location: record.location
      ? {
          latitude: record.location.latitude,
          longitude: record.location.longitude,
          accuracy: record.location.accuracy ?? null,
          recordedAt: record.location.recordedAt.toISOString(),
        }
      : null,
    adminNote: record.adminNote ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    resolvedAt: record.resolvedAt?.toISOString() ?? null,
    ...(tourist ? { tourist } : {}),
  };
}

export function serializeIncident(
  record: IncidentRecord & { _id: Types.ObjectId },
  reporter?: Pick<PublicUser, "id" | "name" | "email">,
) {
  return {
    id: record._id.toString(),
    reportedBy: record.reportedBy.toString(),
    category: record.category,
    description: record.description,
    latitude: record.latitude ?? null,
    longitude: record.longitude ?? null,
    severity: record.severity,
    status: record.status,
    adminNote: record.adminNote ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    resolvedAt: record.resolvedAt?.toISOString() ?? null,
    ...(reporter ? { reporter } : {}),
  };
}

export function serializeGeofence(
  record: GeofenceRecord & { _id: Types.ObjectId },
) {
  return {
    id: record._id.toString(),
    name: record.name,
    type: record.type,
    latitude: record.latitude,
    longitude: record.longitude,
    radiusMeters: record.radiusMeters,
    severity: record.severity,
    isActive: record.isActive,
  };
}

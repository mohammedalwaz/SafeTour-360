import type { RequestHandler } from "express";
import { Types } from "mongoose";
import {
  GeofenceModel,
  GEOFENCE_TYPES,
  type GeofenceType,
} from "../../models/Geofence";
import {
  IncidentModel,
  INCIDENT_STATUSES,
  type IncidentStatus,
} from "../../models/Incident";
import { LocationModel } from "../../models/Location";
import { RiskAssessmentModel } from "../../models/RiskAssessment";
import {
  SOSAlertModel,
  SOS_STATUSES,
  type SOSStatus,
} from "../../models/SOSAlert";
import { UserModel } from "../../models/User";
import { writeAuditLog } from "../../services/audit";
import {
  serializeGeofence,
  serializeIncident,
  serializeLocation,
  serializeSos,
} from "../../services/serializers";
import { emitToAdmins, emitToTourist } from "../../sockets/socket-server";
import { isObject, readBoolean, readNumber, readString } from "../../utils/request";

const OPEN_SOS = ["active", "acknowledged", "responding"] as const;
const OPEN_INCIDENTS = ["new", "under_review"] as const;

const SOS_TRANSITIONS: Record<SOSStatus, SOSStatus[]> = {
  active: ["acknowledged", "responding", "resolved"],
  acknowledged: ["responding", "resolved"],
  responding: ["resolved"],
  resolved: [],
};

function isSosStatus(value: string): value is SOSStatus {
  return SOS_STATUSES.includes(value as SOSStatus);
}

function isIncidentStatus(value: string): value is IncidentStatus {
  return INCIDENT_STATUSES.includes(value as IncidentStatus);
}

function isGeofenceType(value: string): value is GeofenceType {
  return GEOFENCE_TYPES.includes(value as GeofenceType);
}

function touristSummary(user: {
  _id: Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
}) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    ...(user.phone ? { phone: user.phone } : {}),
  };
}

export const getOverview: RequestHandler = async (_request, response, next) => {
  try {
    const [
      totalTourists,
      activeSos,
      openIncidents,
      resolvedIncidents,
      tourists,
      sosAlerts,
      incidents,
      geofences,
    ] = await Promise.all([
      UserModel.countDocuments({ role: "tourist" }),
      SOSAlertModel.countDocuments({ status: { $in: OPEN_SOS } }),
      IncidentModel.countDocuments({ status: { $in: OPEN_INCIDENTS } }),
      IncidentModel.countDocuments({ status: "resolved" }),
      UserModel.find({ role: "tourist" })
        .select("name email phone isActive createdAt")
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      SOSAlertModel.find({ status: { $in: OPEN_SOS } })
        .sort({ createdAt: -1 })
        .limit(40),
      IncidentModel.find().sort({ createdAt: -1 }).limit(40),
      GeofenceModel.find().sort({ createdAt: -1 }).limit(40),
    ]);

    const touristIds = tourists.map((tourist) => tourist._id);
    const [locations, latestRisks] = await Promise.all([
      LocationModel.aggregate([
        { $match: { userId: { $in: touristIds } } },
        { $sort: { recordedAt: -1 } },
        { $group: { _id: "$userId", doc: { $first: "$$ROOT" } } },
      ]),
      RiskAssessmentModel.aggregate([
        { $sort: { assessedAt: -1 } },
        {
          $group: {
            _id: "$userId",
            level: { $first: "$level" },
            score: { $first: "$score" },
            insideDangerZone: { $first: "$insideDangerZone" },
            assessedAt: { $first: "$assessedAt" },
            reasons: { $first: "$reasons" },
          },
        },
      ]),
    ]);

    const locationByUser = new Map<
      string,
      {
        latitude: number;
        longitude: number;
        accuracy?: number;
        recordedAt: Date;
      }
    >(
      locations.map((entry) => [
        String(entry._id),
        {
          latitude: entry.doc.latitude,
          longitude: entry.doc.longitude,
          accuracy: entry.doc.accuracy,
          recordedAt: entry.doc.recordedAt,
        },
      ]),
    );
    const riskByUser = new Map(
      latestRisks.map((entry) => [String(entry._id), entry]),
    );

    const highOrCriticalRiskTourists = latestRisks.filter((entry) =>
      entry.level === "HIGH" || entry.level === "CRITICAL",
    ).length;

    const userById = new Map(
      (
        await UserModel.find({
          _id: {
            $in: [
              ...sosAlerts.map((alert) => alert.userId),
              ...incidents.map((incident) => incident.reportedBy),
            ],
          },
        })
          .select("name email phone")
          .lean()
      ).map((user) => [user._id.toString(), user]),
    );

    response.status(200).json({
      analytics: {
        totalTourists,
        activeSos,
        openIncidents,
        resolvedIncidents,
        highOrCriticalRiskTourists,
      },
      tourists: tourists.map((tourist) => {
        const location = locationByUser.get(tourist._id.toString());
        const risk = riskByUser.get(tourist._id.toString());
        return {
          ...touristSummary(tourist),
          isActive: tourist.isActive,
          createdAt: tourist.createdAt.toISOString(),
          location: location
            ? {
                latitude: location.latitude,
                longitude: location.longitude,
                accuracy: location.accuracy ?? null,
                recordedAt: new Date(location.recordedAt).toISOString(),
              }
            : null,
          risk: risk
            ? {
                level: risk.level,
                score: risk.score,
                insideDangerZone: risk.insideDangerZone,
                assessedAt: new Date(risk.assessedAt).toISOString(),
                reasons: risk.reasons,
              }
            : null,
        };
      }),
      sosAlerts: sosAlerts.map((alert) => {
        const tourist = userById.get(alert.userId.toString());
        return serializeSos(
          alert,
          tourist ? touristSummary(tourist) : undefined,
        );
      }),
      incidents: incidents.map((incident) => {
        const reporter = userById.get(incident.reportedBy.toString());
        return serializeIncident(
          incident,
          reporter ? touristSummary(reporter) : undefined,
        );
      }),
      geofences: geofences.map((zone) => serializeGeofence(zone)),
    });
  } catch (error) {
    next(error);
  }
};

export const updateSos: RequestHandler = async (request, response, next) => {
  const id = Array.isArray(request.params.id)
  ? request.params.id[0]
  : request.params.id;
  if (!Types.ObjectId.isValid(id)) {
    response.status(400).json({ message: "A valid SOS id is required." });
    return;
  }

  const body: unknown = request.body;
  if (!isObject(body)) {
    response.status(400).json({ message: "A JSON request body is required." });
    return;
  }

  const statusValue = readString(body.status);
  const adminNote = readString(body.adminNote);

  if (!statusValue || !isSosStatus(statusValue)) {
    response.status(400).json({
      message: "Status must be acknowledged, responding, or resolved.",
    });
    return;
  }

  if (adminNote && adminNote.length > 500) {
    response.status(400).json({ message: "Admin note must be at most 500 characters." });
    return;
  }

  try {
    const sos = await SOSAlertModel.findById(id);
    if (!sos) {
      response.status(404).json({ message: "SOS alert not found." });
      return;
    }

    if (!SOS_TRANSITIONS[sos.status].includes(statusValue)) {
      response.status(409).json({
        message: `Cannot change an SOS from ${sos.status} to ${statusValue}.`,
      });
      return;
    }

    sos.status = statusValue;
    sos.acknowledgedBy = new Types.ObjectId(request.auth!.userId);
    if (adminNote) sos.adminNote = adminNote;
    if (statusValue === "resolved") sos.resolvedAt = new Date();
    await sos.save();

    await writeAuditLog({
      actorId: request.auth!.userId,
      action: `sos.${statusValue}`,
      entityType: "SOSAlert",
      entityId: sos._id.toString(),
      details: `Admin set SOS status to ${statusValue}.`,
    });

    const tourist = await UserModel.findById(sos.userId).select("name email phone");
    const serialized = serializeSos(
      sos,
      tourist ? touristSummary(tourist) : undefined,
    );
    emitToAdmins("sos:updated", serialized);
    emitToTourist(sos.userId.toString(), "sos:updated", serialized);

    response.status(200).json({ sos: serialized });
  } catch (error) {
    next(error);
  }
};

export const getIncident: RequestHandler = async (request, response, next) => {
  const id = Array.isArray(request.params.id)
  ? request.params.id[0]
  : request.params.id;
  if (!Types.ObjectId.isValid(id)) {
    response.status(400).json({ message: "A valid incident id is required." });
    return;
  }

  try {
    const incident = await IncidentModel.findById(id);
    if (!incident) {
      response.status(404).json({ message: "Incident not found." });
      return;
    }
    const reporter = await UserModel.findById(incident.reportedBy).select(
      "name email phone",
    );
    response.status(200).json({
      incident: serializeIncident(
        incident,
        reporter ? touristSummary(reporter) : undefined,
      ),
    });
  } catch (error) {
    next(error);
  }
};

export const updateIncident: RequestHandler = async (request, response, next) => {
  const id = Array.isArray(request.params.id)
  ? request.params.id[0]
  : request.params.id;
  if (!Types.ObjectId.isValid(id)) {
    response.status(400).json({ message: "A valid incident id is required." });
    return;
  }

  const body: unknown = request.body;
  if (!isObject(body)) {
    response.status(400).json({ message: "A JSON request body is required." });
    return;
  }

  const statusValue = readString(body.status);
  const adminNote = readString(body.adminNote);

  if (statusValue && !isIncidentStatus(statusValue)) {
    response.status(400).json({
      message: "Status must be new, under_review, or resolved.",
    });
    return;
  }

  if (!statusValue && adminNote === undefined) {
    response.status(400).json({ message: "Provide a status and/or admin note." });
    return;
  }

  if (adminNote && adminNote.length > 500) {
    response.status(400).json({ message: "Admin note must be at most 500 characters." });
    return;
  }

  try {
    const incident = await IncidentModel.findById(id);
    if (!incident) {
      response.status(404).json({ message: "Incident not found." });
      return;
    }

    if (statusValue) {
      incident.status = statusValue as "new" | "resolved" | "under_review";
      incident.resolvedAt = statusValue === "resolved" ? new Date() : undefined;
    }
    if (adminNote !== undefined) incident.adminNote = adminNote;
    await incident.save();

    await writeAuditLog({
      actorId: request.auth!.userId,
      action: "incident.updated",
      entityType: "Incident",
      entityId: incident._id.toString(),
      details: `Admin updated incident${statusValue ? ` to ${statusValue}` : ""}.`,
    });

    const reporter = await UserModel.findById(incident.reportedBy).select(
      "name email phone",
    );
    const serialized = serializeIncident(
      incident,
      reporter ? touristSummary(reporter) : undefined,
    );
    emitToAdmins("incident:updated", serialized);

    response.status(200).json({ incident: serialized });
  } catch (error) {
    next(error);
  }
};

export const createGeofence: RequestHandler = async (request, response, next) => {
  const body: unknown = request.body;
  if (!isObject(body)) {
    response.status(400).json({ message: "A JSON request body is required." });
    return;
  }

  const name = readString(body.name);
  const typeValue = readString(body.type) ?? "danger";
  const latitude = readNumber(body.latitude);
  const longitude = readNumber(body.longitude);
  const radiusMeters = readNumber(body.radiusMeters);
  const severity = readNumber(body.severity) ?? 3;
  const isActive = readBoolean(body.isActive) ?? true;

  if (!name || name.length < 2 || name.length > 100) {
    response.status(400).json({ message: "Name must be between 2 and 100 characters." });
    return;
  }

  if (!isGeofenceType(typeValue)) {
    response.status(400).json({ message: "Type must be safe or danger." });
    return;
  }

  if (
    latitude === undefined ||
    longitude === undefined ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    response.status(400).json({ message: "Valid center latitude and longitude are required." });
    return;
  }

  if (
    radiusMeters === undefined ||
    radiusMeters < 25 ||
    radiusMeters > 100000
  ) {
    response.status(400).json({
      message: "Radius must be between 25 and 100000 meters.",
    });
    return;
  }

  if (!Number.isInteger(severity) || severity < 1 || severity > 5) {
    response.status(400).json({ message: "Severity must be a whole number from 1 to 5." });
    return;
  }

  try {
    const geofence = await GeofenceModel.create({
      name,
      type: typeValue,
      latitude,
      longitude,
      radiusMeters,
      severity,
      isActive,
      createdBy: request.auth!.userId,
    });

    await writeAuditLog({
      actorId: request.auth!.userId,
      action: "geofence.created",
      entityType: "Geofence",
      entityId: geofence._id.toString(),
      details: `Created ${typeValue} zone "${name}".`,
    });

    response.status(201).json({ geofence: serializeGeofence(geofence) });
  } catch (error) {
    next(error);
  }
};

export const updateGeofence: RequestHandler = async (request, response, next) => {
  const id = Array.isArray(request.params.id)
  ? request.params.id[0]
  : request.params.id;
  if (!Types.ObjectId.isValid(id)) {
    response.status(400).json({ message: "A valid geofence id is required." });
    return;
  }

  const body: unknown = request.body;
  if (!isObject(body)) {
    response.status(400).json({ message: "A JSON request body is required." });
    return;
  }

  try {
    const geofence = await GeofenceModel.findById(id);
    if (!geofence) {
      response.status(404).json({ message: "Geofence not found." });
      return;
    }

    const name = readString(body.name);
    const typeValue = readString(body.type);
    const latitude = readNumber(body.latitude);
    const longitude = readNumber(body.longitude);
    const radiusMeters = readNumber(body.radiusMeters);
    const severity = readNumber(body.severity);
    const isActive = readBoolean(body.isActive);

    if (name) geofence.name = name;
    if (typeValue) {
      if (!isGeofenceType(typeValue)) {
        response.status(400).json({ message: "Type must be safe or danger." });
        return;
      }
      geofence.type = typeValue;
    }
    if (latitude !== undefined) geofence.latitude = latitude;
    if (longitude !== undefined) geofence.longitude = longitude;
    if (radiusMeters !== undefined) geofence.radiusMeters = radiusMeters;
    if (severity !== undefined) geofence.severity = severity;
    if (isActive !== undefined) geofence.isActive = isActive;
    await geofence.save();

    response.status(200).json({ geofence: serializeGeofence(geofence) });
  } catch (error) {
    next(error);
  }
};

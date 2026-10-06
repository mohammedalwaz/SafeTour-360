import type { RequestHandler } from "express";
import { LocationModel } from "../../models/Location";
import { IncidentModel, INCIDENT_CATEGORIES } from "../../models/Incident";
import { SOSAlertModel } from "../../models/SOSAlert";
import { TouristProfileModel } from "../../models/TouristProfile";
import { writeAuditLog } from "../../services/audit";
import {
  getDigitalIdForUser,
  issueDigitalId,
  revokeDigitalId,
  serializeDigitalId,
} from "../../services/digital-id";
import {
  getNearbyGeofences,
  getRiskAssessment,
  serializeRiskAssessment,
} from "../../services/safety";
import {
  serializeIncident,
  serializeLocation,
  serializeSos,
} from "../../services/serializers";
import { emitToAdmins, emitToTourist } from "../../sockets/socket-server";
import { isObject, readNumber, readString } from "../../utils/request";

const LOCATION_TTL_MS = 48 * 60 * 60 * 1000;
const OPEN_SOS = ["active", "acknowledged", "responding"] as const;

async function ensureTouristProfile(userId: string) {
  await TouristProfileModel.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId } },
    { upsert: true, new: true },
  );
}

async function latestLocation(userId: string) {
  return LocationModel.findOne({ userId }).sort({ recordedAt: -1 });
}

export const getOverview: RequestHandler = async (request, response, next) => {
  try {
    const userId = request.auth!.userId;
    await ensureTouristProfile(userId);

    const [location, openSos, incidents, digitalId] = await Promise.all([
      latestLocation(userId),
      SOSAlertModel.findOne({
        userId,
        status: { $in: OPEN_SOS },
      }).sort({ createdAt: -1 }),
      IncidentModel.find({ reportedBy: userId })
        .sort({ createdAt: -1 })
        .limit(8),
      getDigitalIdForUser(userId),
    ]);

    const latitude = location?.latitude;
    const longitude = location?.longitude;
    const nearbyZones =
      typeof latitude === "number" && typeof longitude === "number"
        ? await getNearbyGeofences(latitude, longitude)
        : [];
    const dangerZones = nearbyZones.filter(
      (zone) => zone.type === "danger" && zone.isInside,
    );
    const risk = await getRiskAssessment({
      userId,
      latitude,
      longitude,
      nearbyZones,
    });

    response.status(200).json({
      user: request.auth!.user,
      location: location ? serializeLocation(location) : null,
      locationStatus: location
        ? "available"
        : "unavailable",
      dangerZones,
      nearbyZones: nearbyZones.slice(0, 12),
      risk: serializeRiskAssessment(risk),
      sos: openSos ? serializeSos(openSos) : null,
      incidents: incidents.map((incident) => serializeIncident(incident)),
      digitalId: digitalId ? serializeDigitalId(digitalId) : null,
    });
  } catch (error) {
    next(error);
  }
};

export const saveLocation: RequestHandler = async (request, response, next) => {
  const body: unknown = request.body;
  if (!isObject(body)) {
    response.status(400).json({ message: "A JSON request body is required." });
    return;
  }

  const latitude = readNumber(body.latitude);
  const longitude = readNumber(body.longitude);
  const accuracy = readNumber(body.accuracy);

  if (
    latitude === undefined ||
    longitude === undefined ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    response.status(400).json({
      message: "Valid latitude and longitude are required.",
    });
    return;
  }

  if (accuracy !== undefined && (accuracy < 0 || accuracy > 100000)) {
    response.status(400).json({ message: "Accuracy must be a positive number." });
    return;
  }

  try {
    const userId = request.auth!.userId;
    const recordedAt = new Date();
    const location = await LocationModel.create({
      userId,
      latitude,
      longitude,
      ...(accuracy !== undefined ? { accuracy } : {}),
      recordedAt,
      expiresAt: new Date(recordedAt.getTime() + LOCATION_TTL_MS),
    });

    const nearbyZones = await getNearbyGeofences(latitude, longitude);
    const dangerZones = nearbyZones.filter(
      (zone) => zone.type === "danger" && zone.isInside,
    );
    const risk = await getRiskAssessment({
      userId,
      latitude,
      longitude,
      nearbyZones,
    });

    const payload = {
      location: serializeLocation(location),
      dangerZones,
      nearbyZones: nearbyZones.slice(0, 12),
      risk: serializeRiskAssessment(risk),
    };

    emitToTourist(userId, "safety:updated", payload);
    response.status(201).json(payload);
  } catch (error) {
    next(error);
  }
};

export const createSos: RequestHandler = async (request, response, next) => {
  const body = (isObject(request.body) ? request.body : {}) as Record<string, unknown>;
  const latitude = readNumber(body.latitude);
  const longitude = readNumber(body.longitude);
  const accuracy = readNumber(body.accuracy);

  const hasLocation =
    latitude !== undefined &&
    longitude !== undefined &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  if (
    (latitude !== undefined || longitude !== undefined || accuracy !== undefined) &&
    !hasLocation
  ) {
    response.status(400).json({
      message: "If a location is sent with SOS, latitude and longitude must be valid.",
    });
    return;
  }

  try {
    const userId = request.auth!.userId;
    const existing = await SOSAlertModel.findOne({
      userId,
      status: { $in: OPEN_SOS },
    }).sort({ createdAt: -1 });

    if (existing) {
      response.status(200).json({
        message: "An SOS alert is already open.",
        sos: serializeSos(existing),
      });
      return;
    }

    const sos = await SOSAlertModel.create({
      userId,
      status: "active",
      ...(hasLocation
        ? {
            location: {
              latitude,
              longitude,
              ...(accuracy !== undefined ? { accuracy } : {}),
              recordedAt: new Date(),
            },
          }
        : {}),
    });

    await writeAuditLog({
      actorId: userId,
      action: "sos.created",
      entityType: "SOSAlert",
      entityId: sos._id.toString(),
      details: "Tourist created an SOS alert.",
    });

    const serialized = serializeSos(sos, {
      id: request.auth!.user.id,
      name: request.auth!.user.name,
      email: request.auth!.user.email,
    });
    emitToAdmins("sos:created", serialized);
    emitToTourist(userId, "sos:updated", serialized);

    response.status(201).json({ sos: serialized });
  } catch (error) {
    next(error);
  }
};

export const listSos: RequestHandler = async (request, response, next) => {
  try {
    const alerts = await SOSAlertModel.find({ userId: request.auth!.userId })
      .sort({ createdAt: -1 })
      .limit(10);
    response.status(200).json({
      alerts: alerts.map((alert) => serializeSos(alert)),
    });
  } catch (error) {
    next(error);
  }
};

export const createIncident: RequestHandler = async (request, response, next) => {
  const body: unknown = request.body;
  if (!isObject(body)) {
    response.status(400).json({ message: "A JSON request body is required." });
    return;
  }

  const category = readString(body.category);
  const description = readString(body.description);
  const severity = readNumber(body.severity) ?? 2;
  const latitude = readNumber(body.latitude);
  const longitude = readNumber(body.longitude);

  if (
    !category ||
    !INCIDENT_CATEGORIES.includes(
      category as (typeof INCIDENT_CATEGORIES)[number],
    )
  ) {
    response.status(400).json({ message: "Choose a valid incident category." });
    return;
  }

  if (!description || description.length < 8 || description.length > 2000) {
    response.status(400).json({
      message: "Description must be between 8 and 2000 characters.",
    });
    return;
  }

  if (!Number.isInteger(severity) || severity < 1 || severity > 5) {
    response.status(400).json({ message: "Severity must be a whole number from 1 to 5." });
    return;
  }

  const hasLocation =
    latitude !== undefined &&
    longitude !== undefined &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  if ((latitude !== undefined || longitude !== undefined) && !hasLocation) {
    response.status(400).json({
      message: "If coordinates are provided, both latitude and longitude must be valid.",
    });
    return;
  }

  try {
    const incident = await IncidentModel.create({
      reportedBy: request.auth!.userId,
      category: category as "accident" | "lost_tourist" | "medical" | "natural_disaster" | "other" | "suspicious_activity" | "unsafe_area",
      description,
      severity,
      status: "new",
      ...(hasLocation ? { latitude, longitude } : {}),
    });

    await writeAuditLog({
      actorId: request.auth!.userId,
      action: "incident.created",
      entityType: "Incident",
      entityId: incident._id.toString(),
      details: `Reported ${category} incident.`,
    });

    const serialized = serializeIncident(incident, {
      id: request.auth!.user.id,
      name: request.auth!.user.name,
      email: request.auth!.user.email,
    });
    emitToAdmins("incident:created", serialized);

    response.status(201).json({ incident: serialized });
  } catch (error) {
    next(error);
  }
};

export const listIncidents: RequestHandler = async (request, response, next) => {
  try {
    const incidents = await IncidentModel.find({
      reportedBy: request.auth!.userId,
    })
      .sort({ createdAt: -1 })
      .limit(20);
    response.status(200).json({
      incidents: incidents.map((incident) => serializeIncident(incident)),
    });
  } catch (error) {
    next(error);
  }
};

export const getDigitalId: RequestHandler = async (request, response, next) => {
  try {
    const record = await getDigitalIdForUser(request.auth!.userId);
    response.status(200).json({
      digitalId: record ? serializeDigitalId(record) : null,
    });
  } catch (error) {
    next(error);
  }
};

export const issueTouristDigitalId: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    await ensureTouristProfile(request.auth!.userId);
    const issued = await issueDigitalId(request.auth!.userId);
    response.status(201).json({
      digitalId: serializeDigitalId(issued.record, {
        token: issued.token,
        verificationUrl: issued.verificationUrl,
      }),
    });
  } catch (error) {
    next(error);
  }
};

export const revokeTouristDigitalId: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const record = await revokeDigitalId(request.auth!.userId);
    if (!record) {
      response.status(404).json({ message: "No Digital ID exists for this account." });
      return;
    }
    response.status(200).json({ digitalId: serializeDigitalId(record) });
  } catch (error) {
    next(error);
  }
};

export const getRisk: RequestHandler = async (request, response, next) => {
  try {
    const location = await latestLocation(request.auth!.userId);
    const nearbyZones =
      location
        ? await getNearbyGeofences(location.latitude, location.longitude)
        : [];
    const risk = await getRiskAssessment({
      userId: request.auth!.userId,
      latitude: location?.latitude,
      longitude: location?.longitude,
      nearbyZones,
    });
    response.status(200).json({
      risk: serializeRiskAssessment(risk),
      dangerZones: nearbyZones.filter(
        (zone) => zone.type === "danger" && zone.isInside,
      ),
    });
  } catch (error) {
    next(error);
  }
};


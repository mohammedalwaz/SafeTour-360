import { Schema, Types, model } from "mongoose";

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

export const INCIDENT_STATUSES = ["new", "under_review", "resolved"] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export interface IncidentRecord {
  reportedBy: Types.ObjectId;
  category: IncidentCategory;
  description: string;
  latitude?: number;
  longitude?: number;
  severity: number;
  status: IncidentStatus;
  adminNote?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

const incidentSchema = new Schema<IncidentRecord>(
  {
    reportedBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    category: { type: String, enum: INCIDENT_CATEGORIES, required: true },
    description: { type: String, required: true, trim: true, minlength: 8, maxlength: 2000 },
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
    severity: { type: Number, required: true, min: 1, max: 5, default: 2 },
    status: { type: String, enum: INCIDENT_STATUSES, default: "new", required: true },
    adminNote: { type: String, trim: true, maxlength: 500 },
    resolvedAt: Date,
  },
  { timestamps: true, versionKey: false },
);

incidentSchema.index({ status: 1, createdAt: -1 });
incidentSchema.index({ latitude: 1, longitude: 1, createdAt: -1 });

export const IncidentModel = model<IncidentRecord>("Incident", incidentSchema);

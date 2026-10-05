import { Schema, Types, model } from "mongoose";

export const GEOFENCE_TYPES = ["safe", "danger"] as const;
export type GeofenceType = (typeof GEOFENCE_TYPES)[number];

export interface GeofenceRecord {
  name: string;
  type: GeofenceType;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  severity: number;
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const geofenceSchema = new Schema<GeofenceRecord>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    type: { type: String, enum: GEOFENCE_TYPES, required: true },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    radiusMeters: { type: Number, required: true, min: 25, max: 100000 },
    severity: { type: Number, required: true, min: 1, max: 5, default: 1 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, versionKey: false },
);

geofenceSchema.index({ isActive: 1, type: 1 });

export const GeofenceModel = model<GeofenceRecord>("Geofence", geofenceSchema);

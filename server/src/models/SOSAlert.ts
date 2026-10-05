import { Schema, Types, model } from "mongoose";

export const SOS_STATUSES = [
  "pending",
  "acknowledged",
  "responding",
  "resolved",
] as const;
export type SOSStatus = (typeof SOS_STATUSES)[number];

export interface SOSLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  recordedAt: Date;
}

export interface SOSAlertRecord {
  userId: Types.ObjectId;
  location?: SOSLocation;
  status: SOSStatus;
  acknowledgedBy?: Types.ObjectId;
  adminNote?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

const sosLocationSchema = new Schema<SOSLocation>(
  {
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    accuracy: { type: Number, min: 0 },
    recordedAt: { type: Date, required: true },
  },
  { _id: false },
);

const sosAlertSchema = new Schema<SOSAlertRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    location: { type: sosLocationSchema, default: undefined },
    status: { type: String, enum: SOS_STATUSES, default: "pending", required: true },
    acknowledgedBy: { type: Schema.Types.ObjectId, ref: "User" },
    adminNote: { type: String, trim: true, maxlength: 500 },
    resolvedAt: Date,
  },
  { timestamps: true, versionKey: false },
);

sosAlertSchema.index({ status: 1, createdAt: -1 });

export const SOSAlertModel = model<SOSAlertRecord>("SOSAlert", sosAlertSchema);

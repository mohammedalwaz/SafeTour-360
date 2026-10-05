import { Schema, Types, model } from "mongoose";

export interface LocationRecord {
  userId: Types.ObjectId;
  latitude: number;
  longitude: number;
  accuracy?: number;
  recordedAt: Date;
  expiresAt: Date;
}

const locationSchema = new Schema<LocationRecord>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    accuracy: { type: Number, min: 0, max: 100000 },
    recordedAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false },
);

locationSchema.index({ userId: 1, recordedAt: -1 });
locationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const LocationModel = model<LocationRecord>("Location", locationSchema);

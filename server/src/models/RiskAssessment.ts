import { Schema, Types, model } from "mongoose";

export const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export interface RiskAssessmentRecord {
  userId: Types.ObjectId;
  score: number;
  level: RiskLevel;
  reasons: string[];
  latitude?: number;
  longitude?: number;
  locationAvailable: boolean;
  insideDangerZone: boolean;
  dangerZoneEntered: boolean;
  assessedAt: Date;
}

const riskAssessmentSchema = new Schema<RiskAssessmentRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    level: { type: String, enum: RISK_LEVELS, required: true },
    reasons: { type: [String], default: [] },
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
    locationAvailable: { type: Boolean, default: false, required: true },
    insideDangerZone: { type: Boolean, default: false },
    dangerZoneEntered: { type: Boolean, default: false },
    assessedAt: { type: Date, required: true, default: Date.now },
  },
  { versionKey: false },
);

riskAssessmentSchema.index({ userId: 1, assessedAt: -1 });
riskAssessmentSchema.index({ level: 1, assessedAt: -1 });

export const RiskAssessmentModel = model<RiskAssessmentRecord>(
  "RiskAssessment",
  riskAssessmentSchema,
);

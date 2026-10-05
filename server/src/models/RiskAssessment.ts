import { Schema, Types, model } from "mongoose";

export const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export interface RiskAssessmentRecord {
  userId: Types.ObjectId;
  score: number;
  level: RiskLevel;
  reasons: string[];
  latitude: number;
  longitude: number;
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
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
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

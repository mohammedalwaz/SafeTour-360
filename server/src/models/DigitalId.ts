import { Schema, Types, model } from "mongoose";

export interface DigitalIdRecord {
  userId: Types.ObjectId;
  idNumber: string;
  verificationTokenHash?: string;
  tokenExpiresAt?: Date;
  isRevoked: boolean;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const digitalIdSchema = new Schema<DigitalIdRecord>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      required: true,
    },
    idNumber: { type: String, unique: true, required: true, index: true },
    verificationTokenHash: { type: String, unique: true, sparse: true, select: false },
    tokenExpiresAt: Date,
    isRevoked: { type: Boolean, default: true, required: true },
    revokedAt: Date,
  },
  { timestamps: true, versionKey: false },
);

export const DigitalIdModel = model<DigitalIdRecord>("DigitalId", digitalIdSchema);

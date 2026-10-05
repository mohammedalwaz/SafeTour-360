import { Schema, Types, model } from "mongoose";

export interface TouristProfileRecord {
  userId: Types.ObjectId;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  createdAt: Date;
  updatedAt: Date;
}

const touristProfileSchema = new Schema<TouristProfileRecord>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      required: true,
    },
    emergencyContactName: { type: String, trim: true, maxlength: 100 },
    emergencyContactPhone: { type: String, trim: true, maxlength: 30 },
  },
  { timestamps: true, versionKey: false },
);

export const TouristProfileModel = model<TouristProfileRecord>(
  "TouristProfile",
  touristProfileSchema,
);

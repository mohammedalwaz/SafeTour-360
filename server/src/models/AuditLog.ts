import { Schema, Types, model } from "mongoose";

export interface AuditLogRecord {
  actorId?: Types.ObjectId;
  action: string;
  entityType: string;
  entityId?: Types.ObjectId;
  details?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<AuditLogRecord>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true, trim: true, maxlength: 80 },
    entityType: { type: String, required: true, trim: true, maxlength: 40 },
    entityId: { type: Schema.Types.ObjectId },
    details: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

export const AuditLogModel = model<AuditLogRecord>("AuditLog", auditLogSchema);

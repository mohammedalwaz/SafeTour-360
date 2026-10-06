import { Types } from "mongoose";
import { AuditLogModel } from "../models/AuditLog";

export async function writeAuditLog(input: {
  actorId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: string;
}): Promise<void> {
  await AuditLogModel.create({
    ...(input.actorId ? { actorId: new Types.ObjectId(input.actorId) } : {}),
    action: input.action,
    entityType: input.entityType,
    ...(input.entityId ? { entityId: new Types.ObjectId(input.entityId) } : {}),
    ...(input.details ? { details: input.details } : {}),
  });
}

import { createHash, randomBytes } from "node:crypto";
import { env } from "../config/env";
import { DigitalIdModel } from "../models/DigitalId";
import { UserModel } from "../models/User";
import { writeAuditLog } from "./audit";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export function hashDigitalIdToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function createIdNumber(): string {
  return `ST-${randomBytes(4).toString("hex").toUpperCase()}`;
}

function createRawToken(): string {
  return randomBytes(32).toString("hex");
}

export function verificationUrlFor(token: string): string {
  return `${env.publicAppUrl.replace(/\/$/, "")}/verify/${token}`;
}

export function serializeDigitalId(
  record: {
    idNumber: string;
    tokenExpiresAt?: Date;
    isRevoked: boolean;
    revokedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
  },
  extra?: { verificationUrl?: string; token?: string },
) {
  return {
    idNumber: record.idNumber,
    expiresAt: record.tokenExpiresAt?.toISOString() ?? null,
    isRevoked: record.isRevoked,
    revokedAt: record.revokedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    isValid:
      !record.isRevoked &&
      Boolean(record.tokenExpiresAt) &&
      record.tokenExpiresAt! > new Date(),
    ...(extra?.verificationUrl
      ? { verificationUrl: extra.verificationUrl }
      : {}),
    ...(extra?.token ? { token: extra.token } : {}),
  };
}

export async function getDigitalIdForUser(userId: string) {
  return DigitalIdModel.findOne({ userId });
}

export async function issueDigitalId(userId: string) {
  const token = createRawToken();
  const verificationTokenHash = hashDigitalIdToken(token);
  const tokenExpiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  let record = await DigitalIdModel.findOne({ userId }).select(
    "+verificationTokenHash",
  );

  if (!record) {
    record = await DigitalIdModel.create({
      userId,
      idNumber: createIdNumber(),
      verificationTokenHash,
      tokenExpiresAt,
      isRevoked: false,
    });
  } else {
    record.verificationTokenHash = verificationTokenHash;
    record.tokenExpiresAt = tokenExpiresAt;
    record.isRevoked = false;
    record.revokedAt = undefined;
    await record.save();
  }

  await writeAuditLog({
    actorId: userId,
    action: "digital_id.issued",
    entityType: "DigitalId",
    entityId: record._id.toString(),
    details: `Issued Digital ID ${record.idNumber}.`,
  });

  return {
    record,
    token,
    verificationUrl: verificationUrlFor(token),
  };
}

export async function revokeDigitalId(userId: string) {
  const record = await DigitalIdModel.findOne({ userId });
  if (!record) return null;

  record.isRevoked = true;
  record.revokedAt = new Date();
  record.tokenExpiresAt = undefined;
  record.set("verificationTokenHash", undefined);
  await record.save();

  await writeAuditLog({
    actorId: userId,
    action: "digital_id.revoked",
    entityType: "DigitalId",
    entityId: record._id.toString(),
    details: `Revoked Digital ID ${record.idNumber}.`,
  });

  return record;
}

export async function verifyDigitalIdToken(token: string) {
  if (!token || token.length < 16) return { status: "invalid" as const };

  const record = await DigitalIdModel.findOne({
    verificationTokenHash: hashDigitalIdToken(token),
  }).select("+verificationTokenHash");

  if (!record) return { status: "invalid" as const };

  if (record.isRevoked) {
    return { status: "revoked" as const, record };
  }

  if (!record.tokenExpiresAt || record.tokenExpiresAt <= new Date()) {
    return { status: "expired" as const, record };
  }

  const user = await UserModel.findById(record.userId).select(
    "name role isActive",
  );
  if (!user || !user.isActive || user.role !== "tourist") {
    return { status: "invalid" as const, record };
  }

  return {
    status: "valid" as const,
    record,
    holder: {
      name: user.name,
      idNumber: record.idNumber,
      expiresAt: record.tokenExpiresAt.toISOString(),
    },
  };
}

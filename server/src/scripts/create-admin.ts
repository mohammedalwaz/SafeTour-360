import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { env } from "../config/env";
import { UserModel } from "../models/User";

async function createFirstAdmin(): Promise<void> {
  const name = process.env.ADMIN_NAME?.trim();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!env.mongodbUri) {
    throw new Error("Set MONGODB_URI before creating an admin account.");
  }

  if (!env.jwtSecret) {
    throw new Error(
      "Set JWT_SECRET or SESSION_SECRET before creating an admin account.",
    );
  }

  if (!name || name.length < 2 || !email || !password) {
    throw new Error(
      "Set ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD in the environment.",
    );
  }

  if (Buffer.byteLength(password, "utf8") < 8 || Buffer.byteLength(password, "utf8") > 72) {
    throw new Error("ADMIN_PASSWORD must be between 8 and 72 bytes.");
  }

  await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 5000 });
  await UserModel.init();

  const existingAdmin = await UserModel.exists({ role: "admin" });
  if (existingAdmin) {
    throw new Error("An admin account already exists; no account was created.");
  }

  const existingEmail = await UserModel.exists({ email });
  if (existingEmail) {
    throw new Error("That email is already registered; no account was created.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await UserModel.create({
    name,
    email,
    passwordHash,
    role: "admin",
    isActive: true,
  });

  console.info("First admin account created successfully.");
}

void createFirstAdmin()
  .catch((error: unknown) => {
    console.error(
      "Could not create the first admin account:",
      error instanceof Error ? error.message : "Unknown error",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

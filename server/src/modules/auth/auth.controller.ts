import bcrypt from "bcryptjs";
import type { RequestHandler } from "express";
import jwt, { type SignOptions } from "jsonwebtoken";
import { isDatabaseConnected } from "../../config/database";
import { env } from "../../config/env";
import { TouristProfileModel } from "../../models/TouristProfile";
import { UserModel } from "../../models/User";
import { toPublicUser } from "./auth.utils";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[\d ()-]{7,30}$/;
const BCRYPT_MAX_BYTES = 72;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDuplicateEmailError(error: unknown): boolean {
  return (
    isObject(error) &&
    error.code === 11000 &&
    isObject(error.keyPattern) &&
    error.keyPattern.email === 1
  );
}

function sendServiceUnavailable(
  response: Parameters<RequestHandler>[1],
): void {
  if (!env.jwtSecret) {
    response.status(503).json({
      message:
        "Authentication is unavailable until JWT_SECRET or SESSION_SECRET is configured.",
    });
    return;
  }

  if (!isDatabaseConnected()) {
    response.status(503).json({
      message:
        "Authentication requires a configured and available MongoDB connection.",
    });
  }
}

export const register: RequestHandler = async (request, response, next) => {
  const body: unknown = request.body;
  if (!isObject(body)) {
    response.status(400).json({ message: "A JSON request body is required." });
    return;
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const rawPhone = body.phone;
  const phone =
    typeof rawPhone === "string" && rawPhone.trim()
      ? rawPhone.trim()
      : undefined;

  if (name.length < 2 || name.length > 100) {
    response.status(400).json({
      message: "Name must be between 2 and 100 characters.",
    });
    return;
  }

  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    response.status(400).json({ message: "Enter a valid email address." });
    return;
  }

  if (
    password.length < 8 ||
    Buffer.byteLength(password, "utf8") > BCRYPT_MAX_BYTES
  ) {
    response.status(400).json({
      message: "Password must be at least 8 characters and at most 72 bytes.",
    });
    return;
  }

  if (rawPhone !== undefined && typeof rawPhone !== "string") {
    response.status(400).json({ message: "Phone must be text when provided." });
    return;
  }

  if (phone && !PHONE_PATTERN.test(phone)) {
    response.status(400).json({ message: "Enter a valid phone number." });
    return;
  }

  if (!env.jwtSecret || !isDatabaseConnected()) {
    sendServiceUnavailable(response);
    return;
  }

  try {
    await UserModel.init();
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await UserModel.create({
      name,
      email,
      ...(phone ? { phone } : {}),
      passwordHash,
      role: "tourist",
      isActive: true,
    });
    await TouristProfileModel.findOneAndUpdate(
      { userId: user._id },
      { $setOnInsert: { userId: user._id } },
      { upsert: true },
    );

    response.status(201).json({
      message: "Tourist account created. You can now log in.",
      user: toPublicUser(user),
    });
  } catch (error) {
    if (isDuplicateEmailError(error)) {
      response
        .status(409)
        .json({ message: "An account with this email already exists." });
      return;
    }

    next(error);
  }
};

export const login: RequestHandler = async (request, response, next) => {
  const body: unknown = request.body;
  if (!isObject(body)) {
    response.status(400).json({ message: "A JSON request body is required." });
    return;
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!EMAIL_PATTERN.test(email) || password.length === 0) {
    response
      .status(400)
      .json({ message: "A valid email and password are required." });
    return;
  }

  if (Buffer.byteLength(password, "utf8") > BCRYPT_MAX_BYTES) {
    response.status(401).json({ message: "Invalid email or password." });
    return;
  }

  if (!env.jwtSecret || !isDatabaseConnected()) {
    sendServiceUnavailable(response);
    return;
  }

  try {
    const user = await UserModel.findOne({ email }).select("+passwordHash");
    if (
      !user ||
      !user.isActive ||
      !(await bcrypt.compare(password, user.passwordHash))
    ) {
      response.status(401).json({ message: "Invalid email or password." });
      return;
    }

    const tokenOptions: SignOptions = {
      algorithm: "HS256",
      expiresIn: "1h",
    };
    const token = jwt.sign(
      { role: user.role },
      env.jwtSecret,
      { ...tokenOptions, subject: user._id.toString() },
    );

    response.status(200).json({
      token,
      user: toPublicUser(user),
    });
  } catch (error) {
    next(error);
  }
};

export const currentUser: RequestHandler = (request, response) => {
  if (!request.auth) {
    response.status(401).json({ message: "A valid login is required." });
    return;
  }

  response.status(200).json({ user: request.auth.user });
};

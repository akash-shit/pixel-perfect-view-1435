import jwt from "jsonwebtoken";

export const AUTH_COOKIE = "scamshield_session";
export const TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export function generateToken(userId) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === "GENERATE_A_LONG_RANDOM_SECRET") {
    throw new Error("JWT_SECRET is missing or still contains its setup placeholder.");
  }

  return jwt.sign({}, secret, {
    algorithm: "HS256",
    subject: userId.toString(),
    expiresIn: "7d",
  });
}

export function authCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: process.env.COOKIE_SAME_SITE || (isProduction ? "none" : "lax"),
    path: "/",
    maxAge: TOKEN_MAX_AGE,
  };
}
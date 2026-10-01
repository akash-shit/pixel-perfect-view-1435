import jwt from "jsonwebtoken";
import { AUTH_COOKIE } from "../utils/generateToken.js";

export function requireAuth(req, res, next) {
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) {
    return res.status(401).json({ success: false, message: "Please sign in to continue." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    if (typeof payload !== "object" || typeof payload.sub !== "string") {
      throw new Error("Invalid session.");
    }
    req.user = { id: payload.sub };
    return next();
  } catch {
    res.clearCookie(AUTH_COOKIE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === "production" ? "none" : "lax"),
      path: "/",
    });
    return res.status(401).json({ success: false, message: "Your session has expired. Please sign in again." });
  }
}
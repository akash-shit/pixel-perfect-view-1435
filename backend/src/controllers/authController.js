import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { AUTH_COOKIE, authCookieOptions, generateToken } from "../utils/generateToken.js";

function safeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}

export async function register(req, res) {
  const name = req.body.name.trim();
  const email = req.body.email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(req.body.password, 12);

  try {
    const user = await User.create({ name, email, passwordHash });
    res.cookie(AUTH_COOKIE, generateToken(user._id), authCookieOptions());
    return res.status(201).json({ success: true, user: safeUser(user) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "An account with this email already exists." });
    }
    throw error;
  }
}

export async function login(req, res) {
  const email = req.body.email.trim().toLowerCase();
  const user = await User.findOne({ email }).select("+passwordHash");
  const passwordMatches = user && await bcrypt.compare(req.body.password, user.passwordHash);

  if (!passwordMatches) {
    return res.status(401).json({ success: false, message: "Email or password is incorrect." });
  }

  res.cookie(AUTH_COOKIE, generateToken(user._id), authCookieOptions());
  return res.json({ success: true, user: safeUser(user) });
}

export async function currentUser(req, res) {
  const user = await User.findById(req.user.id).select("name email createdAt");
  if (!user) return res.status(401).json({ success: false, message: "Please sign in to continue." });
  return res.json({ success: true, user: safeUser(user) });
}

export function logout(_req, res) {
  const { maxAge: _maxAge, ...clearOptions } = authCookieOptions();
  res.clearCookie(AUTH_COOKIE, clearOptions);
  return res.json({ success: true, message: "You have signed out." });
}
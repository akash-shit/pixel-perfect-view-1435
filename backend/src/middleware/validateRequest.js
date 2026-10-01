import { validationResult } from "express-validator";

export function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || "Please check the information you entered.",
      errors: errors.array().map(({ path, msg }) => ({ field: path, message: msg })),
    });
  }
  return next();
}
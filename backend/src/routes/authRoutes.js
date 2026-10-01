import { Router } from "express";
import { body } from "express-validator";
import { currentUser, login, logout, register } from "../controllers/authController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { authRateLimit } from "../middleware/rateLimitMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";

const router = Router();

router.post(
  "/register",
  authRateLimit,
  body("name").isString().trim().notEmpty().withMessage("Please enter your name.").isLength({ max: 100 }).withMessage("Name must be 100 characters or fewer."),
  body("email").isEmail().withMessage("Enter a valid email address.").normalizeEmail(),
  body("password").isString().isLength({ min: 8, max: 72 }).withMessage("Password must be 8 to 72 characters long."),
  validateRequest,
  register,
);

router.post(
  "/login",
  authRateLimit,
  body("email").isEmail().withMessage("Enter a valid email address.").normalizeEmail(),
  body("password").isString().notEmpty().withMessage("Enter your password."),
  validateRequest,
  login,
);

router.get("/me", requireAuth, currentUser);
router.post("/logout", logout);

export default router;
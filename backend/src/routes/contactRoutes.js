import { Router } from "express";
import { body } from "express-validator";
import { createContact, deleteContact, getContacts, updateContact } from "../controllers/contactController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { RELATIONSHIPS } from "../models/TrustedContact.js";

const router = Router();
router.use(requireAuth);

router.get("/", getContacts);
router.post(
  "/",
  body("name").isString().trim().notEmpty().withMessage("Enter a name.").isLength({ max: 100 }).withMessage("Name must be 100 characters or fewer."),
  body("phone").isString().trim().notEmpty().withMessage("Enter a phone number.").isLength({ max: 30 }).withMessage("Phone number is too long."),
  body("relationship").isIn(RELATIONSHIPS).withMessage("Choose a relationship from the list."),
  validateRequest,
  createContact,
);
router.put(
  "/:id",
  body("name").optional().isString().trim().notEmpty().withMessage("Name cannot be empty.").isLength({ max: 100 }).withMessage("Name must be 100 characters or fewer."),
  body("phone").optional().isString().trim().notEmpty().withMessage("Phone number cannot be empty.").isLength({ max: 30 }).withMessage("Phone number is too long."),
  body("relationship").optional().isIn(RELATIONSHIPS).withMessage("Choose a relationship from the list."),
  validateRequest,
  updateContact,
);
router.delete("/:id", deleteContact);

export default router;
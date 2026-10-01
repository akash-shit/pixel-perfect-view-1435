import mongoose from "mongoose";
import { TrustedContact } from "../models/TrustedContact.js";

function serializeContact(contact) {
  return {
    id: contact._id.toString(),
    name: contact.name,
    phone: contact.phone,
    relationship: contact.relationship,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
  };
}

export async function getContacts(req, res) {
  const contacts = await TrustedContact.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean();
  return res.json({ success: true, contacts: contacts.map(serializeContact) });
}

export async function createContact(req, res) {
  const contact = await TrustedContact.create({
    userId: req.user.id,
    name: req.body.name.trim(),
    phone: req.body.phone.trim(),
    relationship: req.body.relationship,
  });
  return res.status(201).json({ success: true, contact: serializeContact(contact) });
}

export async function updateContact(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "That contact could not be found." });
  }

  const updates = {};
  for (const field of ["name", "phone", "relationship"]) {
    if (req.body[field] !== undefined) {
      updates[field] = typeof req.body[field] === "string" ? req.body[field].trim() : req.body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ success: false, message: "Enter at least one contact detail to update." });
  }

  const contact = await TrustedContact.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.id },
    { $set: updates },
    { new: true, runValidators: true },
  );
  if (!contact) {
    return res.status(403).json({ success: false, message: "You cannot change this contact." });
  }
  return res.json({ success: true, contact: serializeContact(contact) });
}

export async function deleteContact(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "That contact could not be found." });
  }

  const result = await TrustedContact.deleteOne({ _id: req.params.id, userId: req.user.id });
  if (result.deletedCount === 0) {
    return res.status(403).json({ success: false, message: "You cannot remove this contact." });
  }
  return res.json({ success: true });
}
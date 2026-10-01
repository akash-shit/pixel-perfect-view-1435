import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createContact,
  deleteContact,
  getContacts,
  updateContact,
} from "../src/controllers/contactController.js";
import {
  clearHistory,
  deleteHistoryItem,
  getHistory,
} from "../src/controllers/scamController.js";
import { ScamCheck } from "../src/models/ScamCheck.js";
import { TrustedContact } from "../src/models/TrustedContact.js";

const userA = "507f1f77bcf86cd799439011";
const contactId = "507f1f77bcf86cd799439012";

function makeResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("contact list, create, update, and delete use the verified user ID", async () => {
  const originals = {
    find: TrustedContact.find,
    create: TrustedContact.create,
    findOneAndUpdate: TrustedContact.findOneAndUpdate,
    deleteOne: TrustedContact.deleteOne,
  };
  const filters = [];
  let createdDocument;
  const contact = {
    _id: { toString: () => contactId },
    name: "Trusted person",
    phone: "+911234567890",
    relationship: "Son",
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };

  try {
    TrustedContact.find = (filter) => {
      filters.push(filter);
      return { sort() { return this; }, async lean() { return []; } };
    };
    TrustedContact.create = async (document) => {
      createdDocument = document;
      return contact;
    };
    TrustedContact.findOneAndUpdate = async (filter) => {
      filters.push(filter);
      return contact;
    };
    TrustedContact.deleteOne = async (filter) => {
      filters.push(filter);
      return { deletedCount: 1 };
    };

    await getContacts({ user: { id: userA } }, makeResponse());
    await createContact({ user: { id: userA }, body: { userId: "507f1f77bcf86cd799439099", name: "Trusted person", phone: "+911234567890", relationship: "Son" } }, makeResponse());
    await updateContact({ user: { id: userA }, params: { id: contactId }, body: { name: "Updated person" } }, makeResponse());
    await deleteContact({ user: { id: userA }, params: { id: contactId } }, makeResponse());

    assert.equal(createdDocument.userId, userA);
    assert.equal(filters[0].userId, userA);
    assert.deepEqual(filters[1], { _id: contactId, userId: userA });
    assert.deepEqual(filters[2], { _id: contactId, userId: userA });
  } finally {
    TrustedContact.find = originals.find;
    TrustedContact.create = originals.create;
    TrustedContact.findOneAndUpdate = originals.findOneAndUpdate;
    TrustedContact.deleteOne = originals.deleteOne;
  }
});

test("history list, clear, and delete are scoped to the verified user", async () => {
  const originals = {
    find: ScamCheck.find,
    deleteMany: ScamCheck.deleteMany,
    deleteOne: ScamCheck.deleteOne,
  };
  const filters = [];

  try {
    ScamCheck.find = (filter) => {
      filters.push(filter);
      return { sort() { return this; }, limit() { return this; }, async lean() { return []; } };
    };
    ScamCheck.deleteMany = async (filter) => {
      filters.push(filter);
      return { deletedCount: 0 };
    };
    ScamCheck.deleteOne = async (filter) => {
      filters.push(filter);
      return { deletedCount: 1 };
    };

    await getHistory({ user: { id: userA } }, makeResponse());
    await clearHistory({ user: { id: userA } }, makeResponse());
    await deleteHistoryItem({ user: { id: userA }, params: { id: contactId } }, makeResponse());

    assert.deepEqual(filters[0], { userId: userA });
    assert.deepEqual(filters[1], { userId: userA });
    assert.deepEqual(filters[2], { _id: contactId, userId: userA });
  } finally {
    ScamCheck.find = originals.find;
    ScamCheck.deleteMany = originals.deleteMany;
    ScamCheck.deleteOne = originals.deleteOne;
  }
});
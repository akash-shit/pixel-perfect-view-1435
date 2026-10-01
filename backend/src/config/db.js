import mongoose from "mongoose";

export async function connectDB(uri = process.env.MONGODB_URI) {
  if (!uri || uri.includes("YOUR_NEW_PASSWORD") || uri.includes("<DB_PASSWORD>")) {
    throw new Error("MONGODB_URI is missing or still contains its setup placeholder.");
  }

  try {
    await mongoose.connect(uri);
    console.log("MongoDB connected successfully.");
  } catch {
    throw new Error("MongoDB connection failed.");
  }
}
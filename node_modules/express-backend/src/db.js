import mongoose from "mongoose";

const cache = globalThis;

if (!cache.mongooseCache) {
  cache.mongooseCache = { conn: null, promise: null };
}

export function getMongoUri() {
  if (process.env.MONGO_URI) return process.env.MONGO_URI;

  const base = process.env.MONGO_CONNECTION_STRING;
  if (base) {
    const dbName = process.env.MONGO_DB_NAME ?? "tldr";
    if (/mongodb(\+srv)?:\/\/[^/]+\//.test(base)) return base;
    const separator = base.includes("?") ? `/${dbName}&` : `/${dbName}`;
    return `${base.replace(/\/$/, "")}${separator}`;
  }

  return null;
}

export async function connectDb() {
  const uri = getMongoUri();
  if (!uri) {
    throw new Error("Set MONGO_URI in the environment");
  }

  if (cache.mongooseCache.conn) return cache.mongooseCache.conn;

  if (!cache.mongooseCache.promise) {
    mongoose.set("strictQuery", true);
    cache.mongooseCache.promise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
  }

  cache.mongooseCache.conn = await cache.mongooseCache.promise;
  return cache.mongooseCache.conn;
}

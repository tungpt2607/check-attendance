import mongoose from "mongoose";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

// Giữ kết nối qua các lần gọi (serverless tái sử dụng tiến trình).
const globalForMongoose = globalThis as unknown as { _mongoose?: MongooseCache };
const cache: MongooseCache =
  globalForMongoose._mongoose ?? (globalForMongoose._mongoose = { conn: null, promise: null });

export async function connectDB() {
  if (cache.conn) return cache.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Thiếu biến môi trường MONGODB_URI");

  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, { bufferCommands: false });
  }
  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null;
    throw err;
  }
  return cache.conn;
}

export function isValidId(id: string | null | undefined): id is string {
  return !!id && mongoose.isValidObjectId(id);
}

/** Sắp xếp chuỗi theo chuẩn tiếng Việt (Â, Đ, Ơ... đúng vị trí, không phân biệt hoa thường) */
export const VI_COLLATION = { locale: "vi", strength: 2 } as const;

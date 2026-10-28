import { compare, hash } from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User, type UserRecord } from "./user.model";

export async function findUserByEmail(email: string) {
  await connectDB();
  return User.findOne({ email: email.toLowerCase().trim() }).lean<UserRecord>();
}

export async function createUser(input: { name: string; email: string; password: string }) {
  await connectDB();
  const passwordHash = await hash(input.password, 10);
  const user = await User.create({
    name: input.name.trim(),
    email: input.email.toLowerCase().trim(),
    passwordHash,
  });
  return { id: String(user._id), name: user.name, email: user.email };
}

export async function verifyPassword(user: UserRecord, password: string) {
  return compare(password, user.passwordHash);
}

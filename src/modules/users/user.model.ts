import { Schema, model, models, type Model, type Types } from "mongoose";

export interface UserRecord {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserRecord>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

export const User: Model<UserRecord> =
  (models.User as Model<UserRecord>) || model<UserRecord>("User", userSchema);

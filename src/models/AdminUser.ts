import mongoose, { Schema, model, models } from "mongoose";

export interface IAdminUser {
  _id: mongoose.Types.ObjectId;
  username: string;
  email: string;
  password: string; // hashed
  createdAt: Date;
}

const AdminUserSchema = new Schema<IAdminUser>(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
  },
  { timestamps: true },
);

export const AdminUser = models.AdminUser ?? model<IAdminUser>("AdminUser", AdminUserSchema);

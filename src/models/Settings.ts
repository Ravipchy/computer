import mongoose, { Schema, model, models } from "mongoose";

export interface ISettings {
  _id: mongoose.Types.ObjectId;
  key: string;
  value: string;
}

const SettingsSchema = new Schema<ISettings>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: String, required: true },
  },
  { timestamps: true },
);

export const Settings = models.Settings ?? model<ISettings>("Settings", SettingsSchema);

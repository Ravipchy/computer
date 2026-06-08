import { connectDB as connectPostgresDB } from "./db";

export async function connectDB() {
  return connectPostgresDB();
}

export default connectDB;

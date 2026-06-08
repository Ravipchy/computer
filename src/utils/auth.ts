import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;

export async function getAuthUser() {
  const cookieStore = await cookies();
  
  // Check Admin
  const adminToken = cookieStore.get("admin_token")?.value;
  if (adminToken) {
    try {
      const decoded = jwt.verify(adminToken, JWT_SECRET) as any;
      return { id: decoded.id, role: "admin" };
    } catch { /* ignore */ }
  }

  // Check ATC
  const atcToken = cookieStore.get("atc_token")?.value;
  if (atcToken) {
    try {
      const decoded = jwt.verify(atcToken, JWT_SECRET) as any;
      return { id: decoded.id, role: "atc", tpCode: decoded.tpCode };
    } catch { /* ignore */ }
  }

  // Check Student
  const studentToken = cookieStore.get("student_token")?.value;
  if (studentToken) {
    try {
      const decoded = jwt.verify(studentToken, JWT_SECRET) as any;
      return { id: decoded.id, role: "student" };
    } catch { /* ignore */ }
  }

  return null;
}

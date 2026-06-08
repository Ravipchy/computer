import { cookies } from "next/headers";
import jwt from "jsonwebtoken";


const getBearerFromRequest = (request?: Request): string => {
  if (request) {
    const auth = request.headers.get("Authorization") ?? "";
    const tokenFromHeader = auth.replace("Bearer ", "");
    if (tokenFromHeader) return tokenFromHeader;
  }
  return "";
};

export const verifyAdmin = async (request?: Request) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  const cookieStore = await cookies();
  const token =
    cookieStore.get("admin_token")?.value ||
    cookieStore.get("auth_token")?.value ||
    getBearerFromRequest(request);
  if (!token) return null;
  
  try {
    const decoded = jwt.verify(token, secret) as unknown as { id: string; role: string };
    if (decoded.role !== "admin") return null;
    return decoded;
  } catch {
    return null;
  }
};

export const verifyAtc = async (request?: Request) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  const cookieStore = await cookies();
  const token =
    cookieStore.get("atc_token")?.value ||
    cookieStore.get("auth_token")?.value ||
    getBearerFromRequest(request);
  if (!token) return null;
  
  try {
    const decoded = jwt.verify(token, secret) as unknown as { id: string; role: string; tpCode: string };
    if (decoded.role !== "atc") return null;
    return decoded;
  } catch {
    return null;
  }
};


import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { AtcStudent } from "@/models/Student";
import { verifyAtc } from "@/lib/auth";

export async function GET() {
  const user = await verifyAtc();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await connectDB();

  const stats = await AtcStudent.aggregate([
    { $match: { tpCode: user.tpCode } },
    {
      $facet: {
        total: [{ $count: "count" }],
        pendingReview: [
          { $match: { status: { $in: ["pending", "pending_atc", "pending_admin"] } } },
          { $count: "count" }
        ],
        active: [
          {
            $match: {
              $or: [{ status: "active" }, { status: "approved" }],
              userStatus: { $ne: "disabled" }
            }
          },
          { $count: "count" }
        ],
        rejected: [
          { $match: { status: "rejected" } },
          { $count: "count" }
        ],
        blocked: [
          { $match: { userStatus: "disabled" } },
          { $count: "count" }
        ]
      }
    }
  ]);

  const result = stats[0];

  return NextResponse.json({
    total: result.total[0]?.count || 0,
    pendingReview: result.pendingReview[0]?.count || 0,
    active: result.active[0]?.count || 0,
    rejected: result.rejected[0]?.count || 0,
    blocked: result.blocked[0]?.count || 0,
  });
}

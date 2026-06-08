import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { AtcUser } from "@/models/AtcUser";
import { AtcStudent } from "@/models/Student";
import { verifyAtc } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const decoded = await verifyAtc(request);
    
    if (!decoded) {
      return NextResponse.json({ authorized: false, message: "No session found" }, { status: 401 });
    }

    await connectDB();
    
    // Explicitly initialize AtcApplication
    await import("@/models/AtcApplication");
    
    const user = await AtcUser.findById(decoded.id)
      .populate({
        path: "applicationId",
        select: "-photo -logo -signature -aadharDoc -marksheetDoc -otherDocs -paymentScreenshot -instituteDocument"
      })
      .lean() as any;
    
    if (!user) {
      return NextResponse.json({ authorized: false, message: "User not found" }, { status: 404 });
    }

    // Fetch Stats in parallel to save time
    const statsResult = await AtcStudent.aggregate([
      { $match: { tpCode: user.tpCode } },
      {
        $facet: {
          total: [{ $count: "count" }],
          pendingReview: [
            { $match: { 
              status: { $in: ["pending", "pending_admin"] }
            } }, 
            { $count: "count" }
          ],
          frontAll: [
            { $match: { isDirectAdmission: true } }, 
            { $count: "count" }
          ],
          frontPending: [
            { $match: { isDirectAdmission: true, status: "pending_atc" } }, 
            { $count: "count" }
          ],
          frontApproved: [
            { $match: { isDirectAdmission: true, status: "pending_admin" } }, 
            { $count: "count" }
          ],
          frontRejected: [
            { $match: { isDirectAdmission: true, status: "rejected" } }, 
            { $count: "count" }
          ],
          active: [
            { $match: { 
              $or: [
                { status: "active" }, 
                { status: "approved" }
              ],
              userStatus: { $ne: "disabled" }
            }},
            { $count: "count" }
          ],
          rejected: [{ $match: { status: "rejected", isDirectAdmission: { $ne: true } } }, { $count: "count" }],
          blocked: [{ $match: { userStatus: "disabled" } }, { $count: "count" }]
        }
      }
    ]);

    const stats = statsResult[0];

    return NextResponse.json({ 
      authorized: true,
      user: { 
        id: user._id.toString(), 
        tpCode: user.tpCode, 
        trainingPartnerName: user.trainingPartnerName,
        mobile: user.mobile,
        email: user.email,
        application: user.applicationId
      },
      stats: {
        total: stats.total[0]?.count || 0,
        pendingReview: stats.pendingReview[0]?.count || 0,
        directPending: stats.frontPending[0]?.count || 0, // Keep this for sidebar badge
        frontAll: stats.frontAll[0]?.count || 0,
        frontPending: stats.frontPending[0]?.count || 0,
        frontApproved: stats.frontApproved[0]?.count || 0,
        frontRejected: stats.frontRejected[0]?.count || 0,
        active: stats.active[0]?.count || 0,
        rejected: stats.rejected[0]?.count || 0,
        blocked: stats.blocked[0]?.count || 0,
      }
    }, { status: 200 });

  } catch (err: any) {
    console.error("API /atc/me error:", err);
    return NextResponse.json({ authorized: false, message: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const decoded = await verifyAtc(request);
    if (!decoded) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

    const { trainingPartnerName, mobile, email } = await request.json();
    await connectDB();
    
    const user = await AtcUser.findByIdAndUpdate(
      decoded.id,
      { $set: { trainingPartnerName, mobile, email } },
      { new: true }
    );

    if (!user) return NextResponse.json({ message: "User not found." }, { status: 404 });

    return NextResponse.json({
      message: "Profile updated successfully.",
      user: {
        id: user._id.toString(),
        tpCode: user.tpCode,
        trainingPartnerName: user.trainingPartnerName,
        mobile: user.mobile,
        email: user.email,
      },
    });
  } catch (error) {
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}

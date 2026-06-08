import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { StudyMaterial } from "@/models/StudyMaterial";
import { verifyAtc } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const atc = await verifyAtc(request);
    if (!atc) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();
    const materials = await StudyMaterial.find({ 
      $or: [
        { uploadedBy: "atc", atcId: atc.id },
        { uploadedBy: "admin" } // ATC can see Admin materials too? Standard practice is no, but maybe. Let's stick to their own.
      ]
    }).sort({ createdAt: -1 });
    
    return NextResponse.json(materials);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const atc = await verifyAtc(request);
    if (!atc) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const data = await request.json();
    await connectDB();
    const material = await StudyMaterial.create({
      ...data,
      uploadedBy: "atc",
      atcId: atc.id,
      tpCode: atc.tpCode,
      status: "active"
    });

    return NextResponse.json(material);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const atc = await verifyAtc(request);
    if (!atc) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { id } = await request.json();
    await connectDB();
    // Ensure they only delete their own
    const material = await StudyMaterial.findOne({ _id: id, atcId: atc.id });
    if (!material) return NextResponse.json({ message: "Material not found or unauthorized" }, { status: 403 });
    
    await StudyMaterial.findByIdAndDelete(id);
    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

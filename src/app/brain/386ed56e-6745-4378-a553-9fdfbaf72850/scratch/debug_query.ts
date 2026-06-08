import { connectDB } from "../../../../lib/mongodb";
import { AtcStudent } from "../../../../models/Student";

async function test() {
  await connectDB();
  const tpCode = "test_tp_code"; // I don't know a real one, but I can check what's in DB
  const count = await AtcStudent.countDocuments({});
  console.log("Total students in DB:", count);
  
  const sample = await AtcStudent.findOne({});
  if (sample) {
    console.log("Sample student tpCode:", sample.tpCode);
    const query = { 
      tpCode: sample.tpCode,
      $or: [
        { isDirectAdmission: { $ne: true } },
        { isDirectAdmission: true, status: { $in: ["approved", "active", "pending_admin"] } }
      ]
    };
    const results = await AtcStudent.find(query).limit(5);
    console.log("Query results count for tpCode " + sample.tpCode + ":", results.length);
  } else {
    console.log("No students found in DB at all.");
  }
  process.exit(0);
}

test();

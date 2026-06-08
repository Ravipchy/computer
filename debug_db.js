const { connectDB } = require("./src/lib/mongodb");
const { AtcStudent } = require("./src/models/Student");

async function test() {
  try {
    await connectDB();
    const count = await AtcStudent.countDocuments({});
    console.log("Total students in DB:", count);
    
    const students = await AtcStudent.find({}).limit(5).lean();
    console.log("Sample Students:", JSON.stringify(students.map(s => ({ 
      name: s.name, 
      tpCode: s.tpCode, 
      status: s.status, 
      isDirect: s.isDirectAdmission 
    })), null, 2));

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

test();

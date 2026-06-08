require("dotenv").config();
const mongoose = require("mongoose");
mongoose.connect(process.env.MONNGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  await db.collection("courses").updateMany({ $or: [{courseFee: 0}, {courseFee: null}, {courseFee: {$exists: false}}] }, { $set: { courseFee: 5000 } });
  console.log("Done patching courses");
  process.exit(0);
});

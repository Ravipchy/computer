import mongoose, { Schema, model, models } from "mongoose";

export interface ICourseEnquiry {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  mobile: string;
  courseId: mongoose.Types.ObjectId;
  courseName: string;
  createdAt: Date;
}

const CourseEnquirySchema = new Schema<ICourseEnquiry>(
  {
    name: { type: String, required: true },
    email: { type: String, required: false },
    mobile: { type: String, required: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    courseName: { type: String, required: true },
  },
  { timestamps: true }
);

export const CourseEnquiry = models.CourseEnquiry || model<ICourseEnquiry>("CourseEnquiry", CourseEnquirySchema);

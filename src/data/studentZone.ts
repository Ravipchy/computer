export type StudentZoneItem = {
  slug: string;
  title: string;
  summary: string;
  body: string[];
  pageType:
    | "registration-process"
    | "direct-admission"
    | "examination-process"
    | "online-exam"
    | "download-admit-card"
    | "registered-student"
    | "certification-verification";
};

export const studentZoneItems: StudentZoneItem[] = [
  {
    slug: "registration-process",
    title: "Registration Process",
    summary: "Start your enrollment with a simple and guided registration process.",
    pageType: "registration-process",
    body: [
      "Our registration process is designed to be simple, transparent, and student-friendly. Learners can enquire about courses, review eligibility details, and choose the program that best matches their goals.",
      "After selecting a course, students can submit their basic details, required documents, and preferred batch timing. Our team then verifies the information and confirms the admission steps clearly.",
    ],
  },

  {
    slug: "examination-process",
    title: "Examination Process",
    summary: "Understand how assessments, evaluations, and final checks are conducted.",
    pageType: "examination-process",
    body: [
      "Our examination process includes theory-based understanding, practical lab work, and skill evaluation according to the course structure. This helps ensure that students are prepared for real-world tasks.",
      "Assessment schedules, important instructions, and performance updates are shared in advance so that students can prepare with clarity and confidence.",
    ],
  },
  {
    slug: "online-exam",
    title: "Online Exam",
    summary: "Access guidance for online tests, instructions, and exam readiness.",
    pageType: "online-exam",
    body: [
      "For selected programs, online exams are conducted through structured digital assessment methods. Students receive instructions, timing details, and technical requirements before the exam date.",
      "We also help learners understand the basic exam workflow so they can attempt their online assessment without confusion.",
    ],
  },
  {
    slug: "download-admit-card",
    title: "Download Admit Card",
    summary: "Stay updated with admit card access and examination document support.",
    pageType: "download-admit-card",
    body: [
      "Students appearing for exams can use this section to understand the admit card process, exam schedule updates, and required verification steps before the test day.",
      "Our support team helps ensure that all necessary details are available in time so students can focus on preparation.",
    ],
  },
  {
    slug: "registered-student",
    title: "Registered Student",
    summary: "Information and support for students already enrolled in institute programs.",
    pageType: "registered-student",
    body: [
      "Registered students can stay connected with class schedules, exam information, academic support, and institute communication through this section.",
      "We aim to keep all enrolled learners informed about their course progress, upcoming activities, and support resources throughout their training journey.",
    ],
  },
  {
    slug: "certification-verification",
    title: "Certification Verification",
    summary: "Get details related to certificate validation and institute-issued credentials.",
    pageType: "certification-verification",
    body: [
      "Our certification verification support helps students and institutions confirm the authenticity of course completion and related academic credentials issued by the institute.",
      "This section is intended to improve transparency and trust for both students and external verification requests.",
    ],
  },
  {
    slug: "direct-admission",
    title: "Direct Admission",
    summary: "Enroll directly into our courses through our simplified online admission portal.",
    pageType: "direct-admission",
    body: [
      "The Direct Admission portal is designed for independent students who wish to apply for courses without visiting a physical study center initially.",
      "Fill out the comprehensive admission form, upload required documents, and choose your preferred course and exam mode. Our team will review your application and process your enrollment accordingly.",
    ],
  },
];

export const studentZoneMap = Object.fromEntries(
  studentZoneItems.map((item) => [item.slug, item]),
);
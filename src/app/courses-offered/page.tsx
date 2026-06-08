import CoursesOfferedContent from "@/components/courses/CoursesOfferedContent";
import InternalPageLayout from "@/components/InternalPageLayout";

export default function CoursesOfferedPage() {
  return (
    <InternalPageLayout
      title="Courses"
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Courses" }]}
    >
      <CoursesOfferedContent />
    </InternalPageLayout>
  );
}

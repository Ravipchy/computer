import InternalPageLayout from "@/components/InternalPageLayout";
import StudentZoneContent from "@/components/student-zone/StudentZoneContent";
import { studentZoneMap } from "@/data/studentZone";

export default function DirectAdmissionPage() {
  const directAdmissionItem = studentZoneMap["direct-admission"];

  return (
    <InternalPageLayout
      title="Direct Admission"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Students Zone", href: "/student-zone/registration-process" },
        { label: "Direct Admission" },
      ]}
    >
      <StudentZoneContent item={directAdmissionItem} />
    </InternalPageLayout>
  );
}

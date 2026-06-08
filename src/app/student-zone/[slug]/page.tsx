import { notFound } from "next/navigation";
import InternalPageLayout from "@/components/InternalPageLayout";
import StudentZoneContent from "@/components/student-zone/StudentZoneContent";
import { studentZoneItems, studentZoneMap } from "@/data/studentZone";

type StudentZonePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  return studentZoneItems.map((item) => ({ slug: item.slug }));
}

export default async function StudentZonePage({ params }: StudentZonePageProps) {
  const { slug } = await params;
  const item = studentZoneMap[slug];

  if (!item) {
    notFound();
  }

  return (
    <InternalPageLayout
      title={item.title}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Students Zone" },
        { label: item.title },
      ]}
    >
      <StudentZoneContent item={item} />
    </InternalPageLayout>
  );
}
import InternalPageLayout from "@/components/InternalPageLayout";
import { getBrandName } from "@/lib/settings";

export default async function OurVisionPage() {
  const brandName = await getBrandName();
  return (
    <InternalPageLayout
      title="Vision"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "About Us", href: "/about-institute" },
        { label: "Vision" },
      ]}
    >
      <div className="mx-auto w-full max-w-6xl">
        <div className="max-w-5xl space-y-4 text-slate-500">
          <h2 className="text-2xl font-extrabold text-slate-900">Vision</h2>
          <div className="text-sm leading-8 sm:text-base sm:leading-9">
            <p>
              At {brandName}, we envision a world where technology is
              accessible to everyone, and our students are at the forefront of
              innovation. We aim to bridge the gap between theoretical knowledge and
              practical application.
            </p>
            <p className="mt-4">
              Our vision is to prepare learners to meet the challenges of a rapidly
              evolving digital landscape with confidence, discipline, and real-world
              technical skills. We want every student to feel capable of building a
              meaningful and future-ready career.
            </p>
          </div>
        </div>
      </div>
    </InternalPageLayout>
  );
}
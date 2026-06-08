import InternalPageLayout from "@/components/InternalPageLayout";

export default function OurMissionPage() {
  return (
    <InternalPageLayout
      title="Mission"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "About Us", href: "/about-institute" },
        { label: "Mission" },
      ]}
    >
      <div className="mx-auto w-full max-w-6xl">
        <div className="max-w-5xl space-y-4 text-slate-500">
          <h2 className="text-2xl font-extrabold text-slate-900">Mission</h2>
          <div className="text-sm leading-8 sm:text-base sm:leading-9">
            <p>
              Our mission is to deliver high-quality, industry-relevant training in a
              range of computer-related disciplines. We strive to deliver excellence by
              offering comprehensive, up-to-date courses in programming, cybersecurity,
              data science, networking, and more.
            </p>
            <p className="mt-4">
              We aim to empower individuals by equipping our students with the skills
              and confidence needed to excel in their careers. We foster innovation by
              encouraging creative thinking and problem-solving through practical,
              hands-on learning experiences.
            </p>
            <p className="mt-4">
              We also believe in building community by creating a supportive environment
              where students can collaborate, network, and grow together while preparing
              for real-world opportunities.
            </p>
          </div>
        </div>
      </div>
    </InternalPageLayout>
  );
}
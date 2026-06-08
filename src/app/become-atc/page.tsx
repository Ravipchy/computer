import BecomeAtcForm from "@/components/affiliation/BecomeAtcForm";
import InternalPageLayout from "@/components/InternalPageLayout";

export default function BecomeAtcPage() {
  return (
    <InternalPageLayout
      title="Apply For ATC"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Affiliation Process" },
        { label: "Apply for ATC" },
      ]}
    >
      <BecomeAtcForm />
    </InternalPageLayout>
  );
}


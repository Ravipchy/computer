import AffiliationContent from "@/components/affiliation/AffiliationContent";
import InternalPageLayout from "@/components/InternalPageLayout";

export default function AffiliationProcessPage() {
  return (
    <InternalPageLayout
      title="Affiliation Process"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Franchise" },
        { label: "Affiliation Process" },
      ]}
    >
      <AffiliationContent />
    </InternalPageLayout>
  );
}

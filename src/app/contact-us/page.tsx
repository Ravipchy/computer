import ContactUsContent from "@/components/contact/ContactUsContent";
import InternalPageLayout from "@/components/InternalPageLayout";

export default function ContactUsPage() {
  return (
    <InternalPageLayout
      title="Get In Touch"
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Contact Us" }]}
    >
      <ContactUsContent />
    </InternalPageLayout>
  );
}

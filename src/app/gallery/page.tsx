import GalleryContent from "@/components/gallery/GalleryContent";
import InternalPageLayout from "@/components/InternalPageLayout";

export default function GalleryPage() {
  return (
    <InternalPageLayout
      title="Photo Gallery"
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Gallery" }]}
    >
      <GalleryContent />
    </InternalPageLayout>
  );
}

import SectionWrapper from "@/components/SectionWrapper";
import { getFullBrandData } from "@/lib/settings";

export default async function Contact() {
  const brand = await getFullBrandData();
  const brandName = brand.brand_name || "Institution";
  const brandEmail = brand.brand_email || "Not available";
  const brandMobile = brand.brand_mobile || "Not available";
  const brandAddress = brand.brand_address || "Not available";
  const brandTagline = brand.brand_url || "Official website";

  return (
    <SectionWrapper
      id="contact"
      title="Contact Us"
      subtitle="Have questions? Send us a message and our team will get back to you."
      className="bg-slate-100"
    >
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-200">
          <h3 className="text-2xl font-semibold text-slate-900">{brandName}</h3>
          <p className="text-slate-600">{brandTagline}</p>
          <div className="space-y-2 text-sm text-slate-700">
            <p>
              <span className="font-semibold">Email:</span> {brandEmail}
            </p>
            <p>
              <span className="font-semibold">Phone:</span> {brandMobile}
            </p>
            <p>
              <span className="font-semibold">Address:</span> {brandAddress}
            </p>
          </div>
        </div>
        <form className="space-y-4 rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-200">
          <input
            type="text"
            placeholder="Your Name"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <input
            type="email"
            placeholder="Your Email"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <textarea
            placeholder="Your Message"
            rows={5}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white transition hover:bg-blue-800"
          >
            Send Message
          </button>
        </form>
      </div>
    </SectionWrapper>
  );
}

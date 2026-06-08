import { Mail, MapPin, Phone } from "lucide-react";
import { getFullBrandData } from "@/lib/settings";

export default async function ContactUsContent() {
  const brand = await getFullBrandData();
  const contactCards = [
    {
      title: "Write a mail",
      value: `Email: ${brand.brand_email || "Not available"}`,
      Icon: Mail,
    },
    {
      title: "Contact Number",
      value: `Phone: ${brand.brand_mobile || "Not available"}`,
      Icon: Phone,
    },
    {
      title: "Visit Us",
      value: `Address: ${brand.brand_address || "Not available"}`,
      Icon: MapPin,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl">
      <section className="text-center">
        <h2 className="text-2xl font-extrabold uppercase text-slate-800 sm:text-4xl lg:text-5xl">Contact Us</h2>

        <div className="mx-auto mt-8 grid max-w-4xl gap-4 sm:grid-cols-3">
          {contactCards.map(({ title, value, Icon }) => (
            <article key={title} className="bg-[#f4f4f4] px-4 py-5 text-center">
              <Icon className="mx-auto h-5 w-5 text-[#0b0b92]" />
              <h3 className="mt-2 text-sm font-semibold text-slate-800">{title}</h3>
              <p className="mt-2 text-xs leading-5 text-slate-500">{value}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-14 w-full max-w-xl">
        <h3 className="text-center text-2xl font-extrabold uppercase text-slate-800 sm:text-4xl lg:text-5xl">
          Send Us Message
        </h3>

        <form className="mt-7 space-y-3" action="#" method="post">
          <input
            type="text"
            placeholder="FULL NAME"
            className="h-10 w-full border border-slate-300 bg-white px-3 text-xs tracking-wide text-slate-700 outline-none transition focus:border-[#0a0aa1]"
          />
          <input
            type="text"
            placeholder="MOBILE NUMBER"
            className="h-10 w-full border border-slate-300 bg-white px-3 text-xs tracking-wide text-slate-700 outline-none transition focus:border-[#0a0aa1]"
          />
          <input
            type="email"
            placeholder="EMAIL ID"
            className="h-10 w-full border border-slate-300 bg-white px-3 text-xs tracking-wide text-slate-700 outline-none transition focus:border-[#0a0aa1]"
          />
          <textarea
            placeholder="WRITE A MESSAGE"
            rows={5}
            className="w-full border border-slate-300 bg-white px-3 py-2 text-xs tracking-wide text-slate-700 outline-none transition focus:border-[#0a0aa1]"
          />
          <div className="text-center">
            <button
              type="submit"
              className="rounded-sm bg-green-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700"
            >
              Send Message
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

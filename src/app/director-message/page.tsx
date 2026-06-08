import Image from "next/image";
import InternalPageLayout from "@/components/InternalPageLayout";
import { getBrandName } from "@/lib/settings";

export default async function DirectorMessagePage() {
  const brandName = await getBrandName();
  return (
    <InternalPageLayout
      title="Director Message"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "About Us", href: "/about-institute" },
        { label: "Director Message" },
      ]}
    >
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[320px_1fr] lg:items-start">
        <div className="mx-auto w-full max-w-90">
          <div className="relative z-10 overflow-hidden border border-slate-300 bg-white shadow-sm">
            <div className="relative aspect-4/5 w-full">
              <Image
                src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=900&q=80"
                alt="Managing Director"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 360px, 28vw"
              />
            </div>
          </div>
          <div className="-mt-8 ml-4 bg-slate-100 px-5 pt-10 pb-4 text-center shadow-sm">
            <h2 className="text-lg font-extrabold text-slate-900 sm:text-xl">
              Mr. Rahul Upadhyay
            </h2>
            <p className="text-lg font-extrabold leading-tight text-slate-900 sm:text-xl">
              Managing Director
            </p>
          </div>
        </div>

        <div className="space-y-4 text-slate-500">
          <h2 className="text-2xl font-extrabold text-slate-900">Director Message</h2>
          <div className="space-y-3 text-sm leading-8 sm:text-base sm:leading-9">
            <p>Dear Students, Parents, and Prospective Learners,</p>
            <p>
              Welcome to {brandName}. It is with great pride and enthusiasm
              that I extend a warm greeting to each of you. As the Director of this
              esteemed institute, I am honored to lead a team that is deeply committed
              to nurturing talent and shaping the future of technology.
            </p>
            <p>
              In an era where technology is not just a part of our lives but a driving
              force behind global progress, it is essential to equip ourselves with the
              skills and knowledge to navigate and excel in this dynamic field. At {brandName}, our goal is to provide an exceptional learning
              experience that empowers individuals to thrive in the ever-evolving world of IT.
            </p>
            <p>
              Our institute stands at the forefront of technological education, driven
              by a commitment to excellence and innovation. We offer a comprehensive
              range of programs designed to address the diverse needs of our students,
              from foundational courses in computer science to advanced specializations
              in emerging technologies.
            </p>
            <p>
              Thank you for choosing {brandName}. We look forward to being
              a part of your success story and helping you build a confident future.
            </p>
          </div>
        </div>
      </div>
    </InternalPageLayout>
  );
}
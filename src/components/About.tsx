import Image from "next/image";
import SectionWrapper from "@/components/SectionWrapper";

export default function About() {
  return (
    <SectionWrapper
      id="about"
      title="About Us"
      subtitle="A trusted institute helping students build practical and professional skills."
      className="bg-slate-100"
    >
      <div className="grid items-center gap-8 lg:grid-cols-2">
        <div className="relative h-64 sm:h-80 overflow-hidden rounded-2xl shadow-lg">
          <Image
            src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80"
            alt="Training institute classroom"
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>
        <div className="space-y-4">
          <h3 className="text-2xl font-semibold text-slate-900">
            We Build Careers Through Practical Learning
          </h3>
          <p className="leading-relaxed text-slate-600">
            Our institute offers project-based training in accounting, office
            productivity, design, and software development. We focus on real-world
            skills that help students become confident professionals.
          </p>
          <p className="leading-relaxed text-slate-600">
            With experienced mentors, supportive guidance, and placement-oriented
            sessions, we help learners from all backgrounds move toward better
            opportunities.
          </p>
        </div>
      </div>
    </SectionWrapper>
  );
}

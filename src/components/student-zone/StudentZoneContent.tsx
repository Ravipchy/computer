import Image from "next/image";
import Link from "next/link";
import DirectAdmissionForm from "@/components/student-zone/DirectAdmissionForm";
import OnlineExamPortal from "@/components/student-zone/OnlineExamPortal";
import AdmitCardViewer from "@/components/student-zone/AdmitCardViewer";
import type { StudentZoneItem } from "@/data/studentZone";

type StudentZoneContentProps = {
  item: StudentZoneItem;
};

function FormCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function SearchForm({ buttonText }: { buttonText: string }) {
  return (
    <form className="space-y-5" action="#" method="post">
      <input
        type="text"
        placeholder="Enrollment Number"
        className="w-full border border-slate-300 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#0a0aa1]"
      />
      <button
        type="submit"
        className="rounded-sm bg-green-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
      >
        {buttonText}
      </button>
    </form>
  );
}

function RegistrationIntro() {
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[360px_1fr] lg:items-center">
      <div className="mx-auto w-full max-w-82">
        <div className="relative aspect-4/5 w-full overflow-hidden border border-slate-200 bg-slate-50">
          <Image
            src="/team-placeholder.svg"
            alt="Registration support"
            fill
            className="object-contain p-2"
            sizes="(max-width: 1024px) 300px, 28vw"
          />
        </div>
      </div>
      <div className="text-slate-700">
        <h2 className="text-4xl font-bold leading-tight text-slate-800">
          Registration Process
        </h2>
        <p className="mt-3 text-lg text-slate-500">Click to Student Zone</p>
      </div>
    </div>
  );
}

export default function StudentZoneContent({ item }: StudentZoneContentProps) {
  if (!item) {
    return (
      <div className="p-10 text-center border border-dashed border-slate-200 rounded-2xl">
        <p className="text-slate-400 font-medium">Page content not found. Please try again later.</p>
      </div>
    );
  }

  if (item.pageType === "registration-process") {
    return (
      <div className="space-y-10">
        <RegistrationIntro />

      </div>
    );
  }

  if (item.pageType === "direct-admission") {
    return <DirectAdmissionForm />;
  }

  if (item.pageType === "online-exam") {
    return <OnlineExamPortal />;
  }

  if (item.pageType === "examination-process") {
    return (
      <div className="mx-auto w-full max-w-5xl text-slate-700">
        <h2 className="text-5xl font-bold text-slate-800">Examination Process</h2>
        <div className="mt-5 space-y-2 text-2xl leading-relaxed text-slate-500">
          <p>Exam Will be Online/Offline mode</p>
          <p>Exam Pattern</p>
          <p>Each subject will have 100 total Marks</p>
          <p>30 Marks Practical</p>
          <p>70 Marks Theory</p>
        </div>
      </div>
    );
  }

  if (item.pageType === "download-admit-card") {
    return <AdmitCardViewer />;
  }

  if (item.pageType === "registered-student") {
    return (
      <FormCard title="Registered Students">
        <SearchForm buttonText="submit" />
      </FormCard>
    );
  }

  return (
    <FormCard title="Certificate Verification">
      <SearchForm buttonText="Search" />
    </FormCard>
  );
}

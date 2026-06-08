import Link from "next/link";
import InternalPageLayout from "@/components/InternalPageLayout";

const downloads = [
  {
    id: 1,
    title: "Tally Practice file",
    href: "/downloads/tally-practice-file.txt",
  },
];

export default function DownloadSectionPage() {
  return (
    <InternalPageLayout
      title="Download Section"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Download Section" },
      ]}
    >
      <div className="mx-auto w-full max-w-5xl">
        <h2 className="text-3xl font-bold text-slate-800 sm:text-4xl">Download Section</h2>

        <div className="mt-8 overflow-hidden border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm text-slate-700">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="border border-slate-200 px-4 py-4 text-center font-semibold sm:px-6">
                    SNo
                  </th>
                  <th className="border border-slate-200 px-4 py-4 text-center font-semibold sm:px-6">
                    Download Heading
                  </th>
                  <th className="border border-slate-200 px-4 py-4 text-center font-semibold sm:px-6">
                    Click to Download
                  </th>
                </tr>
              </thead>
              <tbody>
                {downloads.map((item) => (
                  <tr key={item.id} className="bg-white">
                    <td className="border border-slate-200 px-4 py-5 sm:px-6">{item.id}</td>
                    <td className="border border-slate-200 px-4 py-5 sm:px-6">{item.title}</td>
                    <td className="border border-slate-200 px-4 py-5 text-center sm:px-6">
                      <Link
                        href={item.href}
                        download
                        className="inline-flex items-center justify-center rounded-md bg-blue-600 px-5 py-2.5 font-semibold text-white transition hover:bg-blue-700"
                      >
                        Download
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </InternalPageLayout>
  );
}
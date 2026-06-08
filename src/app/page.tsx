import Courses from "@/components/Courses";
import FaqAbout from "@/components/FaqAbout";
import Feedback from "@/components/Feedback";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import Navbar from "@/components/Navbar";
import Team from "@/components/Team";
import WorkProcess from "@/components/WorkProcess";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="overflow-hidden">
        <Hero />
        <Courses />
        <FaqAbout />
        <Team />
        <WorkProcess />
        <Feedback />
      </main>
      <Footer />
    </>
  );
}

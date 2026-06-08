import { redirect } from "next/navigation";

// Permanently redirect old /franchise-login to the new /atc/login
export default function FranchiseLoginPage() {
  redirect("/atc/login");
}

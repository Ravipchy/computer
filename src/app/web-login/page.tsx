import { redirect } from "next/navigation";

// The web-login page now delegates to the proper admin login
export default function WebLoginPage() {
  redirect("/admin/login");
}

import { redirect } from "next/navigation";

// The /login page is disabled — any visit is redirected to the home page.
// (Only the exact /login route; /login/forgot-password still works.)
const page = () => {
  redirect("/");
};

export default page;

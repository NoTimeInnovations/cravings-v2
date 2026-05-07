import SuperadminGuard from "@/components/superAdmin/SuperadminGuard";

export default function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SuperadminGuard>{children}</SuperadminGuard>;
}

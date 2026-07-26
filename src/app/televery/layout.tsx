import TeleveryGuard from "@/components/televery/TeleveryGuard";

export default function TeleveryLayout({ children }: { children: React.ReactNode }) {
  return <TeleveryGuard>{children}</TeleveryGuard>;
}

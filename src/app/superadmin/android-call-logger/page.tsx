import AndroidCallLoggerSection from "@/components/callLogger/AndroidCallLoggerSection";

export default function AndroidCallLoggerPage() {
  // pt-24 clears the fixed superadmin navbar (matches the other superadmin pages).
  return (
    <main className="min-h-screen px-3 py-5 pt-24 sm:px-[7.5%]">
      <AndroidCallLoggerSection />
    </main>
  );
}

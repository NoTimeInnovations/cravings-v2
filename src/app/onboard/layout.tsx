import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Business Onboarding - Cravings",
  description: "Register your business with Cravings and start serving customers",
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto py-4 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl text-orange-500">Cravings</span>
              <span className="text-sm bg-orange-100 text-orange-800 px-2 py-0.5 rounded">Business</span>
            </div>
            <div>
              <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="bg-white border-t mt-12">
        <div className="container mx-auto py-6 px-4 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Cravings. All rights reserved.
        </div>
      </footer>
    </div>
  );
} 
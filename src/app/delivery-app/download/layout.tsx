import Image from "next/image";
import Link from "next/link";

export default function DownloadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="fixed w-full z-[60] top-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-b border-stone-100">
        <nav className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">
          <div className="flex justify-center h-14 items-center">
            <Link href="/" className="flex items-center">
              <Image
                src="/menuthere_logo_full.svg"
                alt="Menuthere"
                width={140}
                height={38}
                className="h-7 w-auto object-contain"
              />
            </Link>
          </div>
        </nav>
      </header>
      <div className="pt-14">{children}</div>
    </>
  );
}

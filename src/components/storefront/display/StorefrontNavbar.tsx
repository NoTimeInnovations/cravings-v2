import Link from "next/link";

interface Props {
  partner: { store_name: string; store_banner?: string; username: string };
  primaryColor: string;
  menuUrl: string;
}

export function StorefrontNavbar({ partner, primaryColor, menuUrl }: Props) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b h-14 md:h-16 flex items-center px-4 md:px-8">
      <div className="flex-1 flex items-center gap-3 min-w-0">
        {partner.store_banner ? (
          <img
            src={partner.store_banner}
            alt={partner.store_name}
            className="h-8 md:h-10 w-auto object-contain"
          />
        ) : null}
        <span className="font-bold text-base md:text-lg text-gray-900 truncate">
          {partner.store_name}
        </span>
      </div>
      <Link
        href={menuUrl}
        className="inline-flex items-center rounded-full px-4 md:px-6 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 whitespace-nowrap"
        style={{ backgroundColor: primaryColor }}
      >
        Order Now
      </Link>
    </nav>
  );
}

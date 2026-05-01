interface PartnerData {
  store_name: string;
  description?: string;
  phone?: string;
  location?: string;
  location_details?: string;
}

export function StorefrontFooter({ partner }: { partner: PartnerData }) {
  const address = partner.location_details || partner.location;

  return (
    <footer className="bg-gray-900 text-white px-6 py-12">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-xl font-bold">{partner.store_name}</h3>
          {partner.description && (
            <p className="text-sm text-white/60 mt-2 max-w-xs">
              {partner.description}
            </p>
          )}
        </div>
        <div className="md:text-right text-sm text-white/80 space-y-1">
          {address && <p>{address}</p>}
          {partner.phone && (
            <p>
              <a href={`tel:${partner.phone}`} className="hover:text-white">
                {partner.phone}
              </a>
            </p>
          )}
        </div>
      </div>
      <div className="border-t border-white/10 mt-8 pt-6 text-center text-xs text-white/50">
        Powered by <span className="font-medium text-white/80">MenuThere</span>
      </div>
    </footer>
  );
}

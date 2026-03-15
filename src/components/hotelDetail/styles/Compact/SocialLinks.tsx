import type { SocialLinks } from "@/app/hotels/[...id]/page";
import { ExternalLink, MapPin, Phone } from "lucide-react";
import React from "react";
import { FaFacebook, FaInstagram, FaWhatsapp } from "react-icons/fa";

const LinkItem = ({
  href,
  icon,
  text,
  styles,
}: {
  href: string;
  icon: React.ReactNode;
  text: string;
  styles?: React.CSSProperties;
}) => {
  return (
    <a
      style={styles}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center space-x-2 border-[1px] border-gray-300 p-2 rounded-md"
    >
      {icon}
      <span className="text-xs text-gray-600 text-nowrap  font-semibold">{text}</span>
    </a>
  );
};

const SocialLinks = ({ socialLinks, geoLocationLink }: { socialLinks: SocialLinks; geoLocationLink?: string }) => {
  return (
    <>
      {socialLinks.phone && socialLinks.phone !== "" ? (
        <div>
          <LinkItem
            styles={{
              borderColor: "#fce8e6",
              color: "#ff4d4f",
              backgroundColor: "#fff5f5",
            }}
            href={`tel:${socialLinks.phone}`}
            icon={<Phone size={15} />}
            text={socialLinks.phone}
          />
        </div>
      ) : null}
      {socialLinks.whatsapp && socialLinks.whatsapp !== "" ? (
        <div>
          <LinkItem
            styles={{
              borderColor: "#d8f8e4",
              color: "#25D366",
              backgroundColor: "#f9fefb",
            }}
            href={socialLinks.whatsapp}
            icon={<FaWhatsapp size={15} />}
            text={socialLinks.whatsapp?.split("/").pop() || "WhatsApp"}
          />
        </div>
      ) : null}

      {socialLinks.instagram && socialLinks.instagram !== "" ? (
        <div>
          <LinkItem
            styles={{
              borderColor: "#eacfff",
              color: "#ad46ff",
              backgroundColor: "#fbf7ff",
            }}
            href={
              socialLinks.instagram.startsWith("http")
                ? socialLinks.instagram
                : `${socialLinks.instagram}`
            }
            icon={<FaInstagram size={15} />}
            text="Instagram"
          />
        </div>
      ) : null}

      {socialLinks.facebook && socialLinks.facebook !== "" ? (
        <div>
          <LinkItem
            styles={{
              borderColor: "#c8deff",
              color: "#1877F2",
              backgroundColor: "#f0f5ff",
            }}
            href={
              socialLinks.facebook.startsWith("http")
                ? socialLinks.facebook
                : `https://facebook.com/${socialLinks.facebook}`
            }
            icon={<FaFacebook size={15} />}
            text="Facebook"
          />
        </div>
      ) : null}

      {socialLinks.zomato && socialLinks.zomato !== "" ? (
        <div>
          <LinkItem
            styles={{
              borderColor: "#fde0e0",
              color: "#e23744",
              backgroundColor: "#fff5f5",
            }}
            href={socialLinks.zomato}
            icon={<ExternalLink size={15} />}
            text="Zomato"
          />
        </div>
      ) : null}

      {socialLinks.uberEats && socialLinks.uberEats !== "" ? (
        <div>
          <LinkItem
            styles={{
              borderColor: "#d4edda",
              color: "#06C167",
              backgroundColor: "#f4faf6",
            }}
            href={socialLinks.uberEats}
            icon={<ExternalLink size={15} />}
            text="Uber Eats"
          />
        </div>
      ) : null}

      {socialLinks.talabat && socialLinks.talabat !== "" ? (
        <div>
          <LinkItem
            styles={{
              borderColor: "#ffe4cc",
              color: "#ff5a00",
              backgroundColor: "#fff8f2",
            }}
            href={socialLinks.talabat}
            icon={<ExternalLink size={15} />}
            text="Talabat"
          />
        </div>
      ) : null}

      {socialLinks.doordash && socialLinks.doordash !== "" ? (
        <div>
          <LinkItem
            styles={{
              borderColor: "#fde0e0",
              color: "#FF3008",
              backgroundColor: "#fff5f3",
            }}
            href={socialLinks.doordash}
            icon={<ExternalLink size={15} />}
            text="DoorDash"
          />
        </div>
      ) : null}

      {(geoLocationLink || (socialLinks.location && socialLinks.location !== "")) ? (
        <div>
          <LinkItem
            styles={{
              borderColor: "#c8deff",
              color: "#2b7fff",
              backgroundColor: "#eff5ff",
            }}
            href={(geoLocationLink || socialLinks.location) as string}
            icon={<MapPin size={15} />}
            text="Location"
          />
        </div>
      ) : null}
    </>
  );
};

export default SocialLinks;

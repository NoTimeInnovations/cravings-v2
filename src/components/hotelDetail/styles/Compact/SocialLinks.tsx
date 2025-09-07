import type { SocialLinks } from "@/app/hotels/[...id]/page";
import { MapPin, Phone } from "lucide-react";
import React from "react";
import { FaInstagram, FaWhatsapp } from "react-icons/fa";

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
      className="flex items-center space-x-2 border-[1px] border-gray-300 p-2 rounded-md "
    >
      {icon}
      <span className="text-xs text-gray-500 text-nowrap">{text}</span>
    </a>
  );
};

const SocialLinks = ({ socialLinks }: { socialLinks: SocialLinks }) => {
  return (
    <>
      {socialLinks.phone ? (
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
      {socialLinks.whatsapp ? (
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

      {socialLinks.instagram ? (
        <div>
          <LinkItem
            styles={{
              borderColor: "#eacfff",
              color: "#ad46ff",
              backgroundColor: "#fbf7ff",
            }}
            href={socialLinks.instagram}
            icon={<FaInstagram size={15} />}
            text={socialLinks.instagram?.split("/").pop() || "Instagram"}
          />
        </div>
      ) : null}

      {socialLinks.location ? (
        <div>
          <LinkItem
            styles={{
              borderColor: "#c8deff",
              color: "#2b7fff",
              backgroundColor: "#eff5ff",
            }}
            href={socialLinks.location}
            icon={<MapPin size={15} />}
            text="Location"
          />
        </div>
      ) : null}
    </>
  );
};

export default SocialLinks;

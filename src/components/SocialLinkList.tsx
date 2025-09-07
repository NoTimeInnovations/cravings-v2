import { SocialLinks } from "@/app/hotels/[...id]/page";
// import { ChatBubbleIcon, InstagramLogoIcon } from "@radix-ui/react-icons";
import { FaInstagram, FaWhatsapp } from "react-icons/fa";
import React from "react";
import { Styles } from "@/screens/HotelMenuPage_v2";
import { MapPin } from "lucide-react";

const SocialLinkList = ({
  socialLinks,
  styles,
  hotelId
}: {
  socialLinks: SocialLinks;
  styles: Styles;
  hotelId: string;
}) => {
  return (
    <>
      {socialLinks && (
        <>
          {socialLinks.instagram && (
            <a
              href={socialLinks.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className=" hover:text-gray-700"
              style={{
                color: styles?.accent || "#000000",
              }}
            >
              <FaInstagram className="w-6 h-6" />
            </a>
          )}
          {(() => {
            // Special case for specific hotelId
            if (hotelId === "b984fe67-6cd8-4cfa-867d-cb2f44c42ee8") {
              return (
                <a
                  href="https://chat.whatsapp.com/CH9A6SQZCDi0tb3kSKp6IF"
                  target="_blank"
                  rel="noopener noreferrer"
                  className=" hover:text-gray-700"
                  style={{
                    color: styles?.accent || "#000000",
                  }}
                >
                  <FaWhatsapp className="w-6 h-6" />
                </a>
              );
            }
            // If whatsapp is a number, prepend country code
            if (socialLinks.whatsapp) {
              const whatsapp = socialLinks.whatsapp.trim();
              const isNumber = /^\d+$/.test(whatsapp);
              const link = isNumber
                ? `https://wa.me/${whatsapp}`
                : whatsapp;
              return (
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className=" hover:text-gray-700"
                  style={{
                    color: styles?.accent || "#000000",
                  }}
                >
                  <FaWhatsapp className="w-6 h-6" />
                </a>
              );
            }
            return null;
          })()}
          {/* {socialLinks.googleReview && (
            <a
              href={socialLinks.googleReview}
              target="_blank"
              rel="noopener noreferrer"
              className=" hover:text-gray-700"
              style={{
                color: styles?.accent || "#000000",
              }}
            >
              <FaGoogle className="w-6 h-6" />
            </a>
          )} */}
          {socialLinks.location && (
            <a
              href={socialLinks.location}
              target="_blank"
              rel="noopener noreferrer"
              className=" hover:text-gray-700"
              style={{
                color: styles?.accent || "#000000",
              }}
            >
              <MapPin className="w-6 h-6" />
            </a>
          )}
        </>
      )}
    </>
  );
};

export default SocialLinkList;

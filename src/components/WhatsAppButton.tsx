"use client";

import { useState } from "react";

const WHATSAPP_NUMBER = "918590115462";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

export default function WhatsAppButton() {
    const [hovered, setHovered] = useState(false);

    return (
        <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat with us on WhatsApp"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                position: "fixed",
                bottom: "24px",
                right: "24px",
                zIndex: 9999,
                display: "flex",
                alignItems: "center",
                gap: "10px",
                backgroundColor: "#25D366",
                borderRadius: "50px",
                padding: hovered ? "12px 20px 12px 16px" : "14px",
                boxShadow: "0 4px 16px rgba(37,211,102,0.45)",
                textDecoration: "none",
                transition: "all 0.25s ease",
                overflow: "hidden",
                maxWidth: hovered ? "220px" : "52px",
            }}
        >
            {/* Chat bubble icon */}
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="white"
                style={{ width: "24px", height: "24px", flexShrink: 0 }}
            >
                <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.95 7.95 0 01-4.073-1.117l-.291-.174-3.007.894.894-3.007-.174-.291A7.95 7.95 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8zm4.5-6.25c-.247-.124-1.458-.719-1.685-.801-.226-.082-.39-.124-.555.124-.165.247-.638.801-.781.966-.144.165-.288.185-.535.062-.247-.124-1.044-.385-1.988-1.228-.735-.656-1.231-1.467-1.375-1.714-.144-.247-.015-.38.108-.503.111-.11.247-.288.37-.432.124-.144.165-.247.247-.412.082-.165.041-.309-.021-.432-.062-.124-.555-1.337-.76-1.831-.2-.48-.404-.415-.555-.423l-.473-.008c-.165 0-.432.062-.658.309-.226.247-.864.844-.864 2.059s.885 2.389 1.008 2.554c.124.165 1.74 2.657 4.217 3.726.59.254 1.05.406 1.408.52.591.188 1.13.161 1.555.098.474-.071 1.458-.596 1.664-1.172.206-.576.206-1.07.144-1.172-.062-.103-.226-.165-.473-.288z" />
            </svg>

            {/* Label — visible on hover */}
            <span
                style={{
                    color: "white",
                    fontWeight: 600,
                    fontSize: "14px",
                    whiteSpace: "nowrap",
                    opacity: hovered ? 1 : 0,
                    transition: "opacity 0.2s ease",
                }}
            >
                Chat with us
            </span>
        </a>
    );
}

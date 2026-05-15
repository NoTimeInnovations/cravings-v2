"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  image_url?: string;
  is_veg?: boolean;
  tags?: string[];
}

interface CategoryGroup {
  id: string;
  name: string;
  items: MenuItem[];
}

interface Props {
  categories: CategoryGroup[];
  currency: string;
  note: string;
  ctaText: string;
  menuUrl: string;
}

function formatPrice(price: number, currency: string) {
  return `${currency}${Number(price).toFixed(0)}`;
}

export function MenuTabs({ categories, currency, note, ctaText, menuUrl }: Props) {
  const [active, setActive] = useState(categories[0]?.id ?? "");
  const current = categories.find((c) => c.id === active) ?? categories[0];

  if (!categories.length) return null;

  return (
    <>
      <div className="wb-menu-tabs">
        {categories.map((c) => (
          <button
            key={c.id}
            className={"wb-menu-tab " + (c.id === active ? "wb-active" : "")}
            onClick={() => setActive(c.id)}
            type="button"
          >
            {c.name}
          </button>
        ))}
      </div>

      <div style={{ width: "100%", marginTop: 48 }}>
        <div className="wb-menu-grid">
          {current?.items.map((it) => (
            <div className="wb-menu-row" key={it.id}>
              <div className="wb-menu-thumb">
                {it.image_url ? (
                  <img src={it.image_url} alt={it.name} />
                ) : null}
              </div>
              <div>
                <h3 className="wb-menu-name">{it.name}</h3>
                {it.description && (
                  <p className="wb-menu-desc">{it.description}</p>
                )}
                {(it.tags?.length || it.is_veg) ? (
                  <div className="wb-menu-tags">
                    {it.is_veg && <span className="wb-menu-tag">veg</span>}
                    {it.tags?.slice(0, 3).map((t) => (
                      <span className="wb-menu-tag" key={t}>
                        {t}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="wb-menu-right">
                <div className="wb-menu-price">
                  {formatPrice(it.price, currency)}
                </div>
                <a className="wb-menu-add" href={menuUrl} aria-label={`Order ${it.name}`}>
                  Order
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className="wb-menu-footer">
          {note ? <p className="wb-note">{note}</p> : <span />}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a className="wb-btn wb-btn-primary" href={menuUrl}>
              {ctaText || "See full menu"}{" "}
              <ArrowUpRight className="wb-arrow" size={14} />
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

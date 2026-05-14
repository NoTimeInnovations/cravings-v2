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

export function MenuTabsV4({
  categories,
  currency,
  note,
  ctaText,
  menuUrl,
}: Props) {
  const [active, setActive] = useState(categories[0]?.id ?? "");
  const current = categories.find((c) => c.id === active) ?? categories[0];

  if (!categories.length) return null;

  return (
    <>
      <div className="wb4-menu-tabs">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setActive(c.id)}
            className={
              "wb4-menu-tab " + (c.id === active ? "wb4-menu-tab-active" : "")
            }
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="wb4-menu-list">
        {current?.items.map((it) => (
          <div className="wb4-menu-row" key={it.id}>
            <div className="wb4-menu-thumb">
              {it.image_url ? <img src={it.image_url} alt={it.name} /> : null}
            </div>
            <div className="wb4-menu-body">
              <h3 className="wb4-menu-name">{it.name}</h3>
              {it.description && (
                <p className="wb4-menu-desc">{it.description}</p>
              )}
              {it.is_veg && <span className="wb4-menu-tag">veg</span>}
            </div>
            <div className="wb4-menu-right">
              <div className="wb4-menu-price">
                {formatPrice(it.price, currency)}
              </div>
              <a className="wb4-menu-add" href={menuUrl}>
                Order
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="wb4-menu-footer">
        {note ? <p className="wb4-menu-note">{note}</p> : <span />}
        <a className="wb4-btn wb4-btn-primary" href={menuUrl}>
          {ctaText || "See full menu"}
          <ArrowUpRight size={14} />
        </a>
      </div>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { FeaturedItemsSection } from "@/types/storefront";
import { useStorefrontStore } from "@/store/storefrontStore";
import { useAuthStore } from "@/store/authStore";
import { fetchFromHasura } from "@/lib/hasuraClient";
import { getMenu } from "@/api/menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ImageIcon } from "lucide-react";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  image_url?: string;
}

const MAX = 6;

export function FeaturedItemsSectionEditor({
  section,
}: {
  section: FeaturedItemsSection;
}) {
  const updateSection = useStorefrontStore((s) => s.updateSection);
  const { userData } = useAuthStore();
  const partnerId = userData?.id;
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!partnerId) return;
    (async () => {
      try {
        setLoading(true);
        const res = await fetchFromHasura(getMenu, { partner_id: partnerId });
        setItems(res?.menu ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [partnerId]);

  const selected = new Set(section.item_ids);
  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()),
  );

  const toggle = (id: string) => {
    let next: string[];
    if (selected.has(id)) {
      next = section.item_ids.filter((x) => x !== id);
    } else {
      if (section.item_ids.length >= MAX) return;
      next = [...section.item_ids, id];
    }
    updateSection(section.id, { item_ids: next });
  };

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold">Featured Items</h2>
      <div className="space-y-2">
        <Label>Section Title</Label>
        <Input
          value={section.title}
          onChange={(e) => updateSection(section.id, { title: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Select Items</Label>
          <Badge variant="secondary">
            {section.item_ids.length}/{MAX} selected
          </Badge>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="max-h-96 overflow-y-auto border rounded-lg divide-y">
          {loading ? (
            <div className="p-3 space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              No items
            </div>
          ) : (
            filtered.map((item) => {
              const isSelected = selected.has(item.id);
              const disabled = !isSelected && section.item_ids.length >= MAX;
              return (
                <label
                  key={item.id}
                  className={`flex items-center gap-3 p-2 cursor-pointer hover:bg-accent/30 ${
                    isSelected ? "bg-accent/30" : ""
                  } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  <Checkbox
                    checked={isSelected}
                    disabled={disabled}
                    onCheckedChange={() => toggle(item.id)}
                  />
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      className="h-10 w-10 object-cover rounded"
                      alt={item.name}
                    />
                  ) : (
                    <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <span className="flex-1 text-sm">{item.name}</span>
                  <span className="text-sm font-medium text-muted-foreground">
                    ₹{item.price}
                  </span>
                </label>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

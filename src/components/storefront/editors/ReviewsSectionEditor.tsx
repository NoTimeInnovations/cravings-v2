"use client";

import { ReviewsSection, Review } from "@/types/storefront";
import { useStorefrontStore } from "@/store/storefrontStore";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Star, Plus, X } from "lucide-react";

export function ReviewsSectionEditor({ section }: { section: ReviewsSection }) {
  const updateSection = useStorefrontStore((s) => s.updateSection);

  const updateReview = (id: string, data: Partial<Review>) => {
    updateSection(section.id, {
      reviews: section.reviews.map((r) => (r.id === id ? { ...r, ...data } : r)),
    });
  };

  const addReview = () => {
    const newReview: Review = {
      id: crypto.randomUUID(),
      author: "",
      rating: 5,
      text: "",
    };
    updateSection(section.id, { reviews: [...section.reviews, newReview] });
  };

  const removeReview = (id: string) => {
    updateSection(section.id, {
      reviews: section.reviews.filter((r) => r.id !== id),
    });
  };

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold">Guest Reviews</h2>
      <div className="space-y-2">
        <Label>Section Title</Label>
        <Input
          value={section.title}
          onChange={(e) => updateSection(section.id, { title: e.target.value })}
        />
      </div>
      <div className="space-y-3">
        {section.reviews.map((review) => (
          <Card key={review.id} className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Input
                placeholder="Author name"
                value={review.author}
                onChange={(e) => updateReview(review.id, { author: e.target.value })}
                className="flex-1"
              />
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => updateReview(review.id, { rating: n })}
                    aria-label={`Rate ${n} stars`}
                  >
                    <Star
                      className={`h-4 w-4 ${
                        n <= review.rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeReview(review.id)}
                type="button"
                aria-label="Remove review"
              >
                <X className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <Textarea
              placeholder="Review text..."
              rows={2}
              value={review.text}
              onChange={(e) => updateReview(review.id, { text: e.target.value })}
            />
            <Input
              type="date"
              value={review.date ?? ""}
              onChange={(e) => updateReview(review.id, { date: e.target.value })}
            />
          </Card>
        ))}
        {section.reviews.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-6 border rounded-lg border-dashed">
            No reviews yet
          </div>
        )}
      </div>
      <Button variant="outline" onClick={addReview} type="button">
        <Plus className="h-4 w-4 mr-2" /> Add Review
      </Button>
    </div>
  );
}

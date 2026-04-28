import ReviewsTab from "@/components/admin/ReviewsTab";
import React from "react";

const page = () => {
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-orange-50 to-orange-100 pb-20">
      <div className="max-w-7xl mx-auto p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Reviews</h1>
        <ReviewsTab />
      </div>
    </div>
  );
};

export default page;

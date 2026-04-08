import { useState, useEffect } from "react";
import { supabase } from "@/api/supabase/client";
import GoyaNav from "@/components/GoyaNav";

const Reviews = () => {
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    const fetchReviews = async () => {
      const { data: reviewsData } = await supabase.from("reviews").select("*").order("created_at", { ascending: false }).limit(50);
      if (!reviewsData || reviewsData.length === 0) { setReviews([]); return; }
      const userIds = [...new Set(reviewsData.flatMap((r: any) => [r.reviewer_id, r.artisan_id]))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      const nameMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p.full_name]));
      setReviews(reviewsData.map((r: any) => ({ ...r, reviewer_name: nameMap[r.reviewer_id] || "Customer", artisan_name: nameMap[r.artisan_id] || "Artisan" })));
    };
    fetchReviews();
  }, []);

  return (
    <div className="min-h-screen bg-craft-grey">
      <GoyaNav />
      <main className="pt-24 sm:pt-28 pb-16 px-4 sm:px-6 max-w-4xl mx-auto">
        <h1 className="text-2xl sm:text-4xl font-black mb-4 sm:mb-8">Recent Reviews</h1>
        {reviews.length === 0 ? (
          <p className="text-muted-foreground text-center py-20">No reviews yet.</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <div key={r.id} className="bg-surface rounded-xl border border-border p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex text-primary">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className="material-symbols-outlined text-base" style={{ fontVariationSettings: i < r.rating ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                    ))}
                  </div>
                </div>
                <p className="mb-2">{r.comment}</p>
                <p className="text-sm text-muted-foreground">
                  {r.reviewer_name} → {r.artisan_name}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Reviews;

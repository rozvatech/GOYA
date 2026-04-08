import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/api/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import GoyaNav from "@/components/GoyaNav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const LeaveReview = () => {
  const { jobId, artisanId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) { toast.error("Please select a rating"); return; }

    if (!user) { navigate("/auth"); return; }

    setLoading(true);
    const { error } = await supabase.from("reviews").insert({
      job_id: jobId!,
      artisan_id: artisanId!,
      reviewer_id: user.id,
      rating,
      comment,
    });
    setLoading(false);

    if (error) {
      toast.error("Failed to submit review");
    } else {
      toast.success("Review submitted! Thank you.");
      navigate("/customer-dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-craft-grey">
      <GoyaNav />
      <main className="pt-24 sm:pt-28 pb-16 px-4 sm:px-6 max-w-lg mx-auto">
        <h1 className="text-2xl sm:text-3xl font-black mb-2">Leave a Review</h1>
        <p className="text-muted-foreground mb-6 sm:mb-8 text-sm sm:text-base">How was your experience?</p>

        <form onSubmit={handleSubmit} className="bg-surface rounded-2xl border border-border p-5 sm:p-8 space-y-5 sm:space-y-6">
          {/* Star Rating */}
          <div>
            <Label className="mb-3 block">Rating</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="text-primary goya-transition hover:scale-110"
                >
                  <span
                    className="material-symbols-outlined text-4xl"
                    style={{ fontVariationSettings: star <= (hoverRating || rating) ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    star
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="comment">Your Review</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell others about your experience..."
              className="mt-1 min-h-[120px]"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-lavender-glow">
            {loading ? "Submitting..." : "Submit Review"}
          </Button>
        </form>
      </main>
    </div>
  );
};

export default LeaveReview;

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/api/supabase/client";
import GoyaNav from "@/components/GoyaNav";
import { Button } from "@/components/ui/button";

const ArtisanProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [artisan, setArtisan] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) fetchData();
  }, [userId]);

  const fetchData = async () => {
    const [artisanRes, profileRes, reviewsRes] = await Promise.all([
      supabase.from("artisan_profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("reviews").select("*").eq("artisan_id", userId).order("created_at", { ascending: false }),
    ]);

    setArtisan(artisanRes.data);
    setProfile(profileRes.data);

    const reviewsData = reviewsRes.data || [];
    if (reviewsData.length > 0) {
      const reviewerIds = [...new Set(reviewsData.map((r: any) => r.reviewer_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", reviewerIds);
      const nameMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p.full_name]));
      setReviews(reviewsData.map((r: any) => ({ ...r, reviewer_name: nameMap[r.reviewer_id] || "Customer" })));
    } else {
      setReviews([]);
    }

    if (artisanRes.data) {
      const { data: photos } = await supabase.from("portfolio_photos").select("*").eq("artisan_id", artisanRes.data.id);
      setPortfolio(photos || []);
    }
    setLoading(false);
  };

  if (loading) return <div className="min-h-screen bg-craft-grey flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!artisan) return <div className="min-h-screen bg-craft-grey flex items-center justify-center text-muted-foreground">Artisan not found</div>;

  return (
    <div className="min-h-screen bg-craft-grey">
      <GoyaNav />
      <main className="pt-24 sm:pt-28 pb-16 px-4 sm:px-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-surface rounded-lg border border-border p-5 sm:p-8 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.full_name} className="w-24 h-24 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <div className="w-24 h-24 rounded-lg bg-lavender-light flex items-center justify-center text-primary font-black text-3xl flex-shrink-0">
                {(profile?.full_name || "?")[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-black mb-1">{profile?.full_name}</h1>
              <p className="text-primary font-semibold mb-2">{artisan.service_category}</p>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-base text-primary">star</span>
                  {Number(artisan.rating_avg).toFixed(1)} ({artisan.total_reviews} reviews)
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-base">work</span>
                  {artisan.years_of_experience} years experience
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-base">location_on</span>
                  {profile?.location_address || "Location not set"}
                </span>
              </div>
              <p className="text-muted-foreground">{artisan.bio}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-6">
            {(artisan.skills || []).map((skill: string, i: number) => (
              <span key={skill} className="text-sm text-muted-foreground font-medium">
                {skill}{i < (artisan.skills || []).length - 1 ? " ·" : ""}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-3 mt-4 sm:mt-6">
            <Button onClick={() => navigate(`/booking/${userId}`)} className="bg-primary text-primary-foreground hover:bg-lavender-glow flex-1 sm:flex-none">
              <span className="material-symbols-outlined mr-2 text-base">calendar_month</span>
              Book Now
            </Button>
            <Button variant="outline" onClick={() => navigate(`/messages/${userId}`)} className="border-border hover:border-primary flex-1 sm:flex-none">
              <span className="material-symbols-outlined mr-2 text-base">chat</span>
              Message
            </Button>
          </div>
        </div>

        {/* Portfolio */}
        {portfolio.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Portfolio</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              {portfolio.map((photo) => (
                <div key={photo.id} className="rounded-md overflow-hidden border border-border aspect-square">
                  <img src={photo.image_url} alt={photo.caption || "Portfolio"} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Reviews ({reviews.length})</h2>
          {reviews.length === 0 ? (
            <p className="text-muted-foreground">No reviews yet.</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="bg-surface rounded-lg border border-border p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex text-primary">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className="material-symbols-outlined text-base" style={{ fontVariationSettings: i < review.rating ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">by {review.reviewer_name || "Customer"}</span>
                  </div>
                  <p className="text-foreground">{review.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ArtisanProfile;

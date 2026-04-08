import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/api/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import GoyaNav from "@/components/GoyaNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const SERVICE_CATEGORIES = [
  "All", "Plumber", "Electrician", "Tailor", "Carpenter", "Hair Stylist", "Painter", "Mechanic", "Other"
];

const RADIUS_OPTIONS = [
  { label: "2 km", value: 2 },
  { label: "5 km", value: 5 },
  { label: "10 km", value: 10 },
  { label: "25 km", value: 25 },
  { label: "50 km", value: 50 },
];

const shortenAddress = (address: string): string => {
  if (!address) return "Location not set";
  const parts = address.split(",").map(p => p.trim()).filter(Boolean);
  return parts.slice(0, 2).join(", ");
};

const Search = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [category, setCategory] = useState("All");
  const [artisans, setArtisans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [authReady, setAuthReady] = useState(false);

  // Around Me state
  const [aroundMe, setAroundMe] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [radius, setRadius] = useState(10);
  const [nearbyUserIds, setNearbyUserIds] = useState<string[] | null>(null);

  useEffect(() => {
    setAuthReady(true);
  }, [user]);

  useEffect(() => {
    if (authReady) {
      fetchArtisans();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, query, nearbyUserIds, authReady]);

  const handleAroundMe = () => {
    if (aroundMe) {
      // Toggle off
      setAroundMe(false);
      setNearbyUserIds(null);
      return;
    }
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported by your browser");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setUserLat(lat);
        setUserLng(lng);
        setAroundMe(true);
        setGeoLoading(false);
        fetchNearby(lat, lng, radius);
      },
      () => {
        setGeoLoading(false);
        toast.error("Location access denied. Please allow location access.");
      },
      { enableHighAccuracy: true }
    );
  };

  const fetchNearby = async (lat: number, lng: number, r: number) => {
    const { data, error } = await supabase.rpc("nearby_artisans", {
      _lat: lat,
      _lng: lng,
      _radius_km: r,
    });
    if (error) {
      toast.error("Failed to search nearby artisans");
      setNearbyUserIds([]);
      return;
    }
    const ids = (data || []).map((d: any) => d.user_id);
    setNearbyUserIds(ids);
  };

  const handleRadiusChange = (val: string) => {
    const r = Number(val);
    setRadius(r);
    if (aroundMe && userLat && userLng) {
      fetchNearby(userLat, userLng, r);
    }
  };

  const fetchArtisans = async () => {
    setLoading(true);
    try {
      // If around me is active but no nearby artisans found
      if (nearbyUserIds !== null && nearbyUserIds.length === 0) {
        setArtisans([]);
        setLoading(false);
        return;
      }

      let q = supabase
        .from("artisan_profiles")
        .select("*");

      if (nearbyUserIds !== null && nearbyUserIds.length > 0) {
        q = q.in("user_id", nearbyUserIds);
      }

      if (category !== "All") {
        q = q.eq("service_category", category);
      }
      if (query) {
        q = q.or(`service_category.ilike.%${query}%,skills.cs.{${query}}`);
      }

      const { data: artisanData, error } = await q.order("rating_avg", { ascending: false });

      if (error) {
        console.error("Error fetching artisans:", error);
        setArtisans([]);
        setLoading(false);
        return;
      }

      if (artisanData && artisanData.length > 0) {
        const userIds = artisanData.map((a) => a.user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, location_address")
          .in("user_id", userIds);

        const profileMap = new Map(
          (profilesData || []).map((p) => [p.user_id, p])
        );

        const merged = artisanData.map((a) => ({
          ...a,
          profiles: profileMap.get(a.user_id) || null,
        }));

        setArtisans(merged);
      } else {
        setArtisans([]);
      }
    } catch (err) {
      console.error("Unexpected error fetching artisans:", err);
      setArtisans([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-craft-grey">
      <GoyaNav />
      <main className="pt-24 sm:pt-28 pb-16 px-4 sm:px-6 max-w-6xl mx-auto">
        <h1 className="text-2xl sm:text-4xl font-black mb-4 sm:mb-8">Find Artisans</h1>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1">
            <Input
              placeholder="Search skills, services..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-12 text-lg focus-visible:ring-primary"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-48 h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SERVICE_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Around Me */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <Button
            variant={aroundMe ? "default" : "outline"}
            onClick={handleAroundMe}
            disabled={geoLoading}
            className={aroundMe ? "bg-primary text-primary-foreground" : "border-border hover:border-primary"}
          >
            <span className="material-symbols-outlined mr-2 text-base">my_location</span>
            {geoLoading ? "Locating..." : aroundMe ? "Around Me ✓" : "Around Me"}
          </Button>

          {aroundMe && (
            <Select value={String(radius)} onValueChange={handleRadiusChange}>
              <SelectTrigger className="w-28 h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RADIUS_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={String(r.value)}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-20 text-muted-foreground">Loading artisans...</div>
        ) : artisans.length === 0 ? (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-6xl text-muted-foreground mb-4">search_off</span>
            <p className="text-xl text-muted-foreground">
              {aroundMe ? "No artisans found nearby. Try increasing the radius." : "No artisans found. Try a different search."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {artisans.map((artisan) => (
              <button
                key={artisan.id}
                onClick={() => navigate(`/artisan/${artisan.user_id}`)}
                className="bg-surface rounded-lg border border-border p-6 text-left hover:border-primary hover:shadow-lg goya-transition"
              >
                <div className="flex items-center gap-4 mb-4">
                  {artisan.profiles?.avatar_url ? (
                    <img src={artisan.profiles.avatar_url} alt={artisan.profiles.full_name} className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-lavender-light flex items-center justify-center text-primary font-bold text-xl flex-shrink-0">
                      {(artisan.profiles?.full_name || "?")[0]?.toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-lg">{artisan.profiles?.full_name || "Artisan"}</h3>
                    <p className="text-sm text-muted-foreground">{artisan.service_category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <span className="material-symbols-outlined text-base text-primary">star</span>
                  {Number(artisan.rating_avg).toFixed(1)} ({artisan.total_reviews} reviews)
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <span className="material-symbols-outlined text-base">location_on</span>
                  {shortenAddress(artisan.profiles?.location_address)}
                </div>
                <div className="flex flex-wrap gap-1">
                  {(artisan.skills || []).slice(0, 3).map((skill: string, i: number) => (
                    <span key={skill} className="text-xs text-muted-foreground font-medium">
                      {skill}{i < Math.min((artisan.skills || []).length, 3) - 1 ? " ·" : ""}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Search;

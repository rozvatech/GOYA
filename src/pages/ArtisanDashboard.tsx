import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/api/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import GoyaNav from "@/components/GoyaNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const SERVICE_CATEGORIES = [
  "Plumber", "Electrician", "Tailor", "Carpenter", "Hair Stylist", "Painter", "Mechanic", "Other"
];

type TabType = "profile" | "portfolio" | "jobs";

const ArtisanDashboard = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [tab, setTab] = useState<TabType>("jobs");
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [artisanProfile, setArtisanProfile] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit states
  const [editBio, setEditBio] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editYears, setEditYears] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editAvailability, setEditAvailability] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authUser === null) return;
    const init = async () => {
      if (!authUser) { navigate("/auth?role=artisan"); return; }
      setUser(authUser);

      const [profileRes, artisanRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", authUser.id).single(),
        supabase.from("artisan_profiles").select("*").eq("user_id", authUser.id).single(),
      ]);

      if (!artisanRes.data) {
        navigate("/artisan-onboarding");
        return;
      }

      // Fetch jobs separately then attach customer names
      const { data: jobsData } = await supabase
        .from("jobs")
        .select("*")
        .eq("artisan_id", authUser.id)
        .order("created_at", { ascending: false });

      let enrichedJobs = jobsData || [];
      if (enrichedJobs.length > 0) {
        const customerIds = [...new Set(enrichedJobs.map((j) => j.customer_id))];
        const { data: customers } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", customerIds);
        const customerMap = new Map((customers || []).map((c) => [c.user_id, c.full_name]));
        enrichedJobs = enrichedJobs.map((j) => ({
          ...j,
          customer: { full_name: customerMap.get(j.customer_id) || "Customer" },
        }));
      }


      setProfile(profileRes.data);
      setArtisanProfile(artisanRes.data);
      setEditBio(artisanRes.data.bio || "");
      setEditCategory(artisanRes.data.service_category || "");
      setEditYears(String(artisanRes.data.years_of_experience || 0));
      setEditAddress(profileRes.data?.location_address || "");
      setEditAvailability(artisanRes.data.availability || "available");
      setJobs(enrichedJobs);

      // Fetch portfolio
      const { data: photos } = await supabase.from("portfolio_photos").select("*").eq("artisan_id", artisanRes.data.id);
      setPortfolio(photos || []);
      setLoading(false);
    };
    init();
  }, [navigate]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    await Promise.all([
      supabase.from("artisan_profiles").update({
        bio: editBio,
        service_category: editCategory,
        years_of_experience: parseInt(editYears) || 0,
        availability: editAvailability as any,
      }).eq("user_id", user.id),
      supabase.from("profiles").update({
        location_address: editAddress,
      }).eq("user_id", user.id),
    ]);
    setSaving(false);
    toast.success("Profile updated!");
  };

  const toggleAvailability = async () => {
    const newStatus = artisanProfile.availability === "available" ? "busy" : "available";
    await supabase.from("artisan_profiles").update({ availability: newStatus as any }).eq("user_id", user.id);
    setArtisanProfile({ ...artisanProfile, availability: newStatus });
    setEditAvailability(newStatus);
    toast.success(newStatus === "available" ? "You're now available!" : "Set to busy");
  };

  const handleJobAction = async (jobId: string, newStatus: string) => {
    await supabase.from("jobs").update({ status: newStatus as any }).eq("id", jobId);
    setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, status: newStatus } : j));
    toast.success(`Job ${newStatus}!`);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !artisanProfile) return;

    const filePath = `${user.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("portfolio").upload(filePath, file);
    if (uploadError) { toast.error("Upload failed"); return; }

    const { data: { publicUrl } } = supabase.storage.from("portfolio").getPublicUrl(filePath);

    const { data: photo, error } = await supabase.from("portfolio_photos").insert({
      artisan_id: artisanProfile.id,
      image_url: publicUrl,
    }).select().single();

    if (error) { toast.error("Failed to save photo"); return; }
    setPortfolio((prev) => [...prev, photo]);
    toast.success("Photo added!");
  };

  const deletePhoto = async (photoId: string) => {
    await supabase.from("portfolio_photos").delete().eq("id", photoId);
    setPortfolio((prev) => prev.filter((p) => p.id !== photoId));
    toast.success("Photo removed");
  };

  if (loading) return <div className="min-h-screen bg-craft-grey flex items-center justify-center text-muted-foreground">Loading dashboard...</div>;

  const statusDot: Record<string, string> = {
    pending: "bg-yellow-400",
    accepted: "bg-green-500",
    declined: "bg-red-500",
    in_progress: "bg-blue-500",
    completed: "bg-muted-foreground",
    cancelled: "bg-muted-foreground",
  };

  return (
    <div className="min-h-screen bg-craft-grey">
      <GoyaNav />
      <main className="pt-24 pb-16 px-4 sm:px-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black">Your Workshop</h1>
            <p className="text-muted-foreground text-sm">Manage your artisan profile and jobs</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              onClick={toggleAvailability}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-semibold goya-transition hover:border-primary"
            >
              <span className={`w-2 h-2 rounded-full ${artisanProfile?.availability === "available" ? "bg-green-500" : "bg-yellow-400"}`} />
              {artisanProfile?.availability === "available" ? "Available" : "Busy"}
            </button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/artisan/${user?.id}`)}>
              <span className="material-symbols-outlined text-base mr-1">visibility</span>
              <span className="hidden sm:inline">View Public Profile</span>
              <span className="sm:hidden">Profile</span>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {[
            { label: "Total Jobs", value: jobs.length, icon: "work" },
            { label: "Pending", value: jobs.filter((j) => j.status === "pending").length, icon: "pending" },
            { label: "Completed", value: jobs.filter((j) => j.status === "completed").length, icon: "check_circle" },
            { label: "Rating", value: `${Number(artisanProfile?.rating_avg || 0).toFixed(1)} ★`, icon: "star" },
          ].map((s) => (
            <div key={s.label} className="bg-surface rounded-lg border border-border p-3 sm:p-4 text-center">
              <span className="material-symbols-outlined text-2xl text-primary mb-1">{s.icon}</span>
              <p className="text-2xl font-black">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary rounded-lg p-1 mb-4 sm:mb-6">
          {([
            { key: "jobs", label: "Jobs", icon: "inbox" },
            { key: "portfolio", label: "Portfolio", icon: "photo_library" },
            { key: "profile", label: "Profile", icon: "person" },
          ] as { key: TabType; label: string; icon: string }[]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold goya-transition ${
                tab === t.key ? "bg-surface shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="material-symbols-outlined text-base">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Job Queue Tab */}
        {tab === "jobs" && (
          <div className="space-y-4">
            {jobs.length === 0 ? (
              <div className="text-center py-16 bg-surface rounded-lg border border-border">
                <span className="material-symbols-outlined text-5xl text-muted-foreground mb-3">inbox</span>
                <p className="text-lg font-semibold mb-1">No jobs yet</p>
                <p className="text-muted-foreground text-sm">When customers send you proposals, they'll appear here.</p>
              </div>
            ) : (
              jobs.map((job) => (
                <div key={job.id} className="bg-surface rounded-lg border border-border p-4 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-lg">{job.title}</h3>
                        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <span className={`w-1.5 h-1.5 rounded-full ${statusDot[job.status] || "bg-muted-foreground"}`} />
                          {job.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-sm mb-2">{job.description}</p>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-base">person</span>
                          {job.customer?.full_name || "Customer"}
                        </span>
                        {job.proposed_date && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-base">calendar_month</span>
                            {new Date(job.proposed_date).toLocaleDateString()}
                          </span>
                        )}
                        {job.proposed_price && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-base">payments</span>
                            GHS ${Number(job.proposed_price).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {job.status === "pending" && (
                    <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                      <Button onClick={() => handleJobAction(job.id, "accepted")} className="bg-primary text-primary-foreground hover:bg-lavender-glow" size="sm">
                        <span className="material-symbols-outlined text-base mr-1">check</span>
                        Accept
                      </Button>
                      <Button onClick={() => handleJobAction(job.id, "declined")} variant="outline" size="sm">
                        <span className="material-symbols-outlined text-base mr-1">close</span>
                        Decline
                      </Button>
                      <Button onClick={() => navigate(`/messages/${job.customer_id}`)} variant="outline" size="sm">
                        <span className="material-symbols-outlined text-base mr-1">chat</span>
                        Message
                      </Button>
                    </div>
                  )}
                  {job.status === "accepted" && (
                    <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                      <Button onClick={() => handleJobAction(job.id, "in_progress")} className="bg-primary text-primary-foreground hover:bg-lavender-glow" size="sm">
                        Start Job
                      </Button>
                      <Button onClick={() => navigate(`/messages/${job.customer_id}`)} variant="outline" size="sm">
                        <span className="material-symbols-outlined text-base mr-1">chat</span>
                        Message
                      </Button>
                    </div>
                  )}
                  {job.status === "in_progress" && (
                    <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                      <Button onClick={() => handleJobAction(job.id, "completed")} className="bg-primary text-primary-foreground hover:bg-lavender-glow" size="sm">
                        Mark Complete
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Portfolio Tab */}
        {tab === "portfolio" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Your Portfolio ({portfolio.length})</h2>
              <label className="cursor-pointer bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold hover:bg-lavender-glow goya-transition flex items-center gap-2">
                <span className="material-symbols-outlined text-base">add_photo_alternate</span>
                Upload Photo
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
            </div>

            {portfolio.length === 0 ? (
              <div className="text-center py-16 bg-surface rounded-lg border border-border">
                <span className="material-symbols-outlined text-5xl text-muted-foreground mb-3">photo_library</span>
                <p className="text-lg font-semibold mb-1">No portfolio photos yet</p>
                <p className="text-muted-foreground text-sm">Upload photos of your work to attract customers.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {portfolio.map((photo) => (
                  <div key={photo.id} className="relative group rounded-md overflow-hidden border border-border aspect-square">
                    <img src={photo.image_url} alt={photo.caption || "Portfolio"} className="w-full h-full object-cover" />
                    <button
                      onClick={() => deletePhoto(photo.id)}
                      className="absolute top-2 right-2 bg-destructive text-destructive-foreground w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 goya-transition"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Edit Profile Tab */}
        {tab === "profile" && (
          <div className="bg-surface rounded-lg border border-border p-8 max-w-xl">
            <h2 className="text-xl font-bold mb-6">Edit Your Profile</h2>
            <div className="space-y-4">
              <div>
                <Label>Service Category</Label>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SERVICE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Years of Experience</Label>
                <Input type="number" value={editYears} onChange={(e) => setEditYears(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Location</Label>
                <Input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} className="mt-1" placeholder="Your area / address" />
              </div>
              <div>
                <Label>Availability</Label>
                <Select value={editAvailability} onValueChange={setEditAvailability}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available for hire</SelectItem>
                    <SelectItem value="busy">In the workshop (Busy)</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Bio</Label>
                <Textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} className="mt-1 min-h-[120px]" />
              </div>
              <Button onClick={saveProfile} disabled={saving} className="w-full bg-primary text-primary-foreground hover:bg-lavender-glow">
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ArtisanDashboard;

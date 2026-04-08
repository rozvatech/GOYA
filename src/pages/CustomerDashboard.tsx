import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/api/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import GoyaNav from "@/components/GoyaNav";
import { Button } from "@/components/ui/button";

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authUser === null) return;
    const init = async () => {
      if (!authUser) { navigate("/auth"); return; }
      setUser(authUser);

      const { data: jobsData } = await supabase
        .from("jobs")
        .select("*")
        .eq("customer_id", authUser.id)
        .order("created_at", { ascending: false });

      if (jobsData && jobsData.length > 0) {
        const artisanIds = [...new Set(jobsData.map(j => j.artisan_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", artisanIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
        setJobs(jobsData.map(j => ({ ...j, artisan: { full_name: profileMap.get(j.artisan_id) || "Artisan" } })));
      } else {
        setJobs([]);
      }
      setLoading(false);
    };
    init();
  }, [navigate]);

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    accepted: "bg-green-100 text-green-800",
    declined: "bg-red-100 text-red-800",
    in_progress: "bg-blue-100 text-blue-800",
    completed: "bg-muted text-muted-foreground",
    cancelled: "bg-muted text-muted-foreground",
  };

  if (loading) return <div className="min-h-screen bg-craft-grey flex items-center justify-center text-muted-foreground">Loading...</div>;

  return (
    <div className="min-h-screen bg-craft-grey">
      <GoyaNav />
      <main className="pt-24 pb-16 px-4 sm:px-6 max-w-4xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-black mb-1">Your Bookings</h1>
        <p className="text-muted-foreground mb-6 sm:mb-8 text-sm sm:text-base">Track your job proposals and bookings</p>

        {jobs.length === 0 ? (
          <div className="text-center py-16 bg-surface rounded-2xl border border-border">
            <span className="material-symbols-outlined text-5xl text-muted-foreground mb-3">search</span>
            <p className="text-lg font-semibold mb-1">No bookings yet</p>
            <p className="text-muted-foreground text-sm mb-4">Find an artisan and send your first job proposal.</p>
            <Button onClick={() => navigate("/search")} className="bg-primary text-primary-foreground hover:bg-lavender-glow">
              Search Artisans
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div key={job.id} className="bg-surface rounded-xl border border-border p-4 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-lg">{job.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[job.status] || ""}`}>
                        {job.status}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-sm mb-2">{job.description}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">person</span>
                        {job.artisan?.full_name || "Artisan"}
                      </span>
                      {job.proposed_date && (
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-base">calendar_month</span>
                          {new Date(job.proposed_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                  <Button onClick={() => navigate(`/messages/${job.artisan_id}`)} variant="outline" size="sm">
                    <span className="material-symbols-outlined text-base mr-1">chat</span>
                    Message
                  </Button>
                  {job.status === "completed" && (
                    <Button onClick={() => navigate(`/review/${job.id}/${job.artisan_id}`)} className="bg-primary text-primary-foreground hover:bg-lavender-glow" size="sm">
                      <span className="material-symbols-outlined text-base mr-1">star</span>
                      Leave Review
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default CustomerDashboard;

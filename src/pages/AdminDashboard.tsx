import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/api/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import GoyaNav from "@/components/GoyaNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const COLORS = ["hsl(270,50%,60%)", "hsl(270,50%,75%)", "hsl(200,60%,55%)", "hsl(150,50%,50%)", "hsl(30,80%,55%)", "hsl(0,60%,55%)"];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingArtisans, setPendingArtisans] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allReviews, setAllReviews] = useState<any[]>([]);
  const [allJobs, setAllJobs] = useState<any[]>([]);
  const [stats, setStats] = useState({ users: 0, artisans: 0, jobs: 0, reviews: 0 });
  const [reviewFilter, setReviewFilter] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("all");
  const [addAdminOpen, setAddAdminOpen] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ full_name: "", email: "", password: "" });
  const [addingAdmin, setAddingAdmin] = useState(false);

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  const checkAdminAndLoad = async () => {
    if (!user) { navigate("/auth"); return; }

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const admin = roles?.some((r) => r.role === "admin");
    if (!admin) { toast.error("Access denied"); navigate("/"); return; }
    setIsAdmin(true);

    // Fetch all data in parallel
    const [artisansRes, profilesRes, jobsRes, reviewsRes, rolesRes] = await Promise.all([
      supabase.from("artisan_profiles").select("*").eq("verified", false),
      supabase.from("profiles").select("*"),
      supabase.from("jobs").select("*").order("created_at", { ascending: false }),
      supabase.from("reviews").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("*"),
    ]);

    const profiles = profilesRes.data || [];
    const allRoles = rolesRes.data || [];
    const jobs = jobsRes.data || [];
    const reviews = reviewsRes.data || [];

    // Build artisan pending list with names
    const profileMap = new Map(profiles.map(p => [p.user_id, p]));
    const pendingWithNames = (artisansRes.data || []).map(a => ({
      ...a,
      full_name: profileMap.get(a.user_id)?.full_name || "Unknown",
    }));

    // Build user list with roles
    const roleMap = new Map<string, string[]>();
    allRoles.forEach(r => {
      const existing = roleMap.get(r.user_id) || [];
      existing.push(r.role);
      roleMap.set(r.user_id, existing);
    });
    const usersWithRoles = profiles.map(p => ({
      ...p,
      roles: roleMap.get(p.user_id) || ["customer"],
    }));

    // Build reviews with names
    const reviewsWithNames = reviews.map(r => ({
      ...r,
      reviewer_name: profileMap.get(r.reviewer_id)?.full_name || "Unknown",
      artisan_name: profileMap.get(r.artisan_id)?.full_name || "Unknown",
    }));

    // Build jobs with names
    const jobsWithNames = jobs.map(j => ({
      ...j,
      customer_name: profileMap.get(j.customer_id)?.full_name || "Unknown",
      artisan_name: profileMap.get(j.artisan_id)?.full_name || "Unknown",
    }));

    setPendingArtisans(pendingWithNames);
    setAllUsers(usersWithRoles);
    setAllReviews(reviewsWithNames);
    setAllJobs(jobsWithNames);
    setStats({
      users: profiles.length,
      artisans: pendingWithNames.length,
      jobs: jobs.length,
      reviews: reviews.length,
    });
    setLoading(false);
  };

  const approveArtisan = async (id: string, userId: string) => {
    await supabase.from("artisan_profiles").update({ verified: true }).eq("id", id);
    await supabase.from("user_roles").insert({ user_id: userId, role: "artisan" as any });
    toast.success("Artisan approved!");
    setPendingArtisans(prev => prev.filter(a => a.id !== id));
  };

  const deleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user and all their data?")) return;
    // Delete related data first
    await Promise.all([
      supabase.from("messages").delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`),
      supabase.from("reviews").delete().eq("reviewer_id", userId),
      supabase.from("jobs").delete().or(`customer_id.eq.${userId},artisan_id.eq.${userId}`),
      supabase.from("portfolio_photos").delete().in("artisan_id",
        (await supabase.from("artisan_profiles").select("id").eq("user_id", userId)).data?.map(a => a.id) || []
      ),
    ]);
    await supabase.from("artisan_profiles").delete().eq("user_id", userId);
    await supabase.from("user_roles").delete().eq("user_id", userId);
    await supabase.from("profiles").delete().eq("user_id", userId);
    toast.success("User deleted");
    setAllUsers(prev => prev.filter(u => u.user_id !== userId));
  };

  const createAdmin = async () => {
    if (!newAdmin.full_name || !newAdmin.email || !newAdmin.password) {
      toast.error("All fields are required");
      return;
    }
    if (newAdmin.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setAddingAdmin(true);
    try {
      const res = await supabase.functions.invoke("create-admin", {
        body: { full_name: newAdmin.full_name, email: newAdmin.email, password: newAdmin.password },
      });
      if (res.error || res.data?.error) {
        toast.error(res.data?.error || res.error?.message || "Failed to create admin");
      } else {
        toast.success(`Admin ${newAdmin.email} created!`);
        setNewAdmin({ full_name: "", email: "", password: "" });
        setAddAdminOpen(false);
        checkAdminAndLoad();
      }
    } catch (err: any) {
      toast.error(err.message);
    }
    setAddingAdmin(false);
  };

  const deleteReview = async (id: string) => {
    if (!confirm("Delete this review?")) return;
    await supabase.from("reviews").delete().eq("id", id);
    toast.success("Review deleted");
    setAllReviews(prev => prev.filter(r => r.id !== id));
  };

  // Chart data
  const jobStatusData = useMemo(() => {
    const counts: Record<string, number> = {};
    allJobs.forEach(j => { counts[j.status || "pending"] = (counts[j.status || "pending"] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [allJobs]);

  const roleDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    allUsers.forEach(u => u.roles.forEach((r: string) => { counts[r] = (counts[r] || 0) + 1; }));
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [allUsers]);

  const jobsOverTime = useMemo(() => {
    const monthly: Record<string, number> = {};
    allJobs.forEach(j => {
      const month = new Date(j.created_at).toLocaleDateString("en", { month: "short", year: "2-digit" });
      monthly[month] = (monthly[month] || 0) + 1;
    });
    return Object.entries(monthly).map(([month, count]) => ({ month, count }));
  }, [allJobs]);

  const filteredReviews = useMemo(() => {
    if (!reviewFilter) return allReviews;
    const q = reviewFilter.toLowerCase();
    return allReviews.filter(r =>
      (r.comment || "").toLowerCase().includes(q) ||
      r.reviewer_name.toLowerCase().includes(q) ||
      r.artisan_name.toLowerCase().includes(q)
    );
  }, [allReviews, reviewFilter]);

  const filteredUsers = useMemo(() => {
    if (!userSearch) return allUsers;
    const q = userSearch.toLowerCase();
    return allUsers.filter(u =>
      (u.full_name || "").toLowerCase().includes(q) ||
      u.roles.some((r: string) => r.includes(q))
    );
  }, [allUsers, userSearch]);

  const filteredJobs = useMemo(() => {
    if (jobFilter === "all") return allJobs;
    return allJobs.filter(j => j.status === jobFilter);
  }, [allJobs, jobFilter]);

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
  if (!isAdmin) return null;

  const statCards = [
    { label: "Total Users", value: stats.users, icon: "group", color: "text-primary" },
    { label: "Pending Artisans", value: pendingArtisans.length, icon: "pending", color: "text-amber-500" },
    { label: "Total Jobs", value: stats.jobs, icon: "work", color: "text-blue-500" },
    { label: "Total Reviews", value: stats.reviews, icon: "reviews", color: "text-green-500" },
  ];

  return (
    <div className="min-h-screen bg-secondary/30">
      <GoyaNav />
      <main className="pt-24 sm:pt-28 pb-16 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-black text-foreground">Admin Dashboard</h1>
          <Dialog open={addAdminOpen} onOpenChange={setAddAdminOpen}>
            <DialogTrigger asChild>
              <Button><span className="material-symbols-outlined mr-2 text-sm">person_add</span>Add Admin</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Admin</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>Full Name</Label>
                  <Input value={newAdmin.full_name} onChange={e => setNewAdmin(p => ({ ...p, full_name: e.target.value }))} placeholder="First & Last name " />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={newAdmin.email} onChange={e => setNewAdmin(p => ({ ...p, email: e.target.value }))} placeholder="admin@example.com" />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input type="password" value={newAdmin.password} onChange={e => setNewAdmin(p => ({ ...p, password: e.target.value }))} placeholder="Min 6 characters" />
                </div>
                <Button className="w-full" onClick={createAdmin} disabled={addingAdmin}>
                  {addingAdmin ? "Creating..." : "Create Admin"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {statCards.map(s => (
            <Card key={s.label} className="border-border bg-card">
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{s.label}</p>
                <p className="text-3xl font-black text-foreground">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-card border border-border flex-wrap h-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="artisans">Artisans ({pendingArtisans.length})</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-border">
                <CardHeader><CardTitle className="text-base font-semibold">Job Status</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={jobStatusData} cx="50%" cy="45%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                        {jobStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value, name) => [value, name]} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader><CardTitle className="text-base font-semibold">User Roles</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={roleDistribution} cx="50%" cy="45%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                        {roleDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value, name) => [value, name]} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-border md:col-span-2">
                <CardHeader><CardTitle className="text-base font-semibold">Jobs Over Time</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={jobsOverTime} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="hsl(270,10%,90%)" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip cursor={{ fill: "hsl(270,10%,95%)" }} />
                      <Bar dataKey="count" fill="hsl(270,50%,60%)" radius={[4, 4, 0, 0]} maxBarSize={48} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ARTISANS TAB */}
          <TabsContent value="artisans">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Pending Artisan Approvals</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingArtisans.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center">No pending approvals 🎉</p>
                ) : (
                  <div className="overflow-x-auto"><Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Experience</TableHead>
                        <TableHead>Skills</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingArtisans.map(a => (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">{a.full_name}</TableCell>
                          <TableCell className="text-muted-foreground">{a.service_category || "N/A"}</TableCell>
                          <TableCell>{a.years_of_experience || 0} yrs</TableCell>
                          <TableCell className="max-w-[200px] truncate">{(a.skills || []).join(", ") || "—"}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button size="sm" onClick={() => approveArtisan(a.id, a.user_id)}>Approve</Button>
                            <Button size="sm" variant="destructive" onClick={() => deleteUser(a.user_id)}>Delete</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table></div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* USERS TAB */}
          <TabsContent value="users">
            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>All Users</CardTitle>
                <Input placeholder="Search users..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="max-w-xs" />
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto"><Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map(u => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                        <TableCell>{u.phone || "—"}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{u.location_address || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{u.roles.join(", ")}</TableCell>
                        <TableCell>{new Date(u.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          {!u.roles.includes("admin") && (
                            <Button size="sm" variant="destructive" onClick={() => deleteUser(u.user_id)}>Delete</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table></div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* REVIEWS TAB */}
          <TabsContent value="reviews">
            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Manage Reviews</CardTitle>
                <Input placeholder="Filter by name or keyword..." value={reviewFilter} onChange={e => setReviewFilter(e.target.value)} className="max-w-xs" />
              </CardHeader>
              <CardContent>
                {filteredReviews.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center">No reviews found.</p>
                ) : (
                  <div className="overflow-x-auto"><Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reviewer</TableHead>
                        <TableHead>Artisan</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Comment</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReviews.map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.reviewer_name}</TableCell>
                          <TableCell>{r.artisan_name}</TableCell>
                          <TableCell>
                            <span className="text-amber-500">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                          </TableCell>
                          <TableCell className="max-w-[250px] truncate">{r.comment || "—"}</TableCell>
                          <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="destructive" onClick={() => deleteReview(r.id)}>Delete</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table></div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* BOOKINGS TAB */}
          <TabsContent value="bookings">
            <Card className="border-border">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                <CardTitle>All Bookings</CardTitle>
                <div className="flex flex-wrap gap-1 sm:gap-2">
                  {["all", "pending", "accepted", "in_progress", "completed", "declined", "cancelled"].map(s => (
                    <Button key={s} size="sm" variant={jobFilter === s ? "default" : "outline"} onClick={() => setJobFilter(s)} className="capitalize text-xs">
                      {s.replace("_", " ")}
                    </Button>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                {filteredJobs.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center">No bookings found.</p>
                ) : (
                  <div className="overflow-x-auto"><Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Artisan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredJobs.map(j => (
                        <TableRow key={j.id}>
                          <TableCell className="font-medium">{j.title}</TableCell>
                          <TableCell>{j.customer_name}</TableCell>
                          <TableCell>{j.artisan_name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground capitalize">{(j.status || "pending").replace("_", " ")}</TableCell>
                          <TableCell>{j.proposed_date ? new Date(j.proposed_date).toLocaleDateString() : "—"}</TableCell>
                          <TableCell>{j.proposed_price ? `GHS ${j.proposed_price}` : "—"}</TableCell>
                          <TableCell>{new Date(j.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table></div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/api/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import GoyaNav from "@/components/GoyaNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const Booking = () => {
  const { artisanUserId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [artisanName, setArtisanName] = useState("");
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (user === null) return;
    if (!user) {
      toast.error("Please sign in to book an artisan");
      navigate("/auth");
    } else {
      setAuthChecked(true);
    }
  }, [user, navigate]);

  useEffect(() => {
    if (artisanUserId) {
      supabase.from("profiles").select("full_name").eq("user_id", artisanUserId).single()
        .then(({ data }) => setArtisanName(data?.full_name || "Artisan"));
    }
  }, [artisanUserId]);

  if (!authChecked) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to book");
      navigate("/auth");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("jobs").insert({
      customer_id: user.id,
      artisan_id: artisanUserId!,
      title,
      description,
      proposed_date: date ? new Date(date).toISOString() : null,
      proposed_price: price ? parseFloat(price) : null,
    });
    setLoading(false);

    if (error) {
      toast.error("Failed to send proposal");
    } else {
      toast.success("Job proposal sent!");
      navigate("/search");
    }
  };

  return (
    <div className="min-h-screen bg-craft-grey">
      <GoyaNav />
      <main className="pt-24 sm:pt-28 pb-16 px-4 sm:px-6 max-w-xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-black mb-2">Book {artisanName}</h1>
        <p className="text-muted-foreground mb-6 sm:mb-8 text-sm sm:text-base">Send a job proposal with your requirements.</p>

        <form onSubmit={handleSubmit} className="bg-surface rounded-lg border border-border p-5 sm:p-8 space-y-4 sm:space-y-5">
          <div>
            <Label htmlFor="title">Job Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Fix kitchen sink" className="mt-1" required />
          </div>
          <div>
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what you need..." className="mt-1 min-h-[100px] sm:min-h-[120px]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Preferred Date</Label>
              <Input id="date" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="price">Budget (optional)</Label>
              <Input id="price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00 GHS" className="mt-1" />
            </div>
          </div>
          <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-lavender-glow" disabled={loading}>
            {loading ? "Sending..." : "Send Proposal"}
          </Button>
        </form>
      </main>
    </div>
  );
};

export default Booking;

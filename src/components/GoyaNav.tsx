import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/api/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";


const GoyaNav = () => {
  const navigate = useNavigate();
  const { user, isArtisan } = useAuth();
  const [hasUnread, setHasUnread] = useState(false);

  const checkUnread = async (userId: string) => {
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("receiver_id", userId)
      .eq("read", false);
    setHasUnread((count ?? 0) > 0);
  };

  useEffect(() => {
    if (user) checkUnread(user.id);
    else setHasUnread(false);
  }, [user]);

  // Realtime listener for new messages
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("unread-badge")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        if ((payload.new as any).receiver_id === user.id) {
          setHasUnread(true);
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, () => {
        checkUnread(user.id);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4">
        <button onClick={() => navigate("/")} className="flex items-center gap-2">
          <span className="text-xl font-black tracking-tighter">GOYA</span>
        </button>

        <div className="hidden md:flex gap-6 font-medium text-sm uppercase tracking-widest">
          <button onClick={() => navigate("/search")} className="hover:text-primary goya-transition">Search</button>
          <button onClick={() => navigate("/about")} className="hover:text-primary goya-transition">About</button>
          {user && <button onClick={() => navigate("/reviews")} className="hover:text-primary goya-transition">Reviews</button>}
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {user ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(isArtisan ? "/artisan-dashboard" : "/customer-dashboard")}
                className="hidden sm:flex"
              >
                <span className="material-symbols-outlined text-xl mr-1">dashboard</span>
                <span className="text-xs">Dashboard</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(isArtisan ? "/artisan-dashboard" : "/customer-dashboard")}
                className="flex sm:hidden p-2"
              >
                <span className="material-symbols-outlined text-xl">dashboard</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/messages")} className="relative p-2">
                <span className="material-symbols-outlined text-xl">chat</span>
                {hasUnread && (
                  <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-destructive" />
                )}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-sm hidden sm:flex">
                Sign Out
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="flex sm:hidden p-2">
                <span className="material-symbols-outlined text-xl">logout</span>
              </Button>
            </>
          ) : (
            <Button onClick={() => navigate("/auth")} className="bg-foreground text-background hover:bg-primary rounded-full px-4 sm:px-5 text-sm font-bold">
              Sign In
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default GoyaNav;

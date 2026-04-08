import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import GoyaNav from "@/components/GoyaNav";

const Index = () => {
  const navigate = useNavigate();
  const { user, isArtisan } = useAuth();

  const handleArtisanClick = () => {
    if (user) {
      navigate(isArtisan ? "/artisan-dashboard" : "/artisan-onboarding");
    } else {
      navigate("/auth?role=artisan");
    }
  };

  const handleCustomerClick = () => {
    if (user) {
      navigate("/customer-dashboard");
    } else {
      navigate("/auth?role=customer");
    }
  };

  return (
    <div className="bg-craft-grey text-foreground overflow-hidden min-h-screen">
      <GoyaNav />

      <main className="flex flex-col md:flex-row min-h-screen w-full pt-16">
        {/* Artisan Side */}
        <section className="group relative flex-1 flex flex-col items-center justify-center p-8 sm:p-12 border-b md:border-b-0 md:border-r border-border hover:bg-lavender-light goya-transition min-h-[45vh] md:min-h-0">
          <span className="material-symbols-outlined text-5xl sm:text-6xl mb-4 sm:mb-6 text-primary">palette</span>
          <h1 className="text-3xl sm:text-5xl font-black mb-3 sm:mb-4 text-center">For Artisans</h1>
          <p className="max-w-md text-center text-base sm:text-lg text-muted-foreground mb-6 sm:mb-8">
            Turn your passion and skills into a business. Showcase your unique craft and reach people across Ghana.
          </p>
          <button
            onClick={handleArtisanClick}
            className="group/btn flex items-center gap-3 bg-foreground text-background px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold hover:scale-105 goya-transition text-sm sm:text-base"
          >
            Start Creating
            <span className="material-symbols-outlined group-hover/btn:translate-x-2 goya-transition">arrow_forward</span>
          </button>
          <div className="absolute bottom-6 left-6 opacity-10 hidden sm:block">
            <span className="material-symbols-outlined text-8xl">format_paint</span>
          </div>
        </section>

        {/* Customer Side */}
        <section className="group relative flex-1 flex flex-col items-center justify-center p-8 sm:p-12 hover:bg-surface goya-transition min-h-[45vh] md:min-h-0">
          <span className="material-symbols-outlined text-5xl sm:text-6xl mb-4 sm:mb-6 text-primary">shopping_bag</span>
          <h2 className="text-3xl sm:text-5xl font-black mb-3 sm:mb-4 text-center">For Customers</h2>
          <p className="max-w-md text-center text-base sm:text-lg text-muted-foreground mb-6 sm:mb-8">
            Discover services that makes living easy. Support independent artisans directly.
          </p>
          <button
            onClick={handleCustomerClick}
            className="group/btn flex items-center gap-3 border-2 border-foreground px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold hover:bg-foreground hover:text-background goya-transition text-sm sm:text-base"
          >
            Start Shopping
            <span className="material-symbols-outlined">local_mall</span>
          </button>
          <div className="absolute top-6 right-6 opacity-10 hidden sm:block">
            <span className="material-symbols-outlined text-8xl text-primary">verified</span>
          </div>
        </section>
      </main>

      {/* Search Overlay */}
      <div className="fixed bottom-1/2 translate-y-1/2 sm:bottom-12 sm:translate-y-0 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 sm:px-6 z-40">
        <div className="bg-surface/90 backdrop-blur-xl p-1.5 sm:p-2 rounded-2xl shadow-2xl border border-surface flex items-center gap-2 sm:gap-4">
          <span className="material-symbols-outlined ml-2 sm:ml-4 text-muted-foreground text-xl">search</span>
          <input
            type="text"
            placeholder="Search artisans nearby..."
            className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none py-3 sm:py-4 text-sm sm:text-lg min-w-0"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                navigate(`/search?q=${(e.target as HTMLInputElement).value}`);
              }
            }}
          />
          <button
            onClick={() => navigate("/search")}
            className="bg-primary text-primary-foreground px-4 sm:px-8 py-3 sm:py-4 rounded-xl font-bold shadow-lg shadow-lavender-glow/30 text-sm sm:text-base whitespace-nowrap"
          >
            Search
          </button>
        </div>
      </div>

      {/* Stats Bar — hidden on very small screens */}
      <div className="fixed bottom-4 left-4 sm:left-8 hidden sm:flex gap-6 sm:gap-8 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground z-30">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary" />
          5k+ Active Artisans
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-border" />
          10k+ Completed Services
        </div>
      </div>

      {/* Footer Links */}
      <div className="fixed bottom-4 right-4 sm:right-8 hidden sm:flex gap-6 z-30">
        <span className="material-symbols-outlined text-muted-foreground hover:text-foreground cursor-pointer goya-transition" onClick={() => navigate("/about")}>share</span>
    </div>
    </div>
  );
};

export default Index;

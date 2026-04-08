import { useNavigate } from "react-router-dom";
import GoyaNav from "@/components/GoyaNav";

const About = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-craft-grey">
      <GoyaNav />
      <main className="pt-24 sm:pt-28 pb-16 px-4 sm:px-6 max-w-4xl mx-auto">
        <h1 className="text-3xl sm:text-5xl font-black mb-4">About GOYA</h1>
        <p className="text-base sm:text-lg text-muted-foreground mb-12 leading-relaxed max-w-2xl">
          The hand that makes, the heart that finds. GOYA is a marketplace built with respect for craft,
          connecting customers to trusted artisans in their community.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border mb-12">
          <div className="bg-surface p-6 sm:p-8">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-6">For Artisans</p>
            <ul className="space-y-4">
              {["Create your professional profile", "Showcase your portfolio", "Receive and manage job proposals", "Build your reputation through reviews", "Chat directly with clients"].map(item => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-primary flex-shrink-0" />
                  <span className="text-sm text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-surface p-6 sm:p-8">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-6">For Customers</p>
            <ul className="space-y-4">
              {["Search artisans by location & skill", "View portfolios and ratings", "Send job proposals with details", "Book appointments", "Leave reviews after completion"].map(item => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-primary flex-shrink-0" />
                  <span className="text-sm text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <p className="text-sm text-muted-foreground">98% of jobs completed within 24 hours of the scheduled time.</p>
          <button
            onClick={() => navigate("/auth")}
            className="bg-foreground text-background px-8 py-3 rounded-lg font-bold goya-transition text-sm whitespace-nowrap"
          >
            Join GOYA Today
          </button>
        </div>
      </main>
    </div>
  );
};

export default About;

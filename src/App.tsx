import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import About from "./pages/About";
import Search from "./pages/Search";
import ArtisanProfile from "./pages/ArtisanProfile";
import ArtisanOnboarding from "./pages/ArtisanOnboarding";
import ArtisanDashboard from "./pages/ArtisanDashboard";
import CustomerDashboard from "./pages/CustomerDashboard";
import Booking from "./pages/Booking";
import Messages from "./pages/Messages";
import Reviews from "./pages/Reviews";
import LeaveReview from "./pages/LeaveReview";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/about" element={<About />} />
          <Route path="/search" element={<Search />} />
          <Route path="/artisan/:userId" element={<ArtisanProfile />} />
          <Route path="/artisan-onboarding" element={<ArtisanOnboarding />} />
          <Route path="/artisan-dashboard" element={<ArtisanDashboard />} />
          <Route path="/customer-dashboard" element={<CustomerDashboard />} />
          <Route path="/booking/:artisanUserId" element={<Booking />} />
          <Route path="/messages/:recipientId?" element={<Messages />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/review/:jobId/:artisanId" element={<LeaveReview />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/api/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const SERVICE_CATEGORIES = [
  "Plumber", "Electrician", "Tailor", "Carpenter", "Hair Stylist", "Painter", "Mechanic", "Other"
];

const COMMON_SKILLS: Record<string, string[]> = {
  Plumber: ["Pipe repair", "Drain cleaning", "Water heater", "Leak detection", "Bathroom fitting"],
  Electrician: ["Wiring", "Panel upgrade", "Lighting", "Generator install", "Fault finding"],
  Tailor: ["Alterations", "Custom suits", "Dress making", "Embroidery", "Pattern cutting"],
  Carpenter: ["Furniture making", "Cabinet install", "Door fitting", "Roofing", "Wood finishing"],
  "Hair Stylist": ["Haircuts", "Coloring", "Braiding", "Extensions", "Styling"],
  Painter: ["Interior painting", "Exterior painting", "Wallpaper", "Spray painting", "Decorating"],
  Mechanic: ["Engine repair", "Brake service", "Oil change", "Diagnostics", "Bodywork"],
  Other: [],
};

const ArtisanOnboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Basic info
  const [bio, setBio] = useState("");
  const [serviceCategory, setServiceCategory] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");

  // Step 2: Skills
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState("");

  // Step 3: Location
  const [locationAddress, setLocationAddress] = useState("");
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const addCustomSkill = () => {
    if (customSkill.trim() && !selectedSkills.includes(customSkill.trim())) {
      setSelectedSkills((prev) => [...prev, customSkill.trim()]);
      setCustomSkill("");
    }
  };

  const handlePinpoint = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLocationLat(lat);
        setLocationLng(lng);
        // Reverse geocode with Nominatim
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
          );
          const data = await res.json();
          if (data.display_name) {
            setLocationAddress(data.display_name);
          }
        } catch {
          toast.error("Could not get address, but coordinates saved");
        }
        setGeoLoading(false);
        toast.success("Location pinpointed!");
      },
      (err) => {
        setGeoLoading(false);
        toast.error("Location access denied. Please allow location access and try again.");
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSubmit = async () => {
    setLoading(true);
    if (!user) {
      toast.error("Please sign in first");
      navigate("/auth?role=artisan");
      return;
    }

    // Create artisan profile
    const { error: artisanError } = await supabase.from("artisan_profiles").insert({
      user_id: user.id,
      bio,
      service_category: serviceCategory,
      years_of_experience: parseInt(yearsOfExperience) || 0,
      skills: selectedSkills,
    });

    if (artisanError) {
      if (artisanError.code === "23505") {
        await supabase.from("artisan_profiles").update({
          bio,
          service_category: serviceCategory,
          years_of_experience: parseInt(yearsOfExperience) || 0,
          skills: selectedSkills,
        }).eq("user_id", user.id);
      } else {
        toast.error("Failed to create artisan profile");
        setLoading(false);
        return;
      }
    }

    // Update location in profiles table
    const locationUpdate: Record<string, any> = {};
    if (locationAddress) locationUpdate.location_address = locationAddress;
    if (locationLat !== null) locationUpdate.location_lat = locationLat;
    if (locationLng !== null) locationUpdate.location_lng = locationLng;

    if (Object.keys(locationUpdate).length > 0) {
      await supabase.from("profiles").update(locationUpdate).eq("user_id", user.id);
    }

    // Add artisan role
    await supabase.from("user_roles").upsert({
      user_id: user.id,
      role: "artisan" as any,
    }, { onConflict: "user_id,role" });

    setLoading(false);
    toast.success("Your artisan profile is ready!");
    navigate("/artisan-dashboard");
  };

  return (
    <div className="min-h-screen bg-craft-grey flex items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-lg px-0">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
         <span className="text-2xl font-black tracking-tighter">GOYA</span>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-6 sm:mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                step >= s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}>
                {step > s ? (
                  <span className="material-symbols-outlined text-base">check</span>
                ) : s}
              </div>
              {s < 3 && <div className={`w-10 sm:w-12 h-0.5 ${step > s ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        <div className="bg-surface rounded-lg border border-border p-5 sm:p-8 shadow-sm">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <>
              <h1 className="text-2xl font-bold mb-1">Tell us about your craft</h1>
              <p className="text-muted-foreground text-sm mb-6">What service do you offer?</p>

              <div className="space-y-4">
                <div>
                  <Label>Service Category</Label>
                  <Select value={serviceCategory} onValueChange={setServiceCategory}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select your main service" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Years of Experience</Label>
                  <Input
                    type="number"
                    min="0"
                    value={yearsOfExperience}
                    onChange={(e) => setYearsOfExperience(e.target.value)}
                    placeholder="e.g. 5"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Bio</Label>
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell customers about yourself, your experience, and what makes your work special..."
                    className="mt-1 min-h-[120px]"
                  />
                </div>
              </div>

              <Button
                onClick={() => setStep(2)}
                disabled={!serviceCategory}
                className="w-full mt-6 bg-primary text-primary-foreground hover:bg-lavender-glow"
              >
                Continue
                <span className="material-symbols-outlined ml-2 text-base">arrow_forward</span>
              </Button>
            </>
          )}

          {/* Step 2: Skills */}
          {step === 2 && (
            <>
              <h1 className="text-2xl font-bold mb-1">Your skills</h1>
              <p className="text-muted-foreground text-sm mb-6">Select the services you provide</p>

              {/* Suggested skills */}
              {COMMON_SKILLS[serviceCategory]?.length > 0 && (
                <div className="mb-4">
                  <Label className="mb-2 block text-sm">Suggested for {serviceCategory}</Label>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_SKILLS[serviceCategory].map((skill) => (
                      <button
                        key={skill}
                        onClick={() => toggleSkill(skill)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium border goya-transition ${
                          selectedSkills.includes(skill)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-secondary text-secondary-foreground border-border"
                        }`}
                      >
                        {selectedSkills.includes(skill) && (
                          <span className="material-symbols-outlined text-xs mr-1 align-middle">check</span>
                        )}
                        {skill}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom skill */}
              <div className="flex gap-2 mb-4">
                <Input
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  placeholder="Add a custom skill..."
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomSkill())}
                />
                <Button variant="outline" onClick={addCustomSkill} className="shrink-0">Add</Button>
              </div>

              {/* Selected skills */}
              {selectedSkills.length > 0 && (
                <div className="mb-4">
                  <Label className="mb-2 block text-sm">Your skills ({selectedSkills.length})</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedSkills.map((skill) => (
                      <span key={skill} className="flex items-center gap-1 text-sm text-foreground border border-border rounded-md px-2 py-1">
                        {skill}
                        <button onClick={() => toggleSkill(skill)} className="text-muted-foreground">
                          <span className="material-symbols-outlined text-xs">close</span>
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={selectedSkills.length === 0}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-lavender-glow"
                >
                  Continue
                  <span className="material-symbols-outlined ml-2 text-base">arrow_forward</span>
                </Button>
              </div>
            </>
          )}

          {/* Step 3: Location */}
          {step === 3 && (
            <>
              <h1 className="text-2xl font-bold mb-1">Your location</h1>
              <p className="text-muted-foreground text-sm mb-6">Where are you based? This helps customers find you.</p>

              <div className="space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePinpoint}
                  disabled={geoLoading}
                  className="w-full h-12 border-primary text-primary hover:bg-lavender-light"
                >
                  <span className="material-symbols-outlined mr-2 text-base">my_location</span>
                  {geoLoading ? "Getting location..." : locationLat ? "Location pinpointed ✓" : "Pinpoint My Location"}
                </Button>

                <div>
                  <Label>Address / Area</Label>
                  <Input
                    value={locationAddress}
                    onChange={(e) => setLocationAddress(e.target.value)}
                    placeholder="e.g. Lekki Phase 1, Lagos"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Auto-filled when you pinpoint, or type manually.</p>
                </div>

                {locationLat && locationLng && (
                  <div className="border border-border rounded-md p-3 text-xs text-foreground flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-base">check_circle</span>
                    GPS coordinates saved ({locationLat.toFixed(4)}, {locationLng.toFixed(4)})
                  </div>
                )}

                <div className="border border-border rounded-md p-4 text-sm text-muted-foreground">
                  <span className="material-symbols-outlined text-primary mr-2 align-middle">info</span>
                  You can update your location and add portfolio photos from your dashboard after setup.
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Back</Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !locationAddress}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-lavender-glow"
                >
                  {loading ? "Setting up..." : "Complete Setup"}
                  <span className="material-symbols-outlined ml-2 text-base">check_circle</span>
                </Button>
              </div>
            </>
          )}
        </div>

        <button onClick={() => navigate("/")} className="mt-6 block mx-auto text-sm text-muted-foreground hover:text-primary goya-transition">
          ← Back to home
        </button>
      </div>
    </div>
  );
};

export default ArtisanOnboarding;

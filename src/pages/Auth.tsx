import { useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/api/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

type AuthMode = "login" | "signup" | "reset";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get("role") || "customer";

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image must be under 2MB");
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const redirectAfterLogin = async (userId: string) => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const isAdmin = roles?.some((r) => r.role === "admin");
    if (isAdmin) { navigate("/admin"); return; }

    const { data: artisan } = await supabase
      .from("artisan_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (artisan) {
      navigate("/artisan-dashboard");
    } else {
      navigate("/customer-dashboard");
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Welcome back!");
      await redirectAfterLogin(data.user.id);
    }
  };

  const handleSignup = async () => {
    if (!avatarFile) {
      toast.error("Please upload a profile photo");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role: roleParam },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    // Upload avatar if user was created
    if (data.user) {
      const ext = avatarFile.name.split(".").pop();
      const filePath = `${data.user.id}/avatar.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(filePath, avatarFile, { upsert: true });

      if (!uploadErr) {
        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);
        await supabase
          .from("profiles")
          .update({ avatar_url: urlData.publicUrl })
          .eq("user_id", data.user.id);
      }
    }

    setLoading(false);
    if (data.session) {
      toast.success("Account created!");
      if (roleParam === "artisan") {
        navigate("/artisan-onboarding");
      } else {
        navigate("/customer-dashboard");
      }
    } else {
      toast.success("Check your email to confirm your account!");
    }
  };

  const handleReset = async () => {
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password reset link sent to your email!");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") handleLogin();
    else if (mode === "signup") handleSignup();
    else handleReset();
  };

  return (
    <div className="min-h-screen bg-craft-grey flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="text-2xl font-black tracking-tighter">GOYA</span>
        </div>

        <div className="bg-surface rounded-lg border border-border p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-center mb-2">
            {mode === "login" && "Welcome back"}
            {mode === "signup" && "Create your account"}
            {mode === "reset" && "Reset password"}
          </h1>
          <p className="text-muted-foreground text-center mb-6 text-sm">
            {mode === "signup" && `Signing up as ${roleParam === "artisan" ? "an Artisan" : "a Customer"}`}
            {mode === "login" && "Sign in to your GOYA account"}
            {mode === "reset" && "We'll send you a reset link"}
          </p>

          {/* Role toggle for signup */}
          {mode === "signup" && (
            <div className="flex gap-1 bg-secondary rounded-lg p-1 mb-6">
              <button
                onClick={() => navigate("/auth?role=customer", { replace: true })}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold goya-transition ${roleParam === "customer" ? "bg-surface shadow-sm text-foreground" : "text-muted-foreground"}`}
              >
                <span className="material-symbols-outlined text-base mr-1 align-middle">shopping_bag</span>
                Customer
              </button>
              <button
                onClick={() => navigate("/auth?role=artisan", { replace: true })}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold goya-transition ${roleParam === "artisan" ? "bg-surface shadow-sm text-foreground" : "text-muted-foreground"}`}
              >
                <span className="material-symbols-outlined text-base mr-1 align-middle">palette</span>
                Artisan
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative group"
                >
                  <Avatar className="h-20 w-20 border-2 border-dashed border-muted-foreground/40 group-hover:border-primary goya-transition">
                    {avatarPreview ? (
                      <AvatarImage src={avatarPreview} alt="Profile preview" />
                    ) : (
                      <AvatarFallback className="bg-secondary text-muted-foreground">
                        <span className="material-symbols-outlined text-2xl">add_a_photo</span>
                      </AvatarFallback>
                    )}
                  </Avatar>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <span className="text-xs text-muted-foreground">Profile photo *</span>
              </div>
            )}
            {mode === "signup" && (
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" className="mt-1 focus-visible:ring-primary" />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-1 focus-visible:ring-primary" required />
            </div>
            {mode !== "reset" && (
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="mt-1 focus-visible:ring-primary" required />
              </div>
            )}
            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-lavender-glow" disabled={loading}>
              {loading ? "Loading..." : mode === "login" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Reset Link"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground space-y-2">
            {mode === "login" && (
              <>
                <button onClick={() => setMode("reset")} className="block w-full hover:text-primary goya-transition">Forgot password?</button>
                <p>Don't have an account? <button onClick={() => setMode("signup")} className="text-primary font-semibold">Sign up</button></p>
              </>
            )}
            {mode === "signup" && (
              <p>Already have an account? <button onClick={() => setMode("login")} className="text-primary font-semibold">Sign in</button></p>
            )}
            {mode === "reset" && (
              <p>Remember your password? <button onClick={() => setMode("login")} className="text-primary font-semibold">Sign in</button></p>
            )}
          </div>
        </div>

        <button onClick={() => navigate("/")} className="mt-6 block mx-auto text-sm text-muted-foreground hover:text-primary goya-transition">
          ← Back to home
        </button>
      </div>
    </div>
  );
};

export default Auth;

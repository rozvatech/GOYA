import { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/api/supabase/client";

interface AuthContextType {
  user: User | null;
  isArtisan: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, isArtisan: false });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isArtisan, setIsArtisan] = useState(false);

  const checkArtisan = async (userId: string) => {
    const { data } = await supabase.from("artisan_profiles").select("id").eq("user_id", userId).maybeSingle();
    setIsArtisan(!!data);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) checkArtisan(session.user.id);
      else setIsArtisan(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ user, isArtisan }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

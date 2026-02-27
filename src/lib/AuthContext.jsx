import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const AuthContext = createContext(null);

// Role hierarchy: super_admin > admin > sales > customer > sub_account
const ROLE_HIERARCHY = ["sub_account", "customer", "sales", "admin", "super_admin"];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadRole = async (userId) => {
    try {
      const { data } = await supabase
        .from("gt_roles")
        .select("*, gt_organizations(*)")
        .eq("user_id", userId)
        .single();
      if (data) {
        setRole(data.role);
        setOrganization(data.gt_organizations || null);
        return data.role;
      }
    } catch (e) {
      console.log("Role lookup failed:", e);
    }
    setRole(null);
    setOrganization(null);
    return null;
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        await loadRole(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          await loadRole(session.user.id);
        } else {
          setUser(null);
          setRole(null);
          setOrganization(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    setOrganization(null);
  };

  const hasRole = (requiredRole) => {
    if (!role) return false;
    const userLevel = ROLE_HIERARCHY.indexOf(role);
    const requiredLevel = ROLE_HIERARCHY.indexOf(requiredRole);
    return userLevel >= requiredLevel;
  };

  const isAdmin = () => hasRole("admin");
  const isSales = () => hasRole("sales");

  return (
    <AuthContext.Provider value={{
      user, role, organization, loading,
      login, logout, hasRole, isAdmin, isSales,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

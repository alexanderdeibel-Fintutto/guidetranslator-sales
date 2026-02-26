import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { T, font, fontSans } from "../lib/tokens";

function LoadingScreen() {
  return (
    <div style={{
      minHeight: "100vh", background: T.navy,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 52, height: 52, borderRadius: "50%", margin: "0 auto 16px",
          background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: font, fontWeight: 700, fontSize: 18, color: T.navy,
          animation: "pulse 1.5s infinite",
        }}>GT</div>
        <div style={{ color: T.grayLight, fontSize: 14, fontFamily: fontSans }}>
          Authentifizierung wird geprüft...
        </div>
      </div>
    </div>
  );
}

function AccessDenied() {
  return (
    <div style={{
      minHeight: "100vh", background: T.navy,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: fontSans, color: T.whiteTrue,
    }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontFamily: font, fontSize: 24, color: T.red, marginBottom: 12 }}>
          Zugriff verweigert
        </h2>
        <p style={{ color: T.grayLight, fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          Sie haben keine Berechtigung, auf diesen Bereich zuzugreifen.
        </p>
        <a href="/" style={{
          display: "inline-block",
          background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`,
          color: T.navy, padding: "12px 24px", borderRadius: 10,
          fontSize: 14, fontWeight: 700, textDecoration: "none",
        }}>Zur Startseite</a>
      </div>
    </div>
  );
}

// Requires Supabase Auth login
export function AuthRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// Requires admin or super_admin role
export function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin()) return <AccessDenied />;
  return children;
}

// Requires sales, admin, or super_admin role
export function SalesRoute({ children }) {
  const { user, loading, isSales } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isSales()) return <AccessDenied />;
  return children;
}

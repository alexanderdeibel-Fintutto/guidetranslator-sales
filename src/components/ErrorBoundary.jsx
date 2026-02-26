import React from "react";
import { T, font, fontSans } from "../lib/tokens";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }
  render() {
    if (this.state.error) {
      const label = this.props.label || "Anwendung";
      return (
        <div style={{ minHeight: "100vh", background: T.navy, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: fontSans }}>
          <div style={{ maxWidth: 500, textAlign: "center", padding: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>&#9888;</div>
            <h2 style={{ fontFamily: font, fontSize: 24, color: T.red, marginBottom: 12 }}>Fehler in {label}</h2>
            <p style={{ color: T.grayLight, fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>{this.state.error.message}</p>
            <button onClick={() => { this.setState({ error: null }); window.location.reload(); }} style={{
              background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`,
              color: T.navy, border: "none", padding: "12px 24px", borderRadius: 10,
              fontSize: 14, fontWeight: 700, cursor: "pointer",
            }}>Seite neu laden</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

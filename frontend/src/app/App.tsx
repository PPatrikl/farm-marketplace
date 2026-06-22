import { useState } from "react";
import { LanguageProvider } from "./i18n/LanguageContext";
import { Navbar } from "./components/Navbar";
import { LandingPage } from "./components/LandingPage";
import { FarmerFeed } from "./components/FarmerFeed";
import { ForagerMarket } from "./components/ForagerMarket";
import { UserProfile } from "./components/UserProfile";
import { AuthModal } from "./components/AuthModal";

type Page = "landing" | "farmers" | "foragers" | "profile";

function AppInner() {
  {/* MARKER-MAKE-KIT-INVOKED */}
  const [page, setPage] = useState<Page>("landing");
  const [user, setUser] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("register");

  const handleNavigate = (target: string) => {
    if (["landing", "farmers", "foragers", "profile"].includes(target)) {
      setPage(target as Page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const openAuth = (tab: "login" | "register") => {
    setAuthTab(tab);
    setAuthOpen(true);
  };

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Navbar
        activePage={page}
        onNavigate={handleNavigate}
        user={user}
        onOpenAuth={openAuth}
        onLogout={() => setUser(null)}
      />
      <main>
        {page === "landing" && <LandingPage onNavigate={handleNavigate} onOpenAuth={openAuth} />}
        {page === "farmers" && <FarmerFeed />}
        {page === "foragers" && <ForagerMarket />}
        {page === "profile" && <UserProfile />}
      </main>
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={(name) => setUser(name || "Minna K.")}
        initialTab={authTab}
      />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppInner />
    </LanguageProvider>
  );
}

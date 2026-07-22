import { useState, useEffect } from "react";
import { LanguageProvider } from "./i18n/LanguageContext";
import { Navbar } from "./components/Navbar";
import { LandingPage } from "./components/LandingPage";
import { FarmerFeed } from "./components/FarmerFeed";
import { ForagerMarket } from "./components/ForagerMarket";
import { UserProfile } from "./components/UserProfile";
import { ListingDetail } from "./components/ListingDetail";
import { AuthModal } from "./components/AuthModal";
import type { Farm } from "./data/farms";
import {supabase} from "../supabaseClient";

type Page = "landing" | "farmers" | "foragers" | "profile" | "detail";

function AppInner() {
  {/* MARKER-MAKE-KIT-INVOKED */}
  const [page, setPage] = useState<Page>("landing");
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);

  const [user, setUser] = useState<string | null>(null);
      // Check for existing Supabase session on app load and listen for auth changes.
      // Without this, the user gets logged out on every page refresh because
      // useState resets to null. onAuthStateChange also handles login/logout
      // events automatically across the whole app
    useEffect(() => {
      // Check if user is already logged in on page load
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUser(session.user.user_metadata?.full_name || session.user.email || null);
        }
      });

      // Listen for auth changes (login, logout)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setUser(session.user.user_metadata?.full_name || session.user.email || null);
        } else {
          setUser(null);
        }
      });

      return () => subscription.unsubscribe();
    }, []);

  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("register");

  const handleNavigate = (target: string) => {
    // Protect profile page — redirect to login if not authenticated
    if (target === "profile" && !user) {
      openAuth("login");
      return;
    }
    if (["landing", "farmers", "foragers", "profile"].includes(target)) {
      setPage(target as Page);
      setSelectedFarm(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSelectFarm = (farm: Farm) => {
    setSelectedFarm(farm);
    setPage("detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBackFromDetail = () => {
    setPage("farmers");
    setSelectedFarm(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openAuth = (tab: "login" | "register") => {
    setAuthTab(tab);
    setAuthOpen(true);
  };

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Navbar
        activePage={page === "detail" ? "farmers" : page}
        onNavigate={handleNavigate}
        user={user}
        onOpenAuth={openAuth}
        // Handle logout by signing out from Supabase and clearing the user state
        onLogout={async () => {
        await supabase.auth.signOut();
        setUser(null);
        setPage("landing");
      }}
      />
      <main>
        {page === "landing" && <LandingPage onNavigate={handleNavigate} onOpenAuth={openAuth} />}
        {page === "farmers" && <FarmerFeed onSelectFarm={handleSelectFarm} />}
        {page === "foragers" && <ForagerMarket />}
        {page === "profile" && <UserProfile />}
        {page === "detail" && selectedFarm && (
          <ListingDetail farm={selectedFarm} onBack={handleBackFromDetail} />
        )}
      </main>
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}

        // Redirect to Oma tili after login
        onSuccess={(name) => {
        setUser(name || "");
        setPage("profile");
        }}
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

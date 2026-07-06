import { useEffect, useState } from "react";
import { LanguageProvider } from "./i18n/LanguageContext";
import { Navbar } from "./components/Navbar";
import { LandingPage } from "./components/LandingPage";
import { FarmerFeed } from "./components/FarmerFeed";
import { ForagerMarket } from "./components/ForagerMarket";
import { UserProfile } from "./components/UserProfile";
import { ListingDetail } from "./components/ListingDetail";
import { AuthModal } from "./components/AuthModal";
import type { Farm } from "./data/farms";
import type { UserProfile as UserProfileData } from "./types";

type Page = "landing" | "farmers" | "foragers" | "profile" | "detail";

const buildProfileStats = (email: string, createdAt?: string) => {
  return {
    rating: 0,
    reviews: 0,
    createdAt: createdAt || new Date().toISOString(),
  };
};

const normalizeUserProfile = (user: UserProfileData) => ({
  ...user,
  ...buildProfileStats(user.email, user.createdAt),
});

function AppInner() {
  {/* MARKER-MAKE-KIT-INVOKED */}
  const [page, setPage] = useState<Page>("landing");
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [user, setUser] = useState<UserProfileData | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("register");

  useEffect(() => {
    const storedUser = window.localStorage.getItem("farm-marketplace-user");

    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as UserProfileData;
        setUser(normalizeUserProfile(parsedUser));
      } catch {
        window.localStorage.removeItem("farm-marketplace-user");
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      window.localStorage.setItem("farm-marketplace-user", JSON.stringify(normalizeUserProfile(user)));
    } else {
      window.localStorage.removeItem("farm-marketplace-user");
    }
  }, [user]);

  const handleNavigate = (target: string) => {
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
        onLogout={() => setUser(null)}
      />
      <main>
        {page === "landing" && <LandingPage onNavigate={handleNavigate} onOpenAuth={openAuth} />}
        {page === "farmers" && <FarmerFeed onSelectFarm={handleSelectFarm} />}
        {page === "foragers" && <ForagerMarket />}
        {page === "profile" && <UserProfile currentUser={user} />}
        {page === "detail" && selectedFarm && (
          <ListingDetail farm={selectedFarm} onBack={handleBackFromDetail} />
        )}
      </main>
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={(profile) => setUser(profile)}
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

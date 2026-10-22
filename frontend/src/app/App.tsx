import { useState, useEffect, type ReactNode } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation as useRouterLocation } from "react-router";
import { LanguageProvider } from "./i18n/LanguageContext";
import { Navbar } from "./components/Navbar";
import { LandingPage } from "./components/LandingPage";
import { FarmerFeed } from "./components/FarmerFeed";
import { ForagerMarket } from "./components/ForagerMarket";
import { UserProfile } from "./components/UserProfile";
import { AuthModal } from "./components/AuthModal";
import { FarmDetailRoute } from "./routes/FarmDetailRoute";
import { NotFound } from "./routes/NotFound";
import type { Farm } from "./data/farms";
import { supabase } from "../supabaseClient";
import { LocationProvider } from "./location/LocationContext";

// Old page names (still used by Navbar, LandingPage etc.) → real URLs.
// Keeping the names means those components don't need to change.
const PATHS: Record<string, string> = {
  landing: "/",
  farmers: "/tilaluettelo",
  foragers: "/metsatori",
  profile: "/oma-tili",
};

/** Which navbar tab is active, worked out from the URL */
function activePageFromPath(pathname: string): string {
  if (pathname.startsWith("/tilaluettelo")) return "farmers";
  if (pathname.startsWith("/metsatori")) return "foragers";
  if (pathname.startsWith("/oma-tili")) return "profile";
  return "landing";
}

/** Scrolls to the top whenever the URL path changes (like a normal website). */
function ScrollToTop() {
  const { pathname } = useRouterLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
}

/** Shows the page only to logged-in users; others go to Etusivu + login window. */
function RequireAuth({ authReady, user, onNeedLogin, children }: {
  authReady: boolean;
  user: string | null;
  onNeedLogin: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (authReady && !user) onNeedLogin();
  }, [authReady, user]);

  if (!authReady) return null;                     // still checking — show nothing for a moment
  if (!user) return <Navigate to="/" replace />;   // replace: the blocked URL isn't kept in history
  return <>{children}</>;
}

function AppInner() {
  const navigate = useNavigate();
  const { pathname } = useRouterLocation();

  const [user, setUser] = useState<string | null>(null);
  // false until Supabase has told us whether someone is logged in.
  // Without this, refreshing /oma-tili would kick a logged-in user out.
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    // Check if user is already logged in on page load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user.user_metadata?.full_name || session.user.email || null);
      }
      setAuthReady(true);
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

  const openAuth = (tab: "login" | "register") => {
    setAuthTab(tab);
    setAuthOpen(true);
  };

  const handleNavigate = (target: string) => {
    // Protect profile page — ask to log in first
    if (target === "profile" && !user) {
      openAuth("login");
      return;
    }
    const path = PATHS[target];
    if (path) navigate(path);
  };

  // The detail page loads the listing itself from the id in the URL,
  // so here we only need the id.
  const handleSelectFarm = (farm: Farm) => {
    navigate(`/tilaluettelo/${farm.id}`);
  };

  const handleSelectForestListing = (id: string) => {
    navigate(`/metsatori/${id}`);
  };

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Inter', sans-serif" }}>
      <ScrollToTop />
      <Navbar
        activePage={activePageFromPath(pathname)}
        onNavigate={handleNavigate}
        user={user}
        onOpenAuth={openAuth}
        onLogout={async () => {
          // Leave the page first, so a protected page (Oma tili) doesn't
          // react to the logout by opening the login window.
          navigate("/");
          await supabase.auth.signOut();
          setUser(null);
        }}
      />
      <main>
        <Routes>
          <Route
            path="/"
            element={
              <LandingPage
                onNavigate={handleNavigate}
                onOpenAuth={openAuth}
                onSelectFarmListing={handleSelectFarm}
                onSelectForestListing={handleSelectForestListing}
                isLoggedIn={!!user}
              />
            }
          />
          <Route path="/tilaluettelo" element={<FarmerFeed onSelectFarm={handleSelectFarm} />} />
          <Route path="/tilaluettelo/:id" element={<FarmDetailRoute />} />
          {/* ":id?" = optional: /metsatori shows the grid, /metsatori/123 the detail page */}
          <Route path="/metsatori/:id?" element={<ForagerMarket />} />
          <Route
            path="/oma-tili"
            element={
              <RequireAuth authReady={authReady} user={user} onNeedLogin={() => openAuth("login")}>
                <UserProfile />
              </RequireAuth>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        // Redirect to Oma tili after login
        onSuccess={(name) => {
          setUser(name || "");
          navigate("/oma-tili");
        }}
        initialTab={authTab}
      />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <LocationProvider>
        <AppInner />
      </LocationProvider>
    </LanguageProvider>
  );
}
import { Leaf, Menu, X, Bell, User, LogOut, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useLang } from "../i18n/LanguageContext";
import type { Lang } from "../i18n/translations";
import { formatShortDate } from "../../utils/dates";

interface NavbarProps {
  activePage: string;
  onNavigate: (page: string, section?: string) => void;
  user: string | null;
  userId: string | null;
  onOpenAuth: (tab: "login" | "register") => void;
  onLogout: () => void;
}

export function Navbar({ activePage, onNavigate, user, userId, onOpenAuth, onLogout }: NavbarProps) {
  const { lang, setLang, tr } = useLang();
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    listing_title: string;
    status: string;
    rejection_reason: string | null;
    kind: "application" | "application_status" | "booking" | "booking_status";
    booking_date?: string;
    unread: boolean;
  }>>([]);
  const langRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((notification) => notification.unread).length;

  const navLinks = [
    { id: "landing", label: tr("nav_home") },
    { id: "farmers", label: tr("nav_farms") },
    { id: "foragers", label: tr("nav_market") },
    { id: "profile", label: tr("nav_account") },
  ];

  const languages: { code: Lang; label: string; native: string }[] = [
    { code: "fi", label: "Finnish", native: "Suomi" },
    { code: "en", label: "English", native: "English" },
  ];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setNotificationsOpen(false);
      return;
    }

    let cancelled = false;
    const loadNotifications = async () => {
      try {
        const apiBase = import.meta.env.VITE_API_URL || "";
        const response = await fetch(`${apiBase}/api/applications/notifications?user_id=${encodeURIComponent(userId)}`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`Failed to load notifications: ${response.status}`);
        const payload = await response.json();
        if (!cancelled && !notificationsOpen) {
          setNotifications(Array.isArray(payload.notifications) ? payload.notifications : []);
        }
      } catch (error) {
        console.error("Failed to load notifications:", error);
      }
    };

    loadNotifications();
    const interval = window.setInterval(loadNotifications, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [userId, notificationsOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
        setNotifications([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function openNotifications() {
    const opening = !notificationsOpen;
    setNotificationsOpen(opening);
    if (!opening) {
      setNotifications([]);
      return;
    }
    if (!userId) return;

    const unread = notifications.filter((notification) => notification.unread);
    if (unread.length === 0) return;

    const apiBase = import.meta.env.VITE_API_URL || "";
    try {
      const results = await Promise.all(unread.map(async (notification) => {
        const isBooking = notification.kind === "booking" || notification.kind === "booking_status";
        const response = await fetch(`${apiBase}/api/${isBooking ? "bookings" : "applications"}/notifications/read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            [isBooking ? "booking_id" : "application_id"]: notification.id,
            user_id: userId,
          }),
        });
        if (!response.ok) throw new Error(`Failed to mark notification as read: ${response.status}`);
        return notification.id;
      }));
      setNotifications((current) => current.map((notification) =>
        results.includes(notification.id) ? { ...notification, unread: false } : notification
      ));
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
    }
  }

  return (
    <header
      style={{ fontFamily: "'Inter', sans-serif" }}
      className="sticky top-0 z-50 bg-card/95 border-b border-border backdrop-blur-md"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <button
            onClick={() => onNavigate("landing")}
            className="flex items-center gap-2.5 group flex-shrink-0"
          >
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center group-hover:bg-primary/90 transition-colors">
              <Leaf className="w-4 h-4 text-primary-foreground" strokeWidth={2} />
            </div>
            <span
              style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: "1.1rem" }}
              className="text-foreground tracking-tight"
            >
              Metsä<span className="text-primary">torvi</span>
            </span>
          </button>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => onNavigate(link.id)}
                className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                  activePage === link.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Right actions */}
          <div className="hidden md:flex items-center gap-2 flex-shrink-0">
            {/* Language selector */}
            <div ref={langRef} className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border hover:bg-secondary transition-colors text-sm"
                aria-label="Select language"
              >
                <span className={`font-semibold transition-colors ${lang === "fi" ? "text-primary" : "text-muted-foreground"}`}>
                  FI
                </span>
                <span className="text-border/80 font-light select-none">|</span>
                <span className={`font-semibold transition-colors ${lang === "en" ? "text-primary" : "text-muted-foreground"}`}>
                  EN
                </span>
              </button>

              {langOpen && (
                <div className="absolute right-0 top-full mt-1.5 bg-card border border-border rounded-xl shadow-lg z-50 py-1 min-w-[140px]">
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => { setLang(l.code); setLangOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 flex items-center gap-2.5 hover:bg-secondary transition-colors text-sm ${
                        lang === l.code ? "text-primary font-medium" : "text-foreground"
                      }`}
                    >
                      <span className="text-base">{l.code === "fi" ? "🇫🇮" : "🇬🇧"}</span>
                      <span>{l.native}</span>
                      {lang === l.code && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {user ? (
              <>
                <div ref={notificationRef} className="relative">
                  <button
                    onClick={openNotifications}
                    aria-label={lang === "fi" ? "Ilmoitukset" : "Notifications"}
                    aria-expanded={notificationsOpen}
                    className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />}
                  </button>
                  {notificationsOpen && (
                    <div className="absolute right-0 top-full mt-2 w-80 max-w-[90vw] rounded-xl border border-border bg-card shadow-xl z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-border font-medium text-sm text-foreground">
                        {lang === "fi" ? "Ilmoitukset" : "Notifications"}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="px-4 py-5 text-sm text-muted-foreground">
                            {lang === "fi" ? "Ei ilmoituksia." : "No notifications."}
                          </p>
                        ) : notifications.map((notification) => (
                          <button
                            key={notification.id}
                            onClick={() => {
                              setNotificationsOpen(false);
                              setNotifications([]);
                              onNavigate(
                                "profile",
                                notification.kind === "application" || notification.kind === "booking"
                                  ? "open-applications"
                                  : "accepted-results"
                              );
                            }}
                            className="w-full text-left px-4 py-3 border-b border-border/70 hover:bg-secondary/60 transition-colors"
                          >
                            <span className="block text-sm font-medium text-foreground">
                              {notification.kind === "application"
                                ? (lang === "fi" ? "Uusi hakemus" : "New application")
                                : notification.kind === "booking"
                                  ? (lang === "fi" ? "Uusi itsepoimintavaraus" : "New picking request")
                                  : notification.kind === "booking_status"
                                    ? notification.status === "confirmed"
                                      ? (lang === "fi" ? "Itsepoimintavarauksesi hyväksyttiin" : "Your picking request was confirmed")
                                      : (lang === "fi" ? "Itsepoimintavarauksesi hylättiin" : "Your picking request was declined")
                                    : notification.status === "accepted"
                                      ? (lang === "fi" ? "Hakemuksesi hyväksyttiin" : "Your application was accepted")
                                      : (lang === "fi" ? "Hakemuksesi hylättiin" : "Your application was declined")}
                            </span>
                            <span className="mt-1 block text-xs text-muted-foreground">{notification.listing_title}</span>
                            {notification.booking_date && formatShortDate(notification.booking_date, true) && (
                              <span className="mt-1 block text-xs text-muted-foreground">
                                {formatShortDate(notification.booking_date, true)}
                              </span>
                            )}
                            {notification.status === "rejected" && notification.rejection_reason && (
                              <span className="mt-1 block text-xs text-muted-foreground line-clamp-2">{notification.rejection_reason}</span>
                            )}
                            {notification.unread && <span className="sr-only">{lang === "fi" ? "Lukematon" : "Unread"}</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => onNavigate("profile")}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/70 transition-colors text-sm font-medium"
                >
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground text-[9px] font-bold">
                      {user.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <span>{user}</span>
                </button>
                <button
                  onClick={onLogout}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  title={tr("nav_logout")}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onOpenAuth("login")}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  {tr("nav_login")}
                </button>
                <button
                  onClick={() => onOpenAuth("register")}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/85 transition-colors"
                >
                  {tr("nav_register")}
                </button>
              </>
            )}
          </div>

          {/* Mobile: lang + hamburger */}
          <div className="md:hidden flex items-center gap-2">
            {/* Compact lang toggle */}
            <button
              onClick={() => setLang(lang === "fi" ? "en" : "fi")}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-xs font-semibold"
            >
              <span className={lang === "fi" ? "text-primary" : "text-muted-foreground"}>FI</span>
              <span className="text-border/80">|</span>
              <span className={lang === "en" ? "text-primary" : "text-muted-foreground"}>EN</span>
            </button>
            <button
              className="p-2 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-border bg-card px-4 py-3 flex flex-col gap-1">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => { onNavigate(link.id); setMenuOpen(false); }}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activePage === link.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {link.label}
            </button>
          ))}
          <div className="pt-2 mt-1 border-t border-border flex gap-2">
            {user ? (
              <button
                onClick={() => { onLogout(); setMenuOpen(false); }}
                className="flex-1 py-2.5 text-sm font-medium text-center rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors"
              >
                {tr("nav_logout")}
              </button>
            ) : (
              <>
                <button
                  onClick={() => { onOpenAuth("login"); setMenuOpen(false); }}
                  className="flex-1 py-2.5 text-sm font-medium text-center rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors"
                >
                  {tr("nav_login")}
                </button>
                <button
                  onClick={() => { onOpenAuth("register"); setMenuOpen(false); }}
                  className="flex-1 py-2.5 text-sm font-medium text-center rounded-lg bg-accent text-accent-foreground hover:bg-accent/85 transition-colors"
                >
                  {tr("nav_register")}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

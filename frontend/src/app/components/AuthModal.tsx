import { useState, useEffect, useRef } from "react";
import { X, Eye, EyeOff, Leaf, CheckCircle, Trees, Sprout } from "lucide-react";
import { useLang } from "../i18n/LanguageContext";
import type { UserProfile } from "../types";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (profile: UserProfile) => void;
  initialTab?: "login" | "register";
}

const buildProfileStats = (email: string) => {
  return {
    rating: 0,
    reviews: 0,
  };
};

export function AuthModal({ open, onClose, onSuccess, initialTab = "register" }: AuthModalProps) {
  const { tr } = useLang();
  const [tab, setTab] = useState<"login" | "register">(initialTab);
  const [showPass, setShowPass] = useState(false);
  const [role, setRole] = useState<"picker" | "farmer">("picker");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Partial<typeof form>>({});

  useEffect(() => {
    setTab(initialTab);
    setSuccess(false);
    setErrors({});
    setForm({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
  }, [open, initialTab]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const validate = () => {
    const e: Partial<typeof form> = {};
    if (!form.email.includes("@")) e.email = "Virheellinen sähköpostiosoite";
    if (form.password.length < 6) e.password = "Vähintään 6 merkkiä";
    if (tab === "register") {
      if (!form.name.trim()) e.name = "Nimi vaaditaan";
      if (form.confirmPassword !== form.password) e.confirmPassword = "Salasanat eivät täsmää";
    }
    return e;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const profileStats = buildProfileStats(form.email);
      const profile: UserProfile = {
        name: form.name.trim() || form.email.split("@")[0] || "Käyttäjä",
        email: form.email.trim(),
        role,
        createdAt: new Date().toISOString(),
        ...profileStats,
      };

      if (tab === "register") {
        setSuccess(true);
      } else {
        onSuccess(profile);
        onClose();
      }
    }, 1200);
  };

  const inputClass = (field: keyof typeof form) =>
    `w-full px-4 py-2.5 bg-input-background rounded-xl border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/30 transition-all ${
      errors[field] ? "border-accent/60 focus:ring-accent/20" : "border-border focus:border-primary/40"
    }`;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(28,28,26,0.55)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="relative w-full max-w-md bg-card rounded-3xl border border-border shadow-2xl overflow-hidden"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {success ? (
          /* Success state */
          <div className="p-8 flex flex-col items-center text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: "linear-gradient(135deg, #2A5012, #4A7C2F)" }}
            >
              <Leaf className="w-8 h-8 text-white" />
            </div>
            <h2
              style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: "1.5rem" }}
              className="text-foreground mb-2"
            >
              {tr("auth_success_title")}
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              {tr("auth_success_sub")}
            </p>
            <div className="w-full space-y-2 mb-6 text-left">
              {[tr("auth_verified_phone_done"), tr("auth_role_picker"), tr("auth_notifications_enabled")].map((item) => (
                <div key={item} className="flex items-center gap-2.5 text-sm text-foreground">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                onSuccess({
                  name: form.name.trim() || form.email.split("@")[0] || "Käyttäjä",
                  email: form.email.trim(),
                  role,
                  createdAt: new Date().toISOString(),
                  ...buildProfileStats(form.email),
                });
                onClose();
              }}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors"
            >
              {tr("auth_btn_continue")}
            </button>
          </div>
        ) : (
          <>
            {/* Header strip */}
            <div
              className="px-8 pt-8 pb-6"
              style={{ background: "linear-gradient(160deg, #F5F3EE 0%, #EEF4E9 100%)" }}
            >
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <Leaf className="w-4 h-4 text-white" />
                </div>
                <span
                  style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: "1.05rem" }}
                  className="text-foreground"
                >
                  Metsä<span className="text-primary">torvi</span>
                </span>
              </div>

              <h2
                style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: "1.4rem", lineHeight: 1.2 }}
                className="text-foreground mb-1"
              >
                {tab === "login" ? tr("auth_login_title") : tr("auth_register_title")}
              </h2>
              <p className="text-muted-foreground text-sm">
                {tab === "login" ? tr("auth_login_sub") : tr("auth_register_sub")}
              </p>

              {/* Tab switcher */}
              <div className="flex gap-1 mt-5 bg-secondary rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => { setTab("login"); setErrors({}); }}
                  className={`flex-1 py-2 rounded-lg text-sm transition-all font-medium ${
                    tab === "login"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tr("auth_tab_login")}
                </button>
                <button
                  type="button"
                  onClick={() => { setTab("register"); setErrors({}); }}
                  className={`flex-1 py-2 rounded-lg text-sm transition-all font-medium ${
                    tab === "register"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tr("auth_tab_register")}
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-8 pb-8 pt-5 space-y-4">
              {tab === "register" && (
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5 uppercase tracking-wide">
                    {tr("auth_label_name")}
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder={tr("auth_placeholder_name")}
                    className={inputClass("name")}
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  />
                  {errors.name && <p className="text-accent text-xs mt-1">{errors.name}</p>}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5 uppercase tracking-wide">
                  {tr("auth_label_email")}
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder={tr("auth_placeholder_email")}
                  className={inputClass("email")}
                  style={{ fontFamily: "'Inter', sans-serif" }}
                  required
                />
                {errors.email && <p className="text-accent text-xs mt-1">{errors.email}</p>}
              </div>

              {tab === "register" && (
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5 uppercase tracking-wide">
                    {tr("auth_label_phone")}
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder={tr("auth_placeholder_phone")}
                    className={inputClass("phone")}
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5 uppercase tracking-wide">
                  {tr("auth_label_password")}
                </label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={tr("auth_placeholder_password")}
                    className={inputClass("password")}
                    style={{ fontFamily: "'Inter', sans-serif" }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-accent text-xs mt-1">{errors.password}</p>}
              </div>

              {tab === "register" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5 uppercase tracking-wide">
                      {tr("auth_label_confirm_password")}
                    </label>
                    <input
                      type="password"
                      value={form.confirmPassword}
                      onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                      placeholder={tr("auth_placeholder_password")}
                      className={inputClass("confirmPassword")}
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    />
                    {errors.confirmPassword && <p className="text-accent text-xs mt-1">{errors.confirmPassword}</p>}
                  </div>

                  {/* Role picker */}
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5 uppercase tracking-wide">
                      {tr("auth_label_role")}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["picker", "farmer"] as const).map((r) => {
                        const Icon = r === "picker" ? Trees : Sprout;
                        const label = r === "picker" ? tr("auth_role_picker") : tr("auth_role_farmer");
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setRole(r)}
                            className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm transition-all ${
                              role === r
                                ? "border-primary bg-primary/5 text-primary"
                                : "border-border bg-input-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
                            }`}
                          >
                            <Icon className="w-4 h-4 flex-shrink-0" />
                            <span className="text-left leading-tight">{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {tab === "login" && (
                <div className="flex justify-end">
                  <button type="button" className="text-xs text-primary hover:underline">
                    {tr("auth_forgot")}
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-1"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" strokeLinecap="round" />
                    </svg>
                    {tab === "login" ? tr("auth_btn_login") : tr("auth_btn_register")}…
                  </span>
                ) : tab === "login" ? tr("auth_btn_login") : tr("auth_btn_register")}
              </button>

              {tab === "register" && (
                <p className="text-center text-xs text-muted-foreground leading-relaxed">
                  {tr("auth_terms")}{" "}
                  <button type="button" className="text-primary hover:underline">{tr("auth_terms_link")}</button>
                  {" "}{tr("auth_and")}{" "}
                  <button type="button" className="text-primary hover:underline">{tr("auth_privacy")}</button>.
                </p>
              )}

              <p className="text-center text-sm text-muted-foreground">
                {tab === "login" ? tr("auth_no_account") : tr("auth_has_account")}{" "}
                <button
                  type="button"
                  onClick={() => { setTab(tab === "login" ? "register" : "login"); setErrors({}); }}
                  className="text-accent font-medium hover:underline"
                >
                  {tab === "login" ? tr("auth_switch_register") : tr("auth_switch_login")}
                </button>
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

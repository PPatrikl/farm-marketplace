import { useState, useEffect, useRef } from "react";
import { X, Send, CheckCircle, AlertCircle, Loader2, User, Mail, MessageSquare, Leaf } from "lucide-react";
import { useLang } from "../i18n/LanguageContext";
import { sendContactMessage } from "../../services/contacts";
import { supabase } from "../../supabaseClient";

interface ContactFormModalProps {
  open: boolean;
  onClose: () => void;
  recipientName?: string;
  listingTitle?: string;
  listingId?: string;    
  listingType?: "forest" | "farm"; 
  sellerId?: string;       
  onSuccess?: () => void;  
}

interface FormState {
  name: string;
  email: string;
  message: string;
  website: string; // honeypot
}

interface FieldError {
  name?: string;
  email?: string;
  message?: string;
}

function validate(form: FormState, lang: "fi" | "en"): FieldError {
  const errors: FieldError = {};
  if (!form.name.trim()) {
    errors.name = lang === "fi" ? "Nimi on pakollinen" : "Name is required";
  }
  if (!form.email.trim()) {
    errors.email = lang === "fi" ? "Sähköposti on pakollinen" : "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = lang === "fi" ? "Tarkista sähköpostiosoite" : "Check your email address";
  }
  if (!form.message.trim()) {
    errors.message = lang === "fi" ? "Viesti on pakollinen" : "Message is required";
  } else if (form.message.trim().length < 10) {
    errors.message =
      lang === "fi" ? "Viesti on liian lyhyt (min. 10 merkkiä)" : "Message too short (min. 10 chars)";
  }
  return errors;
}

export function ContactFormModal({ 
    open,
  onClose,
  recipientName,
  listingTitle,
  listingId,
  listingType,
  sellerId,
  onSuccess,
 }: ContactFormModalProps) {
  const { lang } = useLang();

  const [form, setForm] = useState<FormState>({ name: "", email: "", message: "", website: "" });
  const [errors, setErrors] = useState<FieldError>({});
  const [touched, setTouched] = useState<Record<keyof FormState, boolean>>({ 
    name: false, email: false, message: false, website: false });
  const [phase, setPhase] = useState<"form" | "loading" | "success">("form");
  const firstInputRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Reset on open/close
  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    setForm({ name: "", email: "", message: "", website: "" });
    setErrors({});
    setTouched({ name: false, email: false, message: false, website: false });
    setPhase("form");
    setIsAuthenticated(false);
    setTimeout(() => firstInputRef.current?.focus(), 80);

    // Insert the name and email of the authorized user, if they are logged in
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (cancelled) return;

      setIsAuthenticated(true);
      setForm((prev) => ({
        ...prev,
        name: profile?.full_name ?? prev.name,
        email: user.email ?? prev.email,
      }));
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  // Trap scroll
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!open) return null;

  const liveErrors = validate(form, lang);

  const setField = (field: keyof FormState) => (value: string) => {
    const updated = { ...form, [field]: value };
    setForm(updated);
    if (touched[field]) {
      setErrors(validate(updated, lang));
    }
  };

  const blurField = (field: keyof FormState) => () => {
    const next = { ...touched, [field]: true };
    setTouched(next);
    setErrors(validate(form, lang));
  };

  
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  const all: Record<keyof FormState, boolean> = { name: true, email: true, message: true, website: true };
  setTouched(all);
  const errs = validate(form, lang);
  setErrors(errs);
  if (Object.keys(errs).length > 0) return;

  if (!sellerId) {
    console.error("ContactFormModal: sellerId is missing, cannot send message");
    return;
  }

  setPhase("loading");

  try {
    await sendContactMessage({
      forest_listing_id: listingType === "forest" ? listingId : undefined,
      farm_listing_id: listingType === "farm" ? listingId : undefined,
      receiver_id: sellerId, 
      name: form.name,
      email: form.email,
      message: form.message,
      website: form.website,
    });
    setPhase("success");
    onSuccess?.();
  } catch (err) {
    console.error("Viestin lähetys epäonnistui:", err);
    setPhase("form");
  }
};

  const isFieldError = (field: keyof FieldError) => touched[field] && !!liveErrors[field];

  const fi = lang === "fi";

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(28, 28, 26, 0.55)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div
        className="relative w-full max-w-md bg-card rounded-3xl shadow-2xl overflow-hidden"
        style={{ boxShadow: "0 24px 80px rgba(28,28,26,0.22), 0 2px 8px rgba(28,28,26,0.08)" }}
        role="dialog"
        aria-modal="true"
        aria-label={fi ? "Ota yhteyttä" : "Contact"}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div
          className="px-6 pt-6 pb-5 border-b border-border relative"
          style={{ background: "linear-gradient(160deg, #F5F3EE 0%, #EEF4E9 100%)" }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            aria-label={fi ? "Sulje" : "Close"}
          >
            <X className="w-4 h-4" />
          </button>

          {/* Brand mark + title */}
          <div className="flex items-center gap-2.5 mb-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "#2A5012" }}
            >
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <span
              style={{ fontFamily: "'Fraunces', serif", fontWeight: 400, fontSize: "0.75rem", color: "#2A5012", letterSpacing: "0.06em" }}
              className="uppercase tracking-wider"
            >
              Metsätorvi
            </span>
          </div>

          <h2
            style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: "1.35rem", lineHeight: 1.25 }}
            className="text-foreground"
          >
            {fi ? "Ota yhteyttä" : "Contact"}
          </h2>

          {/* Recipient context */}
          {(recipientName || listingTitle) && (
            <div className="mt-2 flex flex-col gap-0.5">
              {recipientName && (
                <p className="text-muted-foreground text-sm">
                  {fi ? "Vastaanottaja:" : "To:"}{" "}
                  <span className="text-foreground font-medium">{recipientName}</span>
                </p>
              )}
              {listingTitle && (
                <p className="text-muted-foreground text-xs truncate">
                  {fi ? "Ilmoitus: " : "Listing: "}
                  <span className="italic">{listingTitle}</span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Form / Loading / Success ──────────────────────────────── */}
        {phase === "form" && (
          <form onSubmit={handleSubmit} noValidate className="px-6 py-5 space-y-4">
            {isAuthenticated && (
                <p className="text-xs text-muted-foreground -mt-1">
                  {fi
                    ? "Tietosi on täytetty automaattisesti tilisi perusteella."
                    : "Your details were filled in automatically from your account."}
                </p>
              )}
            {/* Name */}
            <div>
              <label
                className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5"
                htmlFor="cf-name"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {fi ? "Nimesi" : "Your name"}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  ref={firstInputRef}
                  id="cf-name"
                  type="text"
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => setField("name")(e.target.value)}
                  onBlur={blurField("name")}
                  placeholder={fi ? "Etunimi Sukunimi" : "First Last"}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all ${
                    isFieldError("name")
                      ? "border-accent/60 bg-accent/5 focus:ring-2 focus:ring-accent/20"
                      : "border-border bg-input-background focus:ring-2 focus:ring-ring/30"
                  }`}
                  style={{ fontFamily: "'Inter', sans-serif" }}
                />
              </div>
              {isFieldError("name") && (
                <p className="flex items-center gap-1 mt-1 text-xs text-accent">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  {liveErrors.name}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label
                className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5"
                htmlFor="cf-email"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {fi ? "Sähköpostiosoite" : "Email address"}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  id="cf-email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setField("email")(e.target.value)}
                  onBlur={blurField("email")}
                  placeholder={fi ? "sinä@esimerkki.fi" : "you@example.com"}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all ${
                    isFieldError("email")
                      ? "border-accent/60 bg-accent/5 focus:ring-2 focus:ring-accent/20"
                      : "border-border bg-input-background focus:ring-2 focus:ring-ring/30"
                  }`}
                  style={{ fontFamily: "'Inter', sans-serif" }}
                />
              </div>
              {isFieldError("email") && (
                <p className="flex items-center gap-1 mt-1 text-xs text-accent">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  {liveErrors.email}
                </p>
              )}
            </div>

            {/* Message */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  className="block text-xs font-semibold text-foreground uppercase tracking-wide"
                  htmlFor="cf-message"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {fi ? "Viestisi" : "Your message"}
                </label>
                <span className={`text-xs transition-colors ${form.message.length > 500 ? "text-accent" : "text-muted-foreground"}`}>
                  {form.message.length}/500
                </span>
              </div>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-muted-foreground pointer-events-none" />
                <textarea
                  id="cf-message"
                  value={form.message}
                  onChange={(e) => {
                    if (e.target.value.length <= 500) setField("message")(e.target.value);
                  }}
                  onBlur={blurField("message")}
                  placeholder={fi ? "Kirjoita viestisi tähän..." : "Write your message here..."}
                  rows={4}
                  maxLength={500}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all resize-none ${
                    isFieldError("message")
                      ? "border-accent/60 bg-accent/5 focus:ring-2 focus:ring-accent/20"
                      : "border-border bg-input-background focus:ring-2 focus:ring-ring/30"
                  }`}
                  style={{ fontFamily: "'Inter', sans-serif" }}
                />
              </div>
              {isFieldError("message") && (
                <p className="flex items-center gap-1 mt-1 text-xs text-accent">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  {liveErrors.message}
                </p>
              )}
            </div>
            
            <input
                type="text"
                name="website"
                value={form.website}
                onChange={(e) => setField("website")(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", opacity: 0 }}
                aria-hidden="true"
                />

            {/* Submit */}
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] mt-1"
              style={{ background: "linear-gradient(135deg, #2A5012, #3E6E1A)", fontFamily: "'Inter', sans-serif" }}
            >
              <Send className="w-4 h-4" />
              {fi ? "Lähetä viesti" : "Send message"}
            </button>

            {/* Privacy note */}
            <p className="text-center text-xs text-muted-foreground leading-relaxed">
              {fi
                ? "Viestisi lähetetään suoraan myyjälle. Metsätorvi ei jaa tietojasi kolmansille osapuolille."
                : "Your message is sent directly to the seller. Metsätorvi does not share your data with third parties."}
            </p>
          </form>
        )}

        {phase === "loading" && (
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <div className="relative mb-6">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "#EEF4E9" }}
              >
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
              {/* Pulse rings */}
              <span
                className="absolute inset-0 rounded-2xl animate-ping opacity-30"
                style={{ background: "#2A5012" }}
              />
            </div>
            <p style={{ fontFamily: "'Fraunces', serif", fontWeight: 400 }} className="text-foreground text-base">
              {fi ? "Lähetetään…" : "Sending…"}
            </p>
          </div>
        )}

        {phase === "success" && (
          <div className="flex flex-col items-center py-10 px-6 text-center">
            {/* Success icon */}
            <div className="relative mb-5">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "#EEF4E9" }}
              >
                <CheckCircle className="w-8 h-8" style={{ color: "#2A5012" }} />
              </div>
              {/* Static ring */}
              <div
                className="absolute -inset-2 rounded-3xl opacity-20 border-2"
                style={{ borderColor: "#2A5012" }}
              />
            </div>

            <h3
              style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: "1.2rem" }}
              className="text-foreground mb-2"
            >
              {fi ? "Viesti lähetetty onnistuneesti!" : "Message sent successfully!"}
            </h3>

            <p className="text-muted-foreground text-sm leading-relaxed mb-1 max-w-xs">
              {fi
                ? "Myyjä saa viestisi pian ja palaa sinulle 24 tunnin sisällä."
                : "The seller will receive your message shortly and respond within 24 hours."}
            </p>

            {recipientName && (
              <p className="text-muted-foreground text-xs mt-0.5 mb-6">
                {fi ? "Vastaanottaja: " : "Sent to: "}
                <span className="font-medium text-foreground">{recipientName}</span>
              </p>
            )}

            {!recipientName && <div className="mb-6" />}

            {/* Divider */}
            <div className="w-full border-t border-border mb-5" />

            {/* Confirmation detail */}
            <div className="w-full rounded-xl bg-secondary/60 border border-border px-4 py-3 text-left mb-5">
              <p className="text-xs text-muted-foreground mb-1">
                {fi ? "Vahvistus lähetetty osoitteeseen" : "Confirmation sent to"}
              </p>
              <p className="text-sm font-medium text-foreground">
                {form.email || (fi ? "sähköpostisi" : "your email")}
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl text-sm font-medium text-primary border-2 border-primary/30 hover:bg-primary/5 transition-all"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {fi ? "Sulje" : "Close"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

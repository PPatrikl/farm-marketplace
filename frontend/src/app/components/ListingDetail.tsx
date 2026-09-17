// src/app/components/ListingDetail.tsx
import {
  ChevronRight, MapPin, Star, Share2, Heart, CheckCircle,
  Home, Briefcase, Users, Utensils, Car, TreePine, Dog,
  Clock, FileText, ChevronLeft, ChevronRight as ChevronRightIcon,
  MessageSquare, Send, Wifi, ShieldCheck, Coffee, Sprout,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useLang } from "../i18n/LanguageContext";
import type { Farm } from "../data/farms";
import { supabase } from "../../supabaseClient";
import { ContactFormModal } from "./ContactFormModal";

interface ListingDetailProps {
  farm: Farm;
  onBack: () => void;
}

// ─── Mini Calendar ───────────────────────────────────────────────────────────

function isoToDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function getSeasonWindow(seasonStart: string, seasonEnd: string, today: Date = new Date()) {
  const start = isoToDate(seasonStart);
  const end = isoToDate(seasonEnd);

  for (const year of [today.getFullYear(), today.getFullYear() + 1]) {
    const candidateStart = new Date(year, start.getMonth(), start.getDate());
    const candidateEnd = new Date(year, end.getMonth(), end.getDate());

    if (candidateStart <= today && candidateEnd >= today) {
      return { start: candidateStart, end: candidateEnd };
    }

    if (candidateStart > today) {
      return { start: candidateStart, end: candidateEnd };
    }
  }

  return { start, end };
}

function MiniCalendar({
  seasonStart,
  seasonEnd,
  selected,
  onSelect,
}: {
  seasonStart: string;
  seasonEnd: string;
  selected: Date | null;
  onSelect: (d: Date) => void;
}) {
  const { tr, lang } = useLang();
  const months = (tr("cal_mo") as unknown as string[]);
  const days = (tr("cal_days") as unknown as string[]);
  const today = new Date();
  const { start, end } = getSeasonWindow(seasonStart, seasonEnd, today);

  const [viewYear, setViewYear] = useState(start.getFullYear());
  const [viewMonth, setViewMonth] = useState(start.getMonth());

  // Build grid for the current viewed month
  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  // Monday-first offset
  let startDow = firstOfMonth.getDay(); // 0=Sun
  startDow = startDow === 0 ? 6 : startDow - 1;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (Date | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(viewYear, viewMonth, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(v => v - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(v => v + 1); }
    else setViewMonth(m => m + 1);
  };

  const canGoPrev = new Date(viewYear, viewMonth - 1, 1) >= new Date(start.getFullYear(), start.getMonth(), 1);
  const canGoNext = new Date(viewYear, viewMonth + 1, 1) <= new Date(end.getFullYear(), end.getMonth(), 1);

  return (
    <div className="select-none" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          disabled={!canGoPrev}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium text-foreground">
          {months[viewMonth]} {viewYear}
        </span>
        <button
          onClick={nextMonth}
          disabled={!canGoNext}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {days.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wide py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((date, idx) => {
          if (!date) return <div key={idx} />;

          const isPast = date < today && !sameDay(date, today);
          const inSeason = date >= start && date <= end;
          const isSelected = selected ? sameDay(date, selected) : false;
          const isToday = sameDay(date, today);
          const disabled = isPast || !inSeason;

          return (
            <button
              key={idx}
              onClick={() => !disabled && onSelect(date)}
              disabled={disabled}
              className={`
                relative h-8 w-full rounded-lg text-xs transition-all flex items-center justify-center
                ${disabled ? "opacity-30 cursor-not-allowed text-muted-foreground" : "cursor-pointer"}
                ${isSelected
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : !disabled
                    ? "hover:bg-secondary text-foreground"
                    : "text-muted-foreground"
                }
                ${isToday && !isSelected ? "ring-1 ring-primary/40 font-medium" : ""}
                ${inSeason && !disabled && !isSelected ? "font-medium" : ""}
              `}
            >
              {date.getDate()}
              {inSeason && !disabled && !isSelected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary/40" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-primary/40 inline-block" />
          {lang === "fi" ? "Poiminta-ajan sisällä" : "In season"}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-primary inline-block" />
          {lang === "fi" ? "Valittu" : "Selected"}
        </span>
      </div>
    </div>
  );
}

// ─── Amenity tag icon map ─────────────────────────────────────────────────────
const tagIconMap: Record<string, typeof Home> = {
  "sopii perheille": Users,
  "family-friendly": Users,
  "lapset tervetulleita": Users,
  "children welcome": Users,
  "parkkipaikka": Car,
  "parking": Car,
  "majoitus järjestetty": Home,
  "accommodation provided": Home,
  "housing provided": Home,
  "asuminen järjestetty": Home,
  "ateriat sisältyvät": Utensils,
  "meals included": Utensils,
  "ateria-avustus": Utensils,
  "meal allowance": Utensils,
  "luomu": Sprout,
  "organic": Sprout,
  "koirat sallittu": Dog,
  "dogs allowed": Dog,
  "kahvila": Coffee,
  "café": Coffee,
  "pieni kahvio": Coffee,
  "small café": Coffee,
  "konetyö": Briefcase,
  "machinery work": Briefcase,
  "kuljetukset": Car,
  "transport": Car,
  "laavu": TreePine,
  "lean-to shelter": TreePine,
  "kaunis maisema": TreePine,
  "scenic location": TreePine,
  "sopimuspohjainen": FileText,
  "contract work": FileText,
  "esteettömyys": Wifi, // placeholder accessible icon
  "accessible": Wifi,
};

function getTagIcon(tag: string) {
  const key = tag.toLowerCase();
  return tagIconMap[key] ?? CheckCircle;
}

// ─── Contact drawer ───────────────────────────────────────────────────────────
function ContactDrawer({ hostName, onClose }: { hostName: string; onClose: () => void }) {
  const { tr, lang } = useLang();
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const handleSend = () => {
    if (!message.trim()) return;
    setSent(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(28,28,26,0.55)", backdropFilter: "blur(4px)" }}>
      <div ref={ref} className="w-full max-w-md bg-card rounded-3xl border border-border shadow-2xl overflow-hidden"
        style={{ fontFamily: "'Inter', sans-serif" }}>
        {sent ? (
          <div className="p-8 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <CheckCircle className="w-7 h-7 text-primary" />
            </div>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: "1.25rem" }}
              className="text-foreground mb-2">
              {tr("det_host_message_sent")}
            </h3>
            <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
              {lang === "fi"
                ? `Viestisi on lähetetty ${hostName}:lle. Hän vastaa yleensä alle 2 tunnissa.`
                : `Your message has been sent to ${hostName}. They usually reply within 2 hours.`}
            </p>
            <button onClick={onClose}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
              {lang === "fi" ? "Sulje" : "Close"}
            </button>
          </div>
        ) : (
          <>
            <div className="px-6 py-5 border-b border-border flex items-center justify-between"
              style={{ background: "linear-gradient(160deg, #F5F3EE 0%, #EEF4E9 100%)" }}>
              <div>
                <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }}
                  className="text-foreground text-lg">{tr("det_host_contact")}</h3>
                <p className="text-muted-foreground text-xs mt-0.5">{hostName}</p>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg text-muted-foreground hover:bg-secondary transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={tr("det_host_message_placeholder")}
                rows={4}
                className="w-full px-4 py-3 bg-input-background rounded-xl border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/30 resize-none"
                style={{ fontFamily: "'Inter', sans-serif" }}
                autoFocus
              />
              <button
                onClick={handleSend}
                disabled={!message.trim()}
                className="w-full py-3 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                {tr("det_host_send")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export function ListingDetail({ farm, onBack }: ListingDetailProps) {
  const { tr, lang } = useLang();
  const [saved, setSaved] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [applied, setApplied] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [activeGallery, setActiveGallery] = useState<number | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingName, setBookingName] = useState("");
  const [bookingEmail, setBookingEmail] = useState("");
  const [bookingGuests, setBookingGuests] = useState("1");
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingFeedback, setBookingFeedback] = useState<string | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const isPicking = farm.type === "picking";
  const location = lang === "fi" ? farm.location_fi : farm.location_en;
  const description = lang === "fi" ? farm.description_fi : farm.description_en;
  const tags = lang === "fi" ? farm.tags_fi : farm.tags_en;
  const produce = lang === "fi" ? farm.produce_fi : farm.produce_en;
  const hostMember = lang === "fi" ? farm.hostMemberSince_fi : farm.hostMemberSince_en;
  const contractType = lang === "fi" ? farm.contractType_fi : farm.contractType_en;
  const workingHours = lang === "fi" ? farm.workingHours_fi : farm.workingHours_en;

  // Format selected date for display
  const months_fi = ["tammikuuta","helmikuuta","maaliskuuta","huhtikuuta","toukokuuta","kesäkuuta","heinäkuuta","elokuuta","syyskuuta","lokakuuta","marraskuuta","joulukuuta"];
  const months_en = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const formatDate = (d: Date) => {
    if (lang === "fi") return `${d.getDate()}. ${months_fi[d.getMonth()]} ${d.getFullYear()}`;
    return `${months_en[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  };

  const formatIsoDate = (d: Date) => {
    const year = d.getFullYear();
    const month = `${d.getMonth() + 1}`.padStart(2, "0");
    const day = `${d.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const estimatedTotal = selectedDate
    ? (parseFloat(farm.price) * 5).toFixed(2)
    : null;

  const badgeStyle = isPicking
    ? { bg: "#EDF4E8", text: "#2A5012" }
    : { bg: "#FAEAEC", text: "#B8293A" };
  const badgeLabel = isPicking ? tr("badge_picking") : tr("badge_job");

  // Description paragraphs
  const paragraphs = description.split("\n\n").filter(Boolean);

  const handleBookingSubmit = async () => {
    if (!selectedDate) return;

    const name = bookingName.trim();
    const email = bookingEmail.trim();
    const guests = Number(bookingGuests) || 1;

    if (!name || !email) {
      setBookingFeedback(lang === "fi" ? "Anna nimi ja sähköposti." : "Please provide your name and email.");
      return;
    }

    setBookingSubmitting(true);
    setBookingFeedback(null);

    const listingId = typeof farm.id === "string" && farm.id.length > 0
      ? farm.id
      : "00000000-0000-0000-0000-000000000000";

    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
      listing_id: listingId,
      booker_id: user?.id ?? null,
      status: "pending",
      booking_date: formatIsoDate(selectedDate),
      party_size: guests,
      message: `${name}\n${email}\n${bookingNotes.trim()}`.trim() || null,
    };

    try {
      const { data, error } = await supabase
        .from("bookings")
        .insert([payload])
        .select("id")
        .single();

      setBookingSubmitting(false);

      if (error) {
        throw new Error(error.message || "Booking request failed");
      }

      setBookingFeedback(lang === "fi" ? "Varaus lähetetty onnistuneesti!" : "Booking submitted successfully!");
      setBookingOpen(false);
      setBookingName("");
      setBookingEmail("");
      setBookingGuests("1");
      setBookingNotes("");
    } catch (error) {
      setBookingSubmitting(false);
      console.error("Booking insert failed", error);
      const detail = error instanceof Error ? error.message : (lang === "fi" ? "Tarkista palvelinyhteys." : "Please check the server connection.");
      setBookingFeedback(lang === "fi" ? `Varausta ei voitu lähettää: ${detail}` : `The booking could not be submitted: ${detail}`);
    }

  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="min-h-screen bg-background">
      {/* ── Breadcrumb bar ──────────────────────────────────────────────── */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <nav className="flex items-center gap-1 text-sm">
            <button onClick={onBack} className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
              <ChevronLeft className="w-3.5 h-3.5" />
              {tr("det_breadcrumb_farms")}
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-border flex-shrink-0" />
            <span className="text-foreground font-medium truncate max-w-[200px]">{farm.name}</span>
          </nav>
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-sm"
            >
              <Share2 className="w-3.5 h-3.5" />
              {tr("det_share")}
            </button>
            <button
              onClick={() => setSaved(!saved)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors text-sm ${
                saved
                  ? "border-accent/40 bg-accent/5 text-accent"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${saved ? "fill-accent" : ""}`} />
              {tr("det_save")}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ── Media ───────────────────────────────────────────────────────── */}
        <div className="mb-8">
          {/* Hero */}
          <div
            className="relative rounded-2xl overflow-hidden mb-3 cursor-pointer group"
            style={{ height: "clamp(240px, 42vw, 480px)", background: "#E8E4DA" }}
            onClick={() => setActiveGallery(0)}
          >
            <img
              src={farm.image}
              alt={farm.name}
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full">
              {lang === "fi" ? "Näytä kaikki kuvat" : "View all photos"}
            </div>
          </div>

          {/* Gallery row */}
          <div className="grid grid-cols-3 gap-3">
            {farm.galleryImages.map((img, i) => (
              <div
                key={i}
                className="relative rounded-xl overflow-hidden cursor-pointer group"
                style={{ height: 120, background: "#E8E4DA" }}
                onClick={() => setActiveGallery(i + 1)}
              >
                <img
                  src={img}
                  alt={`${farm.name} ${i + 2}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {i === 2 && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      +{farm.galleryImages.length - 2} {lang === "fi" ? "lisää" : "more"}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Two-column body ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10 items-start">

          {/* ── LEFT COLUMN ─────────────────────────────────────────────── */}
          <div className="space-y-10 min-w-0">

            {/* Title & meta */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span
                  className="px-3 py-1 rounded-full text-xs font-medium"
                  style={{ background: badgeStyle.bg, color: badgeStyle.text }}
                >
                  {badgeLabel}
                </span>
                <span className="flex items-center gap-1 text-muted-foreground text-xs">
                  <MapPin className="w-3.5 h-3.5" />
                  {location}
                </span>
                <span className="flex items-center gap-1 text-muted-foreground text-xs">
                  <Star className="w-3.5 h-3.5 text-yellow-500" fill="currentColor" />
                  <span className="text-foreground font-medium">{farm.rating}</span>
                  <span>({farm.reviews} {tr("det_reviews_suffix")})</span>
                </span>
              </div>
              <h1
                style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, lineHeight: 1.15, fontSize: "clamp(1.6rem, 3.5vw, 2.25rem)" }}
                className="text-foreground"
              >
                {farm.name} — {produce}
              </h1>
            </div>

            {/* Description */}
            <section>
              <h2
                style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }}
                className="text-foreground text-xl mb-4"
              >
                {tr("det_section_description")}
              </h2>
              <div className="space-y-4">
                {paragraphs.map((p, i) => (
                  <p key={i} className="text-foreground/80 leading-relaxed text-sm">
                    {p}
                  </p>
                ))}
              </div>
            </section>

            {/* Amenities / Details */}
            <section>
              <h2
                style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }}
                className="text-foreground text-xl mb-5"
              >
                {isPicking ? tr("det_section_amenities") : tr("det_section_details")}
              </h2>

              {isPicking ? (
                /* Picking amenities grid */
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {tags.map((tag) => {
                    const Icon = getTagIcon(tag);
                    return (
                      <div
                        key={tag}
                        className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border hover:border-primary/20 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-sm text-foreground leading-tight">{tag}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Job details */
                <div className="space-y-4">
                  {/* Amenity tags */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-2">
                    {tags.map((tag) => {
                      const Icon = getTagIcon(tag);
                      return (
                        <div
                          key={tag}
                          className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border hover:border-primary/20 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                            <Icon className="w-4 h-4 text-primary" />
                          </div>
                          <span className="text-sm text-foreground leading-tight">{tag}</span>
                        </div>
                      );
                    })}
                  </div>
                  {/* Job-specific rows */}
                  <div className="bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border">
                    {[
                      { icon: Clock, label: tr("det_working_hours"), value: workingHours },
                      { icon: FileText, label: tr("det_contract_type"), value: contractType },
                      { icon: Users, label: tr("det_spots_label"), value: `${farm.openSpots}` },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-center gap-4 px-4 py-3.5">
                        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{label}</span>
                          <span className="text-sm font-medium text-foreground">{value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Picking rules / Location */}
            {isPicking && (
              <section>
                <h2
                  style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }}
                  className="text-foreground text-xl mb-4"
                >
                  {tr("det_section_rules")}
                </h2>
                <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
                  {(lang === "fi"
                    ? [
                        "Poiminta sallittu vain merkityillä pelloilla.",
                        "Omien astioiden (ämpäri, rasia) tuominen suositeltavaa.",
                        "Lapset tervetulleita vanhempien seurassa.",
                        "Maksu punnitusten mukaan poistuttaessa — käteinen tai kortti.",
                        "Älä syö marjoja ennen punnitusta.",
                      ]
                    : [
                        "Picking is permitted only on marked fields.",
                        "Bringing your own containers (bucket, box) is recommended.",
                        "Children welcome when accompanied by a parent.",
                        "Payment is by weight at exit — cash or card accepted.",
                        "Please do not eat berries before weighing.",
                      ]
                  ).map((rule, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-semibold text-primary-foreground"
                        style={{ background: "#2A5012", minWidth: "1.25rem" }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-sm text-foreground/80 leading-relaxed">{rule}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Location */}
            <section>
              <h2
                style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }}
                className="text-foreground text-xl mb-4"
              >
                {tr("det_section_location")}
              </h2>
              <div
                className="relative rounded-2xl overflow-hidden border border-border"
                style={{ height: 200, background: "#DDD8CE" }}
              >
                <img
                  src="https://images.unsplash.com/photo-1668090147256-10de5a40b9fe?w=800&h=200&fit=crop&auto=format"
                  alt="Farm location"
                  className="w-full h-full object-cover opacity-40"
                />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, #EEF4E9 0%, transparent 40%, transparent 60%, #EEF4E9 100%)" }} />
                {/* Grid lines */}
                <svg className="absolute inset-0 w-full h-full opacity-10">
                  {[1,2,3].map(i => (
                    <line key={`h${i}`} x1="0" y1={`${i*25}%`} x2="100%" y2={`${i*25}%`} stroke="#2A5012" strokeWidth="1" />
                  ))}
                  {[1,2,3,4,5,6,7].map(i => (
                    <line key={`v${i}`} x1={`${i*12.5}%`} y1="0" x2={`${i*12.5}%`} y2="100%" stroke="#2A5012" strokeWidth="1" />
                  ))}
                </svg>
                {/* Center pin */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary border-2 border-white shadow-lg relative">
                    <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-30" />
                  </div>
                  <div className="bg-foreground text-background text-xs px-3 py-1.5 rounded-full shadow-lg font-medium">
                    {farm.city} · {lang === "fi" ? farm.region_fi : farm.region_en}
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* ── RIGHT COLUMN — Sticky sidebar ───────────────────────────── */}
          <div ref={sidebarRef} className="lg:sticky lg:top-24 space-y-4">

            {/* Action card */}
            <div className="bg-card rounded-2xl border border-border shadow-md overflow-hidden">
              {/* Card header strip */}
              <div
                className="px-5 py-4"
                style={{
                  background: isPicking
                    ? "linear-gradient(135deg, #2A5012 0%, #4A7C2F 100%)"
                    : "linear-gradient(135deg, #8B1A26 0%, #B8293A 100%)",
                }}
              >
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-white/70 text-xs mb-1">
                      {isPicking ? tr("det_price_unit_label") : tr("det_wage_label")}
                    </p>
                    <div className="flex items-baseline gap-1.5">
                      <span
                        style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: "2rem", lineHeight: 1 }}
                        className="text-white"
                      >
                        €{farm.price}
                      </span>
                      <span className="text-white/70 text-sm">/ {farm.unit}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-white/15 px-2.5 py-1.5 rounded-full">
                    <Star className="w-3.5 h-3.5 text-yellow-300" fill="currentColor" />
                    <span className="text-white text-sm font-medium">{farm.rating}</span>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-5">
                {isPicking ? (
                  /* ── PICKING sidebar body ── */
                  <>
                    {/* Season strip */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground text-xs">{tr("det_season_label")}</span>
                      <span className="font-medium text-foreground text-xs">
                        {farm.dateStart} – {farm.dateEnd}
                      </span>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-border" />

                    {/* Calendar */}
                    <div>
                      <p className="text-xs font-medium text-foreground mb-3">{tr("det_select_date")}</p>
                      <MiniCalendar
                        seasonStart={farm.seasonStart}
                        seasonEnd={farm.seasonEnd}
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                      />
                    </div>

                    {/* Selected date feedback */}
                    {selectedDate ? (
                      <div className="bg-secondary rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground text-xs">{tr("det_selected_date")}</span>
                          <span className="font-medium text-foreground text-xs">{formatDate(selectedDate)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm border-t border-border/60 pt-2 mt-1">
                          <span className="text-muted-foreground text-xs">{tr("det_estimated_total")}</span>
                          <span
                            style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }}
                            className="text-primary text-sm"
                          >
                            €{estimatedTotal}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-center text-xs text-muted-foreground">{tr("det_no_date")}</p>
                    )}

                    {/* Spots */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground text-xs">{tr("det_spots_label")}</span>
                      <span className="font-medium text-primary text-xs">{farm.openSpots}</span>
                    </div>

                    {/* CTA */}
                    <button
                      disabled={!selectedDate}
                      onClick={() => {
                        setBookingFeedback(null);
                        setBookingOpen(true);
                      }}
                      className="w-full py-3.5 rounded-xl font-medium text-sm transition-all bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {tr("det_cta_book")}
                    </button>

                    {bookingOpen && selectedDate && (
                      <div className="rounded-xl border border-border bg-card p-3 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-medium text-foreground">{tr("det_booking_form_title")}</p>
                            <p className="text-[11px] text-muted-foreground">{formatDate(selectedDate)} • {farm.name}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setBookingOpen(false)}
                            className="text-[11px] text-muted-foreground hover:text-foreground"
                          >
                            {lang === "fi" ? "Sulje" : "Close"}
                          </button>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[11px] font-medium text-foreground block">{tr("det_booking_name")}</label>
                          <input
                            value={bookingName}
                            onChange={(e) => setBookingName(e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/30"
                            placeholder={lang === "fi" ? "Etunimi Sukunimi" : "Full name"}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[11px] font-medium text-foreground block">{tr("det_booking_email")}</label>
                          <input
                            type="email"
                            value={bookingEmail}
                            onChange={(e) => setBookingEmail(e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/30"
                            placeholder="name@example.com"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[11px] font-medium text-foreground block">{tr("det_booking_guests")}</label>
                          <input
                            type="number"
                            min="1"
                            value={bookingGuests}
                            onChange={(e) => setBookingGuests(e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/30"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[11px] font-medium text-foreground block">{tr("det_booking_notes")}</label>
                          <textarea
                            value={bookingNotes}
                            onChange={(e) => setBookingNotes(e.target.value)}
                            rows={3}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/30 resize-none"
                            placeholder={lang === "fi" ? "Lisätietoja, esim. allergiat tai erityistarpeet" : "Additional details, e.g. allergies or accessibility needs"}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleBookingSubmit}
                          disabled={bookingSubmitting}
                          className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium transition-all hover:bg-primary/90 disabled:opacity-60"
                        >
                          {bookingSubmitting ? (lang === "fi" ? "Lähetetään..." : "Submitting...") : tr("det_booking_submit")}
                        </button>

                        {bookingFeedback ? (
                          <p className={`text-[11px] ${bookingFeedback.includes("onnistuneesti") || bookingFeedback.includes("successfully") ? "text-primary" : "text-muted-foreground"}`}>
                            {bookingFeedback}
                          </p>
                        ) : null}
                      </div>
                    )}

                    <p className="text-center text-xs text-muted-foreground">{tr("det_capacity_note")}</p>
                  </>
                ) : (
                  /* ── JOB sidebar body ── */
                  <>
                    {/* Detail rows */}
                    <div className="space-y-3">
                      {[
                        { label: tr("det_season_label"), value: `${farm.dateStart} – ${farm.dateEnd}` },
                        { label: tr("det_working_hours"), value: workingHours ?? "" },
                        { label: tr("det_contract_type"), value: contractType ?? "" },
                        { label: tr("det_spots_label"), value: `${farm.openSpots}` },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-start justify-between gap-3">
                          <span className="text-muted-foreground text-xs flex-shrink-0">{label}</span>
                          <span className="text-foreground text-xs font-medium text-right leading-snug">{value}</span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-border" />

                    {/* Included items */}
                    <div>
                      <p className="text-xs font-medium text-foreground mb-2.5">{tr("det_included_label")}</p>
                      <div className="space-y-1.5">
                        {tags.slice(0, 4).map((tag) => {
                          const Icon = getTagIcon(tag);
                          return (
                            <div key={tag} className="flex items-center gap-2 text-xs text-foreground">
                              <Icon className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                              {tag}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="border-t border-border" />

                    {/* CTA */}
                    <button
                      onClick={() => !applied && setApplied(true)}
                      className={`w-full py-3.5 rounded-xl font-medium text-sm transition-all ${
                        applied
                          ? "bg-secondary text-secondary-foreground cursor-default"
                          : "bg-accent text-accent-foreground hover:bg-accent/85"
                      }`}
                    >
                      {applied ? tr("det_applied_state") : tr("det_cta_apply")}
                    </button>
                    <p className="text-center text-xs text-muted-foreground">{tr("det_apply_hint")}</p>
                  </>
                )}
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card rounded-xl border border-border p-3.5 text-center">
                <p style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: "1.3rem" }} className="text-foreground">
                  {farm.hostRating}
                </p>
                <p className="text-muted-foreground text-xs mt-0.5">{lang === "fi" ? "Isäntäarvo" : "Host rating"}</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-3.5 text-center">
                <p style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: "1.3rem" }} className="text-foreground">
                  {farm.hostReviews}
                </p>
                <p className="text-muted-foreground text-xs mt-0.5">{lang === "fi" ? "Arvostelua" : "Reviews"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Host profile card ──────────────────────────────────────────── */}
        <div className="mt-16 pt-10 border-t border-border">
          <h2
            style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }}
            className="text-foreground text-2xl mb-6"
          >
            {tr("det_host_title")}
          </h2>
          <div className="bg-card rounded-2xl border border-border p-6 md:p-8">
            <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-start">
              {/* Avatar + name */}
              <div className="flex items-center gap-4 flex-shrink-0">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-semibold shadow-md"
                  style={{
                    background: "linear-gradient(135deg, #2A5012, #4A7C2F)",
                    fontFamily: "'Fraunces', serif",
                  }}
                >
                  {farm.hostInitials}
                </div>
                <div>
                  <h3
                    style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: "1.15rem" }}
                    className="text-foreground"
                  >
                    {farm.hostName}
                  </h3>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-3.5 h-3.5 text-yellow-500" fill="currentColor" />
                    <span className="text-sm font-medium text-foreground">{farm.hostRating}</span>
                    <span className="text-muted-foreground text-xs ml-1">
                      ({farm.hostReviews} {tr("det_reviews_suffix")})
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">
                    {tr("det_host_member")}: {hostMember}
                  </p>
                </div>
              </div>

              {/* Verification badges */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { labelKey: "det_host_verified_phone" as const, ok: true },
                  { labelKey: "det_host_verified_id" as const, ok: true },
                  { labelKey: "det_host_verified_food" as const, ok: farm.id !== 3 },
                ].map(({ labelKey, ok }) => (
                  <div
                    key={labelKey}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border transition-colors ${
                      ok
                        ? "border-primary/20 bg-primary/5"
                        : "border-border bg-muted/30"
                    }`}
                  >
                    <ShieldCheck
                      className="w-4 h-4 flex-shrink-0"
                      style={{ color: ok ? "#2A5012" : "#C2BDB0" }}
                    />
                    <span className={`text-xs leading-tight ${ok ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {tr(labelKey)}
                    </span>
                    {ok && <CheckCircle className="w-3.5 h-3.5 text-primary ml-auto flex-shrink-0" />}
                  </div>
                ))}
              </div>

              {/* Contact CTA */}
              <div className="flex-shrink-0 flex flex-col items-end gap-3">
                <button
                  onClick={() => setContactOpen(true)}
                  className="flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  {tr("det_host_contact")}
                </button>
                <p className="text-muted-foreground text-xs text-right leading-snug max-w-[180px]">
                  {tr("det_host_response")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Contact modal ───────────────────────────────────────────────── */}
      <ContactFormModal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        recipientName={farm.hostName}
        listingTitle={`${farm.name} — ${produce}`}
        listingId={String(farm.id)}
        listingType={isPicking ? "farm" : "farm"} // и picking, и job —  farm_listing_id
        sellerId={farm.hostId} // ← 
        onSuccess={() => {/* optional: local "sent" toast */}}
      />

      {/* ── Lightbox ────────────────────────────────────────────────────── */}
      {activeGallery !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setActiveGallery(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
            onClick={() => setActiveGallery(null)}
          >
            ✕
          </button>
          <img
            src={activeGallery === 0 ? farm.image : farm.galleryImages[activeGallery - 1]}
            alt={farm.name}
            className="max-w-full max-h-full rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          {/* Thumbnail strip */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {[farm.image, ...farm.galleryImages].map((img, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setActiveGallery(i); }}
                className={`w-14 h-10 rounded-lg overflow-hidden border-2 transition-all ${
                  activeGallery === i ? "border-white" : "border-white/20 opacity-60 hover:opacity-100"
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

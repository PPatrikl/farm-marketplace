// frontend/src/app/components/Inbox.tsx
//
// "Saapuneet" tab in Oma tili: received messages and bookings.
// Opening an unread item marks it as read (and updates the bell).

import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { MessageSquare, CalendarCheck, ExternalLink, Mail } from "lucide-react";
import { supabase } from "../../supabaseClient";
import { fetchInbox, markRead, type InboxItem } from "../../services/inbox";
import { useUnread } from "../notifications/UnreadContext";

const BOOKING_STATUS: Record<string, { fi: string; en: string }> = {
  pending: { fi: "Odottaa vahvistusta", en: "Waiting for confirmation" },
  confirmed: { fi: "Vahvistettu", en: "Confirmed" },
  cancelled: { fi: "Peruttu", en: "Cancelled" },
};

const itemKey = (item: InboxItem) => `${item.kind}-${item.id}`;

export function Inbox({ lang }: { lang: string }) {
  const fi = lang === "fi";
  const locale = fi ? "fi-FI" : "en-GB";
  const navigate = useNavigate();
  const { refresh: refreshBell } = useUnread();

  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const data = await fetchInbox(user.id);
        if (!cancelled) setItems(data);
      } catch (err) {
        console.error("[Inbox] load failed:", err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleOpen = async (item: InboxItem) => {
    const key = itemKey(item);
    setOpenKey(openKey === key ? null : key);
    if (item.read) return;

    // Optimistic update: show it as read immediately, undo if saving fails
    const setRead = (read: boolean) =>
      setItems((prev) => prev.map((i) => (itemKey(i) === key ? { ...i, read } : i)));
    setRead(true);
    try {
      await markRead(item);
      refreshBell();
    } catch (err) {
      console.error("[Inbox] mark read failed:", err);
      setRead(false);
    }
  };

  const unreadCount = items.filter((i) => !i.read).length;

  return (
    <div className="max-w-3xl mx-auto" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="mb-5">
        <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }} className="text-foreground text-xl">
          {fi ? "Saapuneet" : "Inbox"}
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          {fi
            ? "Ilmoituksiisi tulleet viestit ja varaukset."
            : "Messages and bookings for your listings."}
          {unreadCount > 0 && (
            <span className="text-foreground font-medium">
              {" "}· {unreadCount} {fi ? "lukematonta" : "unread"}
            </span>
          )}
        </p>
      </div>

      {loading && <p className="text-sm text-muted-foreground py-8 text-center">{fi ? "Ladataan…" : "Loading…"}</p>}

      {error && !loading && (
        <p className="text-sm text-destructive py-8 text-center">
          {fi ? "Saapuneiden lataaminen epäonnistui." : "Failed to load the inbox."}
        </p>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="bg-card rounded-2xl border border-border p-10 text-center">
          <p className="text-muted-foreground text-sm">
            {fi ? "Ei vielä viestejä tai varauksia." : "No messages or bookings yet."}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {items.map((item) => {
          const key = itemKey(item);
          const isOpen = openKey === key;
          const Icon = item.kind === "message" ? MessageSquare : CalendarCheck;
          const heading = item.kind === "message"
            ? (fi ? "Viesti" : "Message")
            : (fi ? "Varaus" : "Booking");
          const when = new Date(item.createdAt).toLocaleString(locale, {
            day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit",
          });

          return (
            <div
              key={key}
              className={`bg-card rounded-2xl border transition-colors ${
                item.read ? "border-border" : "border-primary/40 shadow-sm"
              }`}
            >
              <button
                type="button"
                onClick={() => handleOpen(item)}
                className="w-full text-left p-4 flex items-start gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${item.read ? "text-foreground" : "text-foreground font-semibold"}`}>
                    {heading}: {item.listingTitle}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.fromName} · {when}
                  </p>
                </div>
                {!item.read && (
                  <span className="w-2.5 h-2.5 rounded-full bg-accent flex-shrink-0 mt-1.5" title={fi ? "Lukematon" : "Unread"} />
                )}
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pl-[4.25rem] space-y-3">
                  {item.kind === "booking" && (
                    <div className="text-sm space-y-1">
                      <p>
                        <span className="text-muted-foreground">{fi ? "Päivä" : "Date"}: </span>
                        <span className="text-foreground font-medium">
                          {new Date(item.bookingDate).toLocaleDateString(locale)}
                        </span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">{fi ? "Osallistujia" : "People"}: </span>
                        <span className="text-foreground font-medium">{item.partySize}</span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">{fi ? "Tila" : "Status"}: </span>
                        <span className="text-foreground font-medium">
                          {BOOKING_STATUS[item.status]?.[fi ? "fi" : "en"] ?? item.status}
                        </span>
                      </p>
                    </div>
                  )}

                  {item.text && (
                    <p className="text-sm text-foreground/80 whitespace-pre-line bg-secondary/50 rounded-xl p-3">
                      {item.text}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {item.listingLink && (
                      <button
                        type="button"
                        onClick={() => navigate(item.listingLink!)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-foreground hover:border-primary/40 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        {fi ? "Avaa ilmoitus" : "Open listing"}
                      </button>
                    )}
                    {item.kind === "message" && item.fromEmail && (
                      <a
                        href={`mailto:${item.fromEmail}?subject=${encodeURIComponent("Re: " + item.listingTitle)}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        {fi ? "Vastaa sähköpostilla" : "Reply by email"}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

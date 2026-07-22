import {
  MapPin, Camera, Plus, Star, ChevronRight,
  Sprout, Trees, Briefcase, CheckCircle, Upload
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLang } from "../i18n/LanguageContext";
import {supabase} from "../../supabaseClient"; 


const regions_fi = [
  "Uusimaa", "Pirkanmaa", "Varsinais-Suomi", "Kanta-Häme", "Päijät-Häme",
  "Kymenlaakso", "Etelä-Karjala", "Pohjois-Karjala", "Keski-Suomi",
  "Pohjois-Pohjanmaa", "Lappi",
];
const regions_en = [
  "Uusimaa", "Pirkanmaa", "Varsinais-Suomi", "Kanta-Häme", "Päijät-Häme",
  "Kymenlaakso", "South Karelia", "North Karelia", "Central Finland",
  "Northern Ostrobothnia", "Lapland",
];

export function UserProfile() {
  const { tr, lang } = useLang();


  const [profile, setProfile] = useState<{
  full_name: string;
  city: string | null;
  region: string | null;
  rating: number;
  review_count: number;
  phone_verified: boolean;
  identity_verified: boolean;
  food_licence: boolean;
  is_farmer: boolean;
  is_collector: boolean;
  total_sales_eur: number;
  created_at: string;
} | null>(null);

const [myListings, setMyListings] = useState<any[]>([]);

useEffect(() => {
  async function loadProfile() {
    // Get current logged in user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch their profile from database
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) setProfile(data);
  }
  loadProfile();
}, []);

  const [role, setRole] = useState<"picker" | "farmer">("picker");
  const [activeTab, setActiveTab] = useState<"profile" | "create">("profile");
  const [form, setForm] = useState({
    title: "",
    category: "",
    price: "",
    unit: "kg",
    volume: "",
    location: "",
    region: "",
    description: "",
    phone: "",
    delivery: false,
    shipping: false,
  });
  const [submitted, setSubmitted] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  const pickerCategories = [
    { id: "berries", labelKey: "form_cat_berries" as const, icon: "🫐" },
    { id: "mushrooms", labelKey: "form_cat_mushrooms" as const, icon: "🍄" },
    { id: "herbs", labelKey: "form_cat_herbs" as const, icon: "🌿" },
    { id: "vegetables", labelKey: "form_cat_vegetables" as const, icon: "🥕" },
  ];
  const farmerCategories = [
    { id: "picking", labelKey: "form_cat_picking" as const, icon: "🍓" },
    { id: "job", labelKey: "form_cat_job" as const, icon: "🌾" },
    { id: "vegetables", labelKey: "form_cat_vegetables" as const, icon: "🥕" },
  ];

  const cats = role === "picker" ? pickerCategories : farmerCategories;
  const regions = lang === "fi" ? regions_fi : regions_en;

  const tabs = [
    { id: "profile", labelKey: "profile_tab_profile" as const },
    { id: "create", labelKey: "profile_tab_create" as const },
  ];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="min-h-screen bg-background">
      <div className="bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-medium"
                style={{ background: "linear-gradient(135deg, #2A5012, #4A7C2F)", fontFamily: "'Fraunces', serif" }}
              >
                MK
             {profile?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() ?? 'MK'}
              </div>
              <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors">
                <Camera className="w-3 h-3" />
              </button>
            </div>
            <div className="flex-1">
              <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }} className="text-foreground text-2xl mb-0.5">
                {profile?.full_name ?? tr("profile_title")}
              </h1>
              <div className="flex items-center gap-1 text-muted-foreground text-sm">
                <MapPin className="w-3.5 h-3.5" />
                <span>{profile ? `${profile.city ?? ''}, ${profile.region ?? ''}` : tr("profile_location")}</span>
                <span className="mx-2">·</span>
                <Star className="w-3.5 h-3.5 text-yellow-500" fill="currentColor" />
                <span className="text-foreground">{profile?.rating ?? 0}</span>
                <span className="text-muted-foreground">({profile?.review_count ?? 0} {lang === "fi" ? "arvostelua" : "reviews"})</span>
              </div>
            </div>
            {/* Role toggle */}
            <div className="flex-shrink-0">
              <div className="flex items-center gap-1 bg-secondary rounded-xl p-1">
                <button
                  onClick={() => setRole("picker")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                    role === "picker" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Trees className="w-4 h-4" />
                  {tr("profile_role_picker")}
                </button>
                <button
                  onClick={() => setRole("farmer")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                    role === "farmer" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sprout className="w-4 h-4" />
                  {tr("profile_role_farmer")}
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as "profile" | "create")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {tr(tab.labelKey)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "profile" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-card rounded-2xl border border-border p-5">
                <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }} className="text-foreground mb-4">
                  {tr("profile_stats_title")}
                </h3>
                <div className="space-y-3">
                  {[
                      { labelKey: "profile_stat_listings" as const, value: String(myListings.length) },
                      { labelKey: "profile_stat_sold" as const, value: `€ ${profile?.total_sales_eur ?? 0}` },
                      { labelKey: "profile_stat_buyers" as const, value: String(profile?.review_count ?? 0) },
                      { labelKey: "profile_stat_member" as const, value: profile?.created_at
                        ? new Date(profile.created_at).toLocaleDateString(lang === "fi" ? "fi-FI" : "en-GB", { month: "long", year: "numeric" })
                        : "-" },
                  ].map((s) => (
                    <div key={s.labelKey} className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">{tr(s.labelKey)}</span>
                      <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }} className="text-foreground">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card rounded-2xl border border-border p-5">
                <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }} className="text-foreground mb-4">
                  {tr("profile_verified_title")}
                </h3>
                <div className="space-y-2">
                  {[
                    { labelKey: "profile_verified_phone" as const, ok: profile?.phone_verified ?? false },
                    { labelKey: "profile_verified_id" as const, ok: profile?.identity_verified ?? false },
                    { labelKey: "profile_verified_food" as const, ok: profile?.food_licence ?? false },
                  ].map((b) => (
                    <div key={b.labelKey} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: b.ok ? "#2A5012" : "#C2BDB0" }} />
                      <span className={`text-sm ${b.ok ? "text-foreground" : "text-muted-foreground"}`}>
                        {tr(b.labelKey)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* My listings */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }} className="text-foreground text-xl">
                  {tr("profile_listings_title")}
                </h2>
                <button
                  onClick={() => setActiveTab("create")}
                  className="flex items-center gap-2 px-3.5 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {tr("profile_btn_new")}
                </button>
              </div>

              <div className="space-y-3">
                {myListings.map((listing) => {
                  const title = lang === "fi" ? listing.title_fi : listing.title_en;
                  const status = tr(listing.status_key);
                  const isActive = listing.status_key === "profile_status_active";
                  return (
                    <div
                      key={listing.id}
                      className="bg-card rounded-2xl border border-border p-4 flex items-center gap-4 hover:border-primary/20 transition-colors cursor-pointer group"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: listing.type === "forager" ? "#EEF4E9" : "#EDF4E8" }}
                      >
                        {listing.type === "forager" ? (
                          <Trees className="w-5 h-5 text-primary" />
                        ) : (
                          <Briefcase className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground text-sm font-medium truncate">{title}</p>
                        <p className="text-muted-foreground text-xs mt-0.5">{listing.posted}</p>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0 text-xs text-muted-foreground">
                        <span>{listing.views} {tr("profile_listing_views")}</span>
                        <span>{listing.contacts} {tr("profile_listing_contacts")}</span>
                        <span
                          className="px-2.5 py-1 rounded-full font-medium"
                          style={{
                            background: isActive ? "#EDF4E8" : "#EAE7E0",
                            color: isActive ? "#2A5012" : "#6B6860",
                          }}
                        >
                          {status}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="px-6 py-5 border-b border-border">
                <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }} className="text-foreground text-xl">
                  {tr("form_title")}
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  {role === "picker" ? tr("form_subtitle_picker") : tr("form_subtitle_farmer")}
                </p>
              </div>

              {submitted ? (
                <div className="flex flex-col items-center justify-center py-16 px-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-primary" />
                  </div>
                  <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }} className="text-foreground text-xl mb-2">
                    {tr("form_success_title")}
                  </h3>
                  <p className="text-muted-foreground text-sm text-center">
                    {tr("form_success_sub")}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">{tr("form_label_category")}</label>
                    <div className="grid grid-cols-3 gap-2">
                      {cats.map((cat) => (
                        <button
                          type="button"
                          key={cat.id}
                          onClick={() => setForm({ ...form, category: cat.id })}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all ${
                            form.category === cat.id
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border bg-input-background text-foreground hover:border-primary/30"
                          }`}
                        >
                          <span>{cat.icon}</span>
                          <span className="truncate">{tr(cat.labelKey)}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">{tr("form_label_title")}</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder={role === "picker" ? tr("form_placeholder_title_picker") : tr("form_placeholder_title_farmer")}
                      className="w-full px-4 py-2.5 bg-input-background rounded-xl border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/30"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                      required
                    />
                  </div>

                  {/* Price + Unit */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">{tr("form_label_price")}</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                        <input
                          type="number"
                          step="0.50"
                          value={form.price}
                          onChange={(e) => setForm({ ...form, price: e.target.value })}
                          placeholder="0.00"
                          className="w-full pl-8 pr-4 py-2.5 bg-input-background rounded-xl border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/30"
                          style={{ fontFamily: "'Inter', sans-serif" }}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">{tr("form_label_unit")}</label>
                      <select
                        value={form.unit}
                        onChange={(e) => setForm({ ...form, unit: e.target.value })}
                        className="w-full px-4 py-2.5 bg-input-background rounded-xl border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/30 appearance-none"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                      >
                        <option value="kg">{tr("form_unit_kg")}</option>
                        <option value="L">{tr("form_unit_L")}</option>
                        <option value="h">{tr("form_unit_h")}</option>
                        <option value="day">{tr("form_unit_day")}</option>
                        <option value="lot">{tr("form_unit_lot")}</option>
                      </select>
                    </div>
                  </div>

                  {/* Volume */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      {role === "picker" ? tr("form_label_volume_picker") : tr("form_label_volume_farmer")}
                    </label>
                    <input
                      type="text"
                      value={form.volume}
                      onChange={(e) => setForm({ ...form, volume: e.target.value })}
                      placeholder={role === "picker" ? tr("form_placeholder_volume_picker") : tr("form_placeholder_volume_farmer")}
                      className="w-full px-4 py-2.5 bg-input-background rounded-xl border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/30"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    />
                  </div>

                  {/* Location */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">{tr("form_label_city")}</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="text"
                          value={form.location}
                          onChange={(e) => setForm({ ...form, location: e.target.value })}
                          placeholder={tr("form_placeholder_city")}
                          className="w-full pl-9 pr-4 py-2.5 bg-input-background rounded-xl border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/30"
                          style={{ fontFamily: "'Inter', sans-serif" }}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">{tr("form_label_region")}</label>
                      <select
                        value={form.region}
                        onChange={(e) => setForm({ ...form, region: e.target.value })}
                        className="w-full px-4 py-2.5 bg-input-background rounded-xl border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/30 appearance-none"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                      >
                        <option value="">{tr("form_placeholder_region")}</option>
                        {regions.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">{tr("form_label_description")}</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder={tr("form_placeholder_description")}
                      rows={3}
                      className="w-full px-4 py-2.5 bg-input-background rounded-xl border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/30 resize-none"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    />
                  </div>

                  {/* Photo upload */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">{tr("form_label_photos")}</label>
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={() => setDragOver(false)}
                      className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                        dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-secondary/30"
                      }`}
                    >
                      <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {tr("form_photo_drag")}{" "}
                        <span className="text-primary font-medium cursor-pointer hover:underline">{tr("form_photo_browse")}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{tr("form_photo_hint")}</p>
                    </div>
                  </div>

                  {/* Options */}
                  <div className="flex items-center gap-6">
                    {(["delivery", "shipping"] as const).map((opt) => (
                      <label key={opt} className="flex items-center gap-2 cursor-pointer">
                        <div
                          onClick={() => setForm({ ...form, [opt]: !form[opt] })}
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                            form[opt] ? "border-primary bg-primary" : "border-border bg-input-background"
                          }`}
                        >
                          {form[opt] && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                        <span className="text-sm text-foreground">
                          {opt === "delivery" ? tr("form_opt_delivery") : tr("form_opt_shipping")}
                        </span>
                      </label>
                    ))}
                  </div>

                  {/* Submit */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      {tr("form_btn_publish")}
                    </button>
                    <p className="text-center text-xs text-muted-foreground mt-3">
                      {tr("form_hint_publish")}
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

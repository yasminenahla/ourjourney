import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  LayoutDashboard, Wallet, Store, Plane, MapPinned, Users2, ClipboardCheck,
  ListChecks, PiggyBank, Plus, Trash2, Check, ChevronDown, ChevronRight,
  ExternalLink, RefreshCw, Sparkles, Waves, Home as HomeIcon, Calendar,
  ArrowRight, X, Pencil, Star, Menu, Palette, ImageOff, Gift,
} from "lucide-react";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "./lib/firebaseClient";

/* ===== p1_foundation.jsx ===== */
/* ============================================================
   DESIGN TOKENS
   Deep teal ground (Bosphorus / Nile at dusk) + warm brass gold
   (wedding jewellery, Egyptian) + dusty rose accent (honeymoon/
   bach-trip sections). Fraunces for display, Manrope for body/UI.
   ============================================================ */
const FONT_LINK_ID = "wt-fonts";
function useFonts() {
  useEffect(() => {
    if (document.getElementById(FONT_LINK_ID)) return;
    const link = document.createElement("link");
    link.id = FONT_LINK_ID;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Manrope:wght@400;500;600;700;800&display=swap";
    document.head.appendChild(link);
  }, []);
}

const MOBILE_STYLE_ID = "wt-mobile-style";
function useMobileSafety() {
  useEffect(() => {
    if (document.getElementById(MOBILE_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = MOBILE_STYLE_ID;
    style.textContent = `
      /* 16px minimum stops iOS Safari auto-zooming on focus */
      input, textarea, select { font-size: 16px; }
      @media (min-width: 640px) {
        input, textarea, select { font-size: inherit; }
      }
      * { -webkit-tap-highlight-color: transparent; }
      .wt-scroll { -webkit-overflow-scrolling: touch; scrollbar-width: thin; }
      button, a { touch-action: manipulation; }
      html, body, #root { height: 100%; }
    `;
    document.head.appendChild(style);
  }, []);
}

const T = {
  bg: "#FCF6EF",
  bgSoft: "#F7EADC",
  card: "#FFFFFF",
  cardHover: "#FFF9F1",
  line: "#EEDDCB",
  lineSoft: "#F3E7D8",
  ink: "#4A3B34",
  inkMute: "#8C7A6E",
  inkFaint: "#B8A99C",
  onAccent: "#4A3B34",
  gold: "#E3AD6E",
  goldSoft: "#F4DBB1",
  rose: "#F0A6A6",
  roseSoft: "#F8CFCF",
  sage: "#A3C79A",
  sky: "#A9C6E8",
  danger: "#E2685A",
};

const CATEGORY_META = {
  wedding: { label: "Wedding", color: T.gold, icon: Sparkles },
  bride: { label: "Bride Prep", color: T.roseSoft, icon: Users2 },
  groom: { label: "Groom Prep", color: T.sage, icon: Users2 },
  honeymoon: { label: "Honeymoon", color: T.sky, icon: Waves },
  bach: { label: "Bach Trips", color: T.rose, icon: Plane },
  household: { label: "Household", color: T.inkMute, icon: HomeIcon },
};

/* ============================================================
   STORAGE HOOK
   Every domain is shared (shared:true) so both partners see and
   edit the same live data. Backed by a Firestore document per key
   (collection "wt_shared"), with onSnapshot keeping every open
   tab/device in sync in real time as either of you edits.
   ============================================================ */
const SHARED_COLLECTION = "wt_shared";

function useShared(key, seed) {
  const [value, setValue] = useState(seed);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef(null);

  const load = useCallback(async () => {
    try {
      const snap = await getDoc(doc(db, SHARED_COLLECTION, key));
      if (snap.exists()) setValue(snap.data().value);
    } catch (e) {
      console.error(`Failed to refresh ${key}`, e);
    }
  }, [key]);

  useEffect(() => {
    const ref = doc(db, SHARED_COLLECTION, key);
    const unsubscribe = onSnapshot(
      ref,
      async (snap) => {
        if (snap.exists()) {
          setValue(snap.data().value);
        } else {
          try {
            await setDoc(ref, { value: seed, updatedAt: Date.now() });
          } catch (e) {
            console.error(`Failed to seed ${key}`, e);
          }
          setValue(seed);
        }
        setLoaded(true);
      },
      (e) => {
        console.error(`Live sync error for ${key}`, e);
        setLoaded(true);
      }
    );
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (updater) => {
      setValue((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          setDoc(doc(db, SHARED_COLLECTION, key), { value: next, updatedAt: Date.now() }).catch((e) => {
            console.error(`Failed to save ${key}`, e);
          });
        }, 350);
        return next;
      });
    },
    [key]
  );

  return [value, update, loaded, load];
}

/* ============================================================
   PRIMITIVES
   ============================================================ */
function fmtMoney(n, currency) {
  const num = Number(n) || 0;
  const sign = num < 0 ? "-" : "";
  const abs = Math.abs(num);
  const s = abs.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (currency === "EGP") return `${sign}${s} EGP`;
  if (currency === "GBP") return `${sign}£${s}`;
  return `${sign}$${s}`;
}

function Card({ children, className = "", accent }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{
        background: T.card,
        border: `1px solid ${T.lineSoft}`,
        borderTop: accent ? `2px solid ${accent}` : `1px solid ${T.lineSoft}`,
      }}
    >
      {children}
    </div>
  );
}

function SectionHeading({ eyebrow, title, right }) {
  return (
    <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
      <div>
        {eyebrow && (
          <div
            className="text-xs tracking-[0.18em] uppercase font-semibold mb-1"
            style={{ color: T.gold, fontFamily: "Manrope, sans-serif" }}
          >
            {eyebrow}
          </div>
        )}
        <h2
          className="text-2xl sm:text-3xl"
          style={{ color: T.ink, fontFamily: "Fraunces, serif", fontWeight: 600 }}
        >
          {title}
        </h2>
      </div>
      {right}
    </div>
  );
}

function EditableText({ value, onChange, className = "", placeholder, multiline }) {
  const Comp = multiline ? "textarea" : "input";
  return (
    <Comp
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      rows={multiline ? 2 : undefined}
      className={`bg-transparent outline-none w-full placeholder:opacity-40 focus:bg-black/5 rounded px-1 -mx-1 transition-colors ${className}`}
      style={{ color: T.ink, fontFamily: "Manrope, sans-serif" }}
    />
  );
}

function EditableNumber({ value, onChange, className = "", currency }) {
  return (
    <input
      type="number"
      value={value === 0 ? 0 : value || ""}
      onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      className={`bg-transparent outline-none text-right focus:bg-black/5 rounded px-1 -mx-1 transition-colors ${className}`}
      style={{ color: T.ink, fontFamily: "Manrope, sans-serif", fontVariantNumeric: "tabular-nums" }}
    />
  );
}

function IconBtn({ onClick, children, title, danger }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="rounded-lg p-2 -m-0.5 transition-colors hover:bg-black/10 active:bg-black/15 shrink-0 min-w-[32px] min-h-[32px] flex items-center justify-center"
      style={{ color: danger ? T.danger : T.inkMute }}
    >
      {children}
    </button>
  );
}

function Pill({ children, color }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: `${color}22`, color: color, fontFamily: "Manrope, sans-serif" }}
    >
      {children}
    </span>
  );
}

function MobileField({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-[11px] uppercase tracking-wide shrink-0" style={{ color: T.inkFaint, fontFamily: "Manrope, sans-serif" }}>
        {label}
      </span>
      <div className="text-right min-w-0 flex-1">{children}</div>
    </div>
  );
}


/* ===== p2_seed.jsx ===== */
/* ============================================================
   SEED DATA
   Everything already established for this wedding: dates, the
   full Wedding Budget, Vendor Directory, both Honeymoon Budgets
   and itineraries, the two Bach Trips plus the 19-listing Airbnb
   comparison, a starter to-do list per category, the Booking
   Tracker, and the monthly household+wedding budget carried over
   from the couple's own Google Sheet.
   ============================================================ */

const KEY_DATES_SEED = {
  katbKetab: "2027-03-20",
  wedding: "2027-04-03",
  honeymoonStart: "2027-04-04",
  honeymoonEnd: "2027-04-16",
  bachGroomStart: "2027-03-11",
  bachGroomEnd: "2027-03-14",
  bachBrideStart: "2026-12-24",
  bachBrideEnd: "2026-12-27",
};

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

/* ---------------- Wedding Budget ---------------- */
const WEDDING_BUDGET_SEED = {
  guests: 350,
  perGuestCatering: 4000,
  perGuestFavor: 200,
  core: [
    { id: uid("wb"), category: "Venue", item: "Garden/palace venue rental (~350 guests)", qty: 1, unit: 300000, actual: 0, notes: "See Vendor Directory - outdoor venue options" },
    { id: uid("wb"), category: "Catering", item: "Per-guest catering (guests x per-guest cost)", qty: null, unit: null, actual: 0, notes: "Uses guest count and per-guest cost below", formula: "catering" },
    { id: uid("wb"), category: "Wedding planner", item: "Full planning package", qty: 1, unit: 250000, actual: 0, notes: "See Vendor Directory - event planners" },
    { id: uid("wb"), category: "Photography & video", item: "Full-day photo + video package", qty: 1, unit: 180000, actual: 0, notes: "See Vendor Directory - photographers" },
    { id: uid("wb"), category: "Entertainment", item: "Zaffa troupe", qty: 1, unit: 40000, actual: 0, notes: "Traditional Domiaty or modern fusion style" },
    { id: uid("wb"), category: "Entertainment", item: "Live band / DJ for reception", qty: 1, unit: 130000, actual: 0, notes: "See Vendor Directory - DJs" },
    { id: uid("wb"), category: "Entertainment", item: "Tanoura (whirling) dancer add-on", qty: 1, unit: 7000, actual: 0, notes: "" },
    { id: uid("wb"), category: "Florals & decor", item: "Kosha, stage, centerpieces, aisle", qty: 1, unit: 350000, actual: 0, notes: "" },
    { id: uid("wb"), category: "Bridal attire", item: "Bridal dress (couture, incl. fabric)", qty: 1, unit: 150000, actual: 0, notes: "" },
    { id: uid("wb"), category: "Bridal attire", item: "Groom's suit (tailored)", qty: 1, unit: 125000, actual: 0, notes: "" },
    { id: uid("wb"), category: "Beauty", item: "Bridal hair & makeup (trial + day-of)", qty: 1, unit: 35000, actual: 0, notes: "" },
    { id: uid("wb"), category: "Cake", item: "Wedding cake", qty: 1, unit: 30000, actual: 0, notes: "" },
    { id: uid("wb"), category: "Transportation", item: "Couple's car + guest shuttle", qty: 1, unit: 35000, actual: 0, notes: "" },
    { id: uid("wb"), category: "Stationery", item: "Invitations & stationery", qty: 1, unit: 30000, actual: 0, notes: "" },
    { id: uid("wb"), category: "Favors", item: "Guest favors / giveaways (guests x per-guest cost)", qty: null, unit: null, actual: 0, notes: "Uses guest count and per-guest favor cost below", formula: "favors" },
  ],
  preWedding: [
    { id: uid("pw"), category: "Katb Ketab", item: "Venue + officiant + light catering, 30-60 guests", qty: 1, unit: 60000, actual: 0, notes: "Sat, Mar 20, 2027 - just after Eid al-Fitr" },
    { id: uid("pw"), category: "Bachelorette trip", item: "Bride's personal share", qty: 1, unit: 25000, actual: 0, notes: "See Bach Trips tab" },
    { id: uid("pw"), category: "Bachelor trip", item: "Groom's personal share", qty: 1, unit: 25000, actual: 0, notes: "See Bach Trips tab" },
  ],
};

/* ---------------- Vendor Directory ---------------- */
const VENDOR_DIRECTORY_SEED = {
  planners: [
    { id: uid("v"), name: "The Bridal Atelier", style: "Luxurious, classic-modern, high-end full production", price: "EGP 250,000-400,000+", notes: "Works with top-tier florists, photographers, caterers", status: "" },
    { id: uid("v"), name: "Ahmed Yassin Wedding Planner", style: "A-list/celebrity clientele, opulent large-scale productions", price: "EGP 300,000-600,000+", notes: "High-profile Cairo weddings", status: "" },
    { id: uid("v"), name: "Design Avenue Events (Nada Yousri)", style: "Stylish, trendsetting, modern-to-elaborate", price: "EGP 200,000-350,000", notes: "Innovative, personality-driven design", status: "" },
    { id: uid("v"), name: "Septem Event Services", style: "New Cairo, guest-experience focus", price: "EGP 200,000-350,000", notes: "Manial Palace/St. Regis-tier venue experience", status: "" },
    { id: uid("v"), name: "Tailor'd (Nermin / Samir Elsayed)", style: "Boutique bespoke, Cairo + Dubai", price: "EGP 200,000-400,000", notes: "Strong for international/destination couples", status: "" },
    { id: uid("v"), name: "My Wedding Planner Egypt", style: "Full-service, strong for overseas guests", price: "EGP 180,000-300,000", notes: "Handles visas/travel logistics", status: "" },
    { id: uid("v"), name: "Bride Club Egypt", style: "Well-known, full planning to day-of coordination", price: "EGP 150,000-300,000", notes: "Flexible package tiers", status: "" },
    { id: uid("v"), name: "Eventa", style: "Creative/thematic, high-end venue coordination", price: "EGP 180,000-300,000", notes: "Classical-to-modern theme range", status: "" },
  ],
  venues: [
    { id: uid("v"), name: "Katameya Heights Club House", style: "New Cairo golf club, luxury outdoor", price: "Open buffet from EGP 640/pp + venue fee", notes: "Ring Road, 5th District", status: "" },
    { id: uid("v"), name: "Arabella Country Club", style: "New Cairo, prestige, in-house planners", price: "Open buffet from EGP 750/pp + venue fee", notes: "3rd New Cairo", status: "" },
    { id: uid("v"), name: "The Westin Katameya Dunes", style: "5-star golf resort gardens", price: "Premium - request quote", notes: "New Cairo", status: "" },
    { id: uid("v"), name: "Marriott Mena House - 139 Pavilion Gardens", style: "Pyramid views, up to 3,000 guests", price: "Premium - request quote", notes: "Giza", status: "" },
    { id: uid("v"), name: "Royal Maxim Palace Kempinski", style: "Palace-style luxury outdoor", price: "Premium - request quote", notes: "New Cairo", status: "" },
    { id: uid("v"), name: "Bayt Al Mansoureya", style: "Boho-chic countryside estate", price: "EGP 120,000-160,000 rental only", notes: "Books ~1yr ahead; confirm capacity", status: "" },
    { id: uid("v"), name: "Nut Boutique Farm Lodge", style: "Rustic-luxury, art-filled garden", price: "Rental only - request quote", notes: "Fits ~40-350 guests", status: "" },
    { id: uid("v"), name: "Nile Ritz-Carlton, Garden City lawn", style: "Nile-view, up to 1,000 guests", price: "Premium - request quote", notes: "Downtown/Garden City", status: "" },
    { id: uid("v"), name: "The Vie", style: "Contemporary/sleek, lush gardens, up to 1,500", price: "Premium - request quote", notes: "Al Wahat Road, 6th October", status: "" },
    { id: uid("v"), name: "Golf City Club", style: "Golf-course backdrop, garden/poolside", price: "~EGP 250/pp (older listing)", notes: "Same road as The Vie", status: "" },
    { id: uid("v"), name: "Ruya Club", style: "35-acre purpose-built club", price: "Request quote", notes: "Sheikh Zayed/6th October", status: "" },
    { id: uid("v"), name: "Kayan", style: "Garden + pool, full-service", price: "Competitive - request quote", notes: "Sheikh Zayed", status: "" },
    { id: uid("v"), name: "Diamond Villa / C'est La Vie Villa", style: "Greenery + water features", price: "Budget-friendlier", notes: "Dream Land City / 6th October", status: "" },
    { id: uid("v"), name: "The Venue", style: "Modern/contemporary, indoor+outdoor, all-in packages", price: "Request quote", notes: "New Cairo; closest style match to The Vie; up to ~350", status: "" },
    { id: uid("v"), name: "Sky Executive Resort", style: "Lush, customizable decor", price: "Request quote", notes: "90th Street, New Cairo", status: "" },
    { id: uid("v"), name: "Aile Sarayi", style: "Fairy-tale open-air elegance", price: "Request quote", notes: "Orabi, Cairo-Ismailia Road", status: "" },
    { id: uid("v"), name: "Plein Air", style: "Garden-based, boutique feel", price: "Request quote", notes: "Orabi, Km 28 Cairo-Ismailia Rd", status: "" },
    { id: uid("v"), name: "The Grove Venue", style: "Indoor hall, capacity ~400", price: "Request quote", notes: "Madinaty, Suez Rd Km 34", status: "" },
    { id: uid("v"), name: "Rainbow Villa", style: "1,500 sqm garden, up to 500", price: "~EGP 12,700 fixed + ~150/pp food", notes: "Madinaty; leans budget not upscale", status: "" },
  ],
  djs: [
    { id: uid("v"), name: "DJ KIMO (EGY)", style: "Top-tier Egyptian wedding DJ", price: "Contact for quote", notes: "Via Soul Artists", status: "" },
    { id: uid("v"), name: "DJ Feedo", style: "#1 R&B/hip-hop DJ in Egypt", price: "Contact for quote", notes: "Younger, international-leaning crowd", status: "" },
    { id: uid("v"), name: "DJ Sharkawy", style: "Oriental/Egyptian soul fusion", price: "Contact for quote", notes: "Nightclub-to-wedding crossover", status: "" },
    { id: uid("v"), name: "Pablo Senbawy", style: "Versatile top-tier talent", price: "Contact for quote", notes: "Via Soul Artists", status: "" },
    { id: uid("v"), name: "International touring DJ", style: "UK/Europe acts flown in", price: "~$1,750+ avg incl. travel", notes: "Status marker at high-end weddings", status: "" },
  ],
  photographers: [
    { id: uid("v"), name: "Bullseye Studio (Karim Roushdy)", style: "Emotive, top-tier reputation", price: "EGP 80,000-150,000+", notes: "Confirm current package directly", status: "" },
    { id: uid("v"), name: "Splash Wedding Studios", style: "\"Mega Package\": album + videos", price: "Contact for quote", notes: "Cairo, Alexandria, Sharm El Sheikh", status: "" },
    { id: uid("v"), name: "Mo'men Esmat", style: "20+ yrs, creative storytelling", price: "Contact for quote", notes: "", status: "" },
    { id: uid("v"), name: "Osama Momtaz", style: "Established, high-volume premium", price: "Contact for quote", notes: "", status: "" },
    { id: uid("v"), name: "Ahmed Saleh", style: "Premium positioning", price: "Contact for quote", notes: "", status: "" },
    { id: uid("v"), name: "Andy Gabra", style: "Stylish, modern coverage", price: "Contact for quote", notes: "", status: "" },
  ],
};

/* ---------------- Inspiration Board ---------------- */
function inspoCat(name) {
  return { id: uid("cat"), name, items: [] };
}

const INSPIRATION_SEED = {
  categories: [
    inspoCat("Wedding Decor & Color Palette"),
    inspoCat("Bridal & Groom Attire"),
    inspoCat("Furniture & Home"),
    inspoCat("Honeymoon Style"),
    inspoCat("Bach Trip Vibes"),
  ],
};


/* ===== p3_seed_honeymoon.jsx ===== */
/* ---------------- Honeymoon Budgets ---------------- */
function hmRow(category, item, qty, unit) {
  return { id: uid("hm"), category, item, qty, unit, actual: 0 };
}

const HONEYMOON_BUDGET_A_SEED = {
  label: "Option A - Upscale",
  rows: [
    hmRow("Flights", "Cairo -> Zanzibar (2 pax, one-way)", 2, 630),
    hmRow("Flights", "Zanzibar -> Seychelles (2 pax, via Nairobi)", 2, 920),
    hmRow("Flights", "Seychelles -> Cairo (2 pax, one-way)", 2, 580),
    hmRow("Zanzibar accommodation", "Upscale beach resort, Nungwi/Kendwa (per night)", 5, 350),
    hmRow("Seychelles accommodation", "Upscale resort, Mahe - Beau Vallon (per night)", 4, 620),
    hmRow("Seychelles accommodation", "Praslin/La Digue boutique stay (per night)", 2, 550),
    hmRow("Zanzibar activities", "Mnemba Island snorkeling + dolphin tour", 1, 200),
    hmRow("Zanzibar activities", "Spice farm tour + Jozani Forest", 1, 70),
    hmRow("Zanzibar activities", "Stone Town + Prison Island", 1, 80),
    hmRow("Zanzibar activities", "Sunset dhow cruise", 1, 90),
    hmRow("Seychelles activities", "Praslin day trip - Anse Lazio + Vallee de Mai", 1, 170),
    hmRow("Seychelles activities", "La Digue day trip - Anse Source d'Argent", 1, 160),
    hmRow("Seychelles activities", "Snorkeling / boat excursion, Mahe", 1, 135),
    hmRow("Transport", "Airport transfers, both islands", 1, 140),
    hmRow("Transport", "Inter-island ferries (Praslin <-> La Digue)", 1, 70),
    hmRow("Visas", "Tanzania/Zanzibar eVisa (2 pax)", 2, 50),
    hmRow("Visas", "Seychelles Travel Authorization (2 pax)", 2, 15),
    hmRow("Insurance", "Comprehensive travel insurance (2 pax)", 1, 150),
    hmRow("Food & drinks", "Meals/drinks beyond half-board (per day)", 13, 70),
    hmRow("Misc", "Souvenirs, spa, tips, incidentals", 1, 400),
  ],
};

const HONEYMOON_BUDGET_B_SEED = {
  label: "Option B - Budget-friendly",
  rows: [
    hmRow("Flights", "Cairo -> Zanzibar (2 pax, one-way)", 2, 570),
    hmRow("Flights", "Zanzibar -> Seychelles (2 pax, via Nairobi)", 2, 860),
    hmRow("Flights", "Seychelles -> Cairo (2 pax, one-way)", 2, 520),
    hmRow("Zanzibar accommodation", "Midscale beach resort, Nungwi/Kendwa (per night)", 7, 130),
    hmRow("Seychelles accommodation", "Mid-upscale, Mahe - Beau Vallon (per night)", 3, 310),
    hmRow("Zanzibar activities", "Mnemba Island snorkeling + dolphin tour", 1, 165),
    hmRow("Zanzibar activities", "Spice farm tour + Jozani Forest", 1, 65),
    hmRow("Zanzibar activities", "Stone Town + Prison Island", 1, 78),
    hmRow("Seychelles activities", "Praslin day trip - Anse Lazio + Vallee de Mai", 1, 165),
    hmRow("Seychelles activities", "La Digue day trip - Anse Source d'Argent", 1, 155),
    hmRow("Transport", "Airport transfers, both islands", 1, 115),
    hmRow("Transport", "Ferries (Praslin <-> La Digue)", 1, 55),
    hmRow("Visas", "Tanzania/Zanzibar eVisa (2 pax)", 2, 50),
    hmRow("Visas", "Seychelles Travel Authorization (2 pax)", 2, 15),
    hmRow("Insurance", "Comprehensive travel insurance (2 pax)", 1, 145),
    hmRow("Food & drinks", "Meals/drinks beyond half-board (per day)", 13, 58),
    hmRow("Misc", "Souvenirs, tips, incidentals", 1, 380),
  ],
};

/* ---------------- Honeymoon Itineraries ---------------- */
function itRow(day, date, location, plan, est) {
  return { id: uid("it"), day, date, location, plan, est, actual: 0 };
}

const ITINERARY_A_SEED = [
  itRow(1, "Sun, Apr 4, 2027", "Cairo -> Zanzibar", "Fly out (connecting via Addis Ababa/Dubai/Doha); arrive and transfer to resort", 0),
  itRow(2, "Mon, Apr 5, 2027", "Nungwi / Kendwa, Zanzibar", "Arrival day - settle in, sunset on the beach", 80),
  itRow(3, "Tue, Apr 6, 2027", "Nungwi / Kendwa, Zanzibar", "Beach day - swim, relax, optional water sports", 60),
  itRow(4, "Wed, Apr 7, 2027", "Mnemba Island, Zanzibar", "Mnemba Island snorkeling + dolphin tour, sunset dhow cruise", 180),
  itRow(5, "Thu, Apr 8, 2027", "Stone Town, Zanzibar", "Stone Town walking tour + Prison Island (Changuu)", 90),
  itRow(6, "Fri, Apr 9, 2027", "Jozani Forest / Spice farm, Zanzibar", "Spice farm tour + Jozani Forest red colobus monkeys", 80),
  itRow(7, "Sat, Apr 10, 2027", "Zanzibar -> Seychelles", "Transfer to airport, fly to Mahe via Nairobi (long travel day)", 40),
  itRow(8, "Sun, Apr 11, 2027", "Mahe, Seychelles", "Arrive, transfer to Beau Vallon resort, rest and settle in", 60),
  itRow(9, "Mon, Apr 12, 2027", "Beau Vallon / Victoria, Mahe", "Beach day at Beau Vallon + stroll through Victoria", 90),
  itRow(10, "Tue, Apr 13, 2027", "Praslin, Seychelles", "Day trip: ferry to Praslin, Anse Lazio beach, Vallee de Mai", 150),
  itRow(11, "Wed, Apr 14, 2027", "La Digue, Seychelles", "Day trip: ferry to La Digue, bike to Anse Source d'Argent", 140),
  itRow(12, "Thu, Apr 15, 2027", "Mahe, Seychelles", "Free day - spa, snorkeling, or just the beach; pack", 100),
  itRow(13, "Fri, Apr 16, 2027", "Seychelles -> Cairo", "Fly home via Abu Dhabi/Doha/Addis Ababa (long travel day)", 40),
];

const ITINERARY_B_SEED = [
  itRow(1, "Sun, Apr 4, 2027", "Cairo -> Zanzibar", "Fly out (connecting via Addis Ababa/Dubai/Doha); arrive and transfer to resort", 0),
  itRow(2, "Mon, Apr 5, 2027", "Nungwi / Kendwa, Zanzibar", "Arrival day - settle in, sunset on the beach", 60),
  itRow(3, "Tue, Apr 6, 2027", "Nungwi / Kendwa, Zanzibar", "Beach day - swim, relax, optional water sports", 50),
  itRow(4, "Wed, Apr 7, 2027", "Mnemba Island, Zanzibar", "Mnemba Island snorkeling + dolphin tour, sunset dhow cruise", 150),
  itRow(5, "Thu, Apr 8, 2027", "Stone Town, Zanzibar", "Stone Town walking tour + Prison Island (Changuu)", 70),
  itRow(6, "Fri, Apr 9, 2027", "Jozani Forest / Spice farm, Zanzibar", "Spice farm tour + Jozani Forest red colobus monkeys", 60),
  itRow(7, "Sat, Apr 10, 2027", "Nungwi / Kendwa, Zanzibar", "Free beach day - no paid activity, just the beach", 30),
  itRow(8, "Sun, Apr 11, 2027", "Nungwi / Kendwa, Zanzibar", "Free beach day - relax, pack up", 30),
  itRow(9, "Mon, Apr 12, 2027", "Zanzibar -> Seychelles", "Transfer to airport, fly to Mahe via Nairobi (long travel day)", 40),
  itRow(10, "Tue, Apr 13, 2027", "Beau Vallon / Mahe, Seychelles", "Arrive, transfer to Beau Vallon resort, settle in", 60),
  itRow(11, "Wed, Apr 14, 2027", "Praslin, Seychelles", "Day trip: ferry to Praslin, Anse Lazio beach, Vallee de Mai", 150),
  itRow(12, "Thu, Apr 15, 2027", "La Digue, Seychelles", "Day trip: ferry to La Digue (or skip, relax on Mahe to save ~$140)", 140),
  itRow(13, "Fri, Apr 16, 2027", "Seychelles -> Cairo", "Fly home via Abu Dhabi/Doha/Addis Ababa (long travel day)", 40),
];


/* ===== p4_seed_bach.jsx ===== */
function budRow(category, item, qty, unit, perPerson) {
  return { id: uid("bg"), category, item, qty, unit, actual: 0, perPerson: !!perPerson };
}
function planRow(day, date, plan) {
  return { id: uid("pl"), day, date, plan };
}

const BACH_GROOMSMEN_SEED = {
  destination: "Sharm El Sheikh, Egypt",
  dates: "Thu, Mar 11 - Sun, Mar 14, 2027 (4 days / 3 nights)",
  groupSize: 4,
  groupNote: "incl. groom",
  timingNote:
    "Lands right after Eid al-Fitr (~Mar 9-11, exact date depends on moon sighting) and about a week before the Mar 20 Katb Ketab.",
  options: [
    { id: uid("bo"), name: "Sharm El Sheikh (recommended)", vibe: "Diving hub with real nightlife - Naama Bay bars, Ras Mohammed and Tiran dive sites", why: "Best-rounded pick: diving by day, real nightlife by night, easiest logistics", cost: "~EGP 16,500" },
    { id: uid("bo"), name: "Soma Bay", vibe: "Upscale, self-contained resort peninsula - golf, kitesurfing, spas", why: "Best if the group wants quiet, polished resort relaxation over a lively town", cost: "~EGP 18,500" },
    { id: uid("bo"), name: "Dahab", vibe: "Laid-back diving town - Blue Hole, Canyon, beach camps", why: "Budget/rustic option: cheaper, more unplugged, thinner on nightlife", cost: "~EGP 15,000" },
  ],
  plan: [
    planRow(1, "Thu, Mar 11, 2027", "Fly Cairo -> Sharm El Sheikh, check into a Naama Bay hotel, evening at a beachfront restaurant/shisha lounge"),
    planRow(2, "Fri, Mar 12, 2027", "Boat trip to Ras Mohammed National Park or Tiran Island for diving/snorkeling, evening out in Naama Bay's bars"),
    planRow(3, "Sat, Mar 13, 2027", "Desert safari + quad biking, Bedouin dinner under the stars"),
    planRow(4, "Sun, Mar 14, 2027", "Relaxed morning at the hotel beach or a final snorkel, fly back to Cairo"),
  ],
  budget: [
    budRow("Flights", "Cairo -> Sharm El Sheikh round trip (per person)", 4, 6000, true),
    budRow("Accommodation", "Resort hotel, Naama Bay, 3 nights (2 rooms)", 3, 4000),
    budRow("Activities", "Diving/snorkeling boat trip, Ras Mohammed or Tiran (per person)", 4, 1800, true),
    budRow("Activities", "Desert safari + quad biking + Bedouin dinner (per person)", 4, 1800, true),
    budRow("Nightlife", "Bars, shisha lounges, one night out (group)", 1, 4000),
    budRow("Food & drinks", "Meals and drinks (per day, group)", 4, 2200),
    budRow("Misc", "Tips, incidentals", 1, 3000),
  ],
  currency: "EGP",
};

const BACH_BRIDESMAIDS_SEED = {
  destination: "Istanbul, Turkey",
  dates: "Thu, Dec 24 - Sun, Dec 27, 2026 (4 days / 3 nights)",
  groupSize: 8,
  groupNote: "confirmed",
  timingNote:
    "Christmas/NY inflates beach and ski destinations hardest; Istanbul's markup is much gentler. December is cool there (highs ~12C/54F) and can be rainy - pack warm layers.",
  options: [
    { id: uid("bo"), name: "El Gouna, Egypt (local)", vibe: "Boutique lagoon town - beach clubs, spa, marina strolls", why: "Safest, cheapest: no flight/visa hassle, still lovely in December", cost: "~EGP 14,000" },
    { id: uid("bo"), name: "Istanbul, Turkey (recommended)", vibe: "City energy - Bosphorus, shopping, hammam, food scene", why: "Well-trodden international pick with a gentle Christmas/NY markup", cost: "~$730" },
    { id: uid("bo"), name: "Marrakech, Morocco", vibe: "Medina souks, Atlas Mountains day trips, riad courtyards", why: "Good alternative for souks and mountains over a big city", cost: "~$650-750" },
  ],
  plan: [
    planRow(1, "Thu, Dec 24, 2026", "Fly Cairo -> Istanbul, check into the group's apartment, evening stroll and dinner with a Bosphorus view"),
    planRow(2, "Fri, Dec 25, 2026", "Sultanahmet - Hagia Sophia, Blue Mosque, Topkapi Palace - Grand Bazaar shopping, evening hammam spa"),
    planRow(3, "Sat, Dec 26, 2026", "Bosphorus cruise, wander Ortakoy, evening on Istiklal Street with a rooftop dinner in Beyoglu"),
    planRow(4, "Sun, Dec 27, 2026", "Leisurely morning at the Spice Bazaar, fly back to Cairo"),
  ],
  budget: [
    budRow("Flights", "Cairo -> Istanbul round trip (per person)", 8, 250, true),
    budRow("Accommodation", "Airbnb - Big Flat 5 Rooms, Taksim, 4 nights (whole group)", 1, 984),
    budRow("Activities", "Bosphorus cruise (per person)", 8, 30, true),
    budRow("Activities", "Hammam spa experience (per person)", 8, 60, true),
    budRow("Activities", "Topkapi Palace + museum pass (per person)", 8, 40, true),
    budRow("Food & drinks", "Meals and drinks (per day, group of 8)", 4, 150),
    budRow("Transport", "Local transport - taxis/metro (group)", 1, 150),
    budRow("Misc", "Shopping, tips, incidentals", 1, 400),
  ],
  currency: "USD",
};

/* ---------------- Gifts (groomsmen / bridesmaids gift boxes) ---------------- */
const GIFTS_GROOMSMEN_SEED = {
  budgetPerPerson: 0,
  groupSize: 4,
  items: [],
};

const GIFTS_BRIDESMAIDS_SEED = {
  budgetPerPerson: 0,
  groupSize: 8,
  items: [],
};

/* ---------------- Istanbul Airbnb comparison (19 listings) ---------------- */
function abRow(name, area, size, rating, eur, usd, usdpp, note, url, pool, pick) {
  return { id: uid("ab"), name, area, size, rating, eur, usd, usdpp, note, url, pool, pick };
}

const BACH_AIRBNB_OPTIONS_SEED = [
  abRow("Big Flat 5 Rooms", "Taksim/Beyoglu", "4BR/2BA (10)", "4.7 (71)", 841, 984, 123, "TOP VALUE: proven, 3 min walk to Taksim Sq", "https://www.airbnb.co.uk/rooms/1194042289272543465", "No pool.", true),
  abRow("Urban Paradise", "Galata", "4BR/2BA (9)", "4.92 (50), Guest Fav", 1232, 1441, 180, "TOP LOCATION: 1 min to Istiklal, 2 min to Galata Tower", "https://www.airbnb.co.uk/rooms/1386782603177759699", "No pool (hamam-style bathroom instead).", true),
  abRow("Teo Apartment (Complete house)", "Sultanahmet", "5BR/5BA (10)", "4.89 (37), Guest Fav", 1347, 1576, 197, "WOW-FACTOR: steps from Hagia Sophia/Blue Mosque, daily housekeeping + airport shuttle", "https://www.airbnb.co.uk/rooms/701574129297492581", "No pool.", true),
  abRow("BayMari Suites", "Florya/Bakirkoy", "3BR/2BA (8)", "4.81 (184)", 834, 976, 122, "Most-reviewed of all 19 - very proven, ~35 min from Taksim", "https://www.airbnb.co.uk/rooms/52782711", "Has a pool (shared, on-site).", false),
  abRow("Detached Triplex", "Balat/Fatih", "4BR/2.5BA (9)", "4.56 (36)", 936, 1095, 137, "Solid, private, free parking", "https://www.airbnb.co.uk/rooms/1425381447648807634", "No pool.", false),
  abRow("Triplex Villa in Nature", "Beykoz", "5BR/2.5BA (8)", "5.0 (20), Guest Fav", 1032, 1207, 151, "Secluded, tennis - 30 min from center, car needed", "https://www.airbnb.co.uk/rooms/1455623339577667411", "Private pool, but seasonal - closed in December.", false),
  abRow("Bosphorus View 3BR", "Karakoy area", "3BR/2BA (8)", "4.62 (34)", 1043, 1220, 153, "Airbnb flags this one in its bottom 10% by rating/reliability", "https://www.airbnb.co.uk/rooms/1432585049509379034", "No pool.", false),
  abRow("Four Bedrooms Apt", "Karakoy/Fatih", "4BR/4BA (8)", "4.7 (30)", 1110, 1299, 162, "4 full bathrooms, walk to Galata Tower", "https://www.airbnb.co.uk/rooms/1465089820422732830", "No pool.", false),
  abRow("Galadoo Suites 5", "Fatih/Beyoglu", "4BR/2BA (8)", "4.83 (12), Guest Fav", 1120, 1310, 164, "Strict 10pm-9am quiet hours, no parties", "https://www.airbnb.co.uk/rooms/1666523853301020778", "No pool.", false),
  abRow("BosphorusEye Duplex", "Uskudar", "3BR/1BA (8)", "4.54 (52)", 1133, 1326, 166, "~210 steps, no lift - real problem for a group with luggage", "https://www.airbnb.co.uk/rooms/1330427382522223579", "No pool (has a hot tub instead).", false),
  abRow("Spacious 4BR Moda", "Kadikoy (Asian side)", "4BR/1.5BA (10)", "5.0 (4 reviews)", 1182, 1383, 173, "Across the water from most sights; few reviews", "https://www.airbnb.co.uk/rooms/1659426657289431480", "No pool.", false),
  abRow("5BR Historic Mansion", "Balat", "5BR/3BA (12)", "5.0 (4 reviews)", 1285, 1504, 188, "Charming but unproven", "https://www.airbnb.co.uk/rooms/1658676096875748164", "No pool.", false),
  abRow("Timeless House", "Balat", "6BR/2.5BA (12)", "5.0 (16), Top 5%", 1437, 1681, 210, "Sea view terrace, well reviewed", "https://www.airbnb.co.uk/rooms/1565517660868124940", "No pool.", false),
  abRow("Villa Elegance", "Kadilli, Kocaeli", "5BR/3.5BA (12)", "4.83 (29)", 1454, 1701, 213, "Different city entirely, not Istanbul - factor in transfer time", "https://www.airbnb.co.uk/rooms/930208010289027331", "Has a pool - one of the few in the area with one.", false),
  abRow("Memoria Panorama", "Balat", "5BR/3BA (10)", "5.0 (21), Top 5%", 1480, 1732, 216, "Golden Horn/Galata Tower view", "https://www.airbnb.co.uk/rooms/1509509334879764512", "No pool.", false),
  abRow("Rum_Otto", "Taksim", "6BR/7BA (14)", "5.0 (11)", 1557, 1822, 228, "Private jacuzzi, luxury positioning", "https://www.airbnb.co.uk/rooms/1035341417466821339", "No pool (has a private jacuzzi instead).", false),
  abRow("Sea Side Modern Flat", "Karakoy", "4BR/2BA (10)", "New (1 review)", 803, 940, 117, "Cheap but unproven - risk for a locked-in booking", "https://www.airbnb.co.uk/rooms/1728443083171571799", "No pool.", false),
  abRow("Comfort Apt Sisli", "Sisli", "3BR/2BA (8)", "New (no reviews)", 603, 706, 88, "Cheapest, but zero reviews - risk", "https://www.airbnb.co.uk/rooms/1745866998016903016", "Has an indoor pool + sauna.", false),
  abRow("Cloud Nine by Alara", "Beylikduzu", "6BR/4.5BA (15)", "5.0 (13), Guest Fav", 2494, 2919, 365, "Most expensive by far; far suburb; pool closed for winter", "https://www.airbnb.co.uk/rooms/1397714506946025860", "Private pool, but seasonal - closed in December (Apr 15-Sep 30 only).", false),
];


/* ===== p5_seed_todos_budget.jsx ===== */
function todo(text, when, deadline) {
  return { id: uid("td"), text, when: when || "", deadline: deadline || "", done: false };
}

const TODOS_SEED = {
  wedding: [
    todo("Lock venue + date", "Now - 2 weeks"),
    todo("Book wedding planner", "Now - 2 weeks"),
    todo("Book photographer/videographer", "Month 1"),
    todo("Book band/DJ + Zaffa troupe", "Month 1"),
    todo("Book caterer (if not venue-bundled)", "Month 1"),
    todo("Send save-the-dates", "Month 1"),
    todo("Order invitations", "Month 2"),
    todo("Book florist/decor", "Month 2"),
    todo("Book hair & makeup artist + trial", "Month 2"),
    todo("Finalize menu tasting", "Month 3"),
    todo("Book transportation", "Month 3"),
    todo("Order favors", "Month 3"),
    todo("Send formal invitations", "Month 4"),
    todo("Confirm final guest list", "Month 4"),
    todo("Confirm all vendor contracts/timelines", "Final month"),
    todo("Rehearsal with planner", "Final month"),
    todo("Final headcount to caterer", "Week of wedding"),
    todo("Beauty trial touch-up", "Week of wedding"),
    todo("Delegate a day-of point-person", "Week of wedding"),
  ],
  bride: [
    todo("Start dress shopping / first fittings", "4-5 months out"),
    todo("Book hair & makeup trial date", "4-5 months out"),
    todo("Finalize dress, second fitting", "3 months out"),
    todo("Book henna artist for Laylet El Henna", "3 months out"),
    todo("Henna design consult", "6-8 weeks out"),
    todo("Final dress fitting", "3-4 weeks out"),
    todo("Hair & makeup trial run-through", "3-4 weeks out"),
    todo("Pick up dress, pack for honeymoon", "Final week"),
    todo("Finalize & order bridesmaids' gift boxes", "Final month"),
  ],
  groom: [
    todo("Start suit shopping / tailor consultations", "4-5 months out"),
    todo("Finalize suit, second fitting", "3 months out"),
    todo("Book barber for wedding week", "3 months out"),
    todo("Finalize shoes/accessories", "6-8 weeks out"),
    todo("Final suit fitting", "3-4 weeks out"),
    todo("Confirm groomsmen attire", "3-4 weeks out"),
    todo("Confirm vendor timelines with planner", "Final week"),
    todo("Pack for honeymoon", "Final week"),
    todo("Finalize & order groomsmen's gift boxes", "Final month"),
  ],
  honeymoon: [
    todo("Book honeymoon flights", ""),
    todo("Apply for Tanzania/Zanzibar eVisa", ""),
    todo("Apply for Seychelles Travel Authorization", ""),
    todo("Book travel insurance", ""),
    todo("Confirm accommodation bookings (Zanzibar + Seychelles)", ""),
  ],
  bach: [
    todo("Book Sharm El Sheikh flights & hotel (groomsmen)", ""),
    todo("Book diving/desert safari excursions (groomsmen)", ""),
    todo("Choose & book Istanbul accommodation from comparison (bridesmaids)", ""),
    todo("Book Istanbul flights (bridesmaids)", ""),
    todo("Book Bosphorus cruise + hammam (bridesmaids)", ""),
  ],
  household: [],
};

/* ---------------- Booking Tracker ---------------- */
function bkRow(item, currency) {
  return { id: uid("bk"), item, provider: "", conf: "", total: 0, deposit: 0, dueDate: "", status: "", currency };
}

const BOOKING_TRACKER_SEED = {
  wedding: [
    bkRow("Venue", "EGP"), bkRow("Wedding planner", "EGP"), bkRow("Photographer & videographer", "EGP"),
    bkRow("Zaffa troupe", "EGP"), bkRow("Band / DJ", "EGP"), bkRow("Florist & decor", "EGP"),
    bkRow("Bridal dress", "EGP"), bkRow("Groom's suit", "EGP"), bkRow("Hair & makeup artist", "EGP"),
    bkRow("Cake designer", "EGP"), bkRow("Transportation", "EGP"), bkRow("Invitations/stationery", "EGP"),
    bkRow("Katb Ketab venue + ma'zoun", "EGP"),
  ],
  honeymoon: [
    bkRow("Flight: Cairo -> Zanzibar", "USD"), bkRow("Flight: Zanzibar -> Seychelles", "USD"), bkRow("Flight: Seychelles -> Cairo", "USD"),
    bkRow("Zanzibar resort", "USD"), bkRow("Seychelles resort (Mahe)", "USD"), bkRow("Seychelles resort (Praslin/La Digue)", "USD"),
    bkRow("Mnemba Island tour", "USD"), bkRow("Stone Town + Prison Island tour", "USD"), bkRow("Spice farm + Jozani tour", "USD"),
    bkRow("Praslin day trip", "USD"), bkRow("La Digue day trip", "USD"), bkRow("Travel insurance", "USD"),
    bkRow("Tanzania eVisa (both travelers)", "USD"), bkRow("Seychelles Travel Authorization (both travelers)", "USD"),
    bkRow("Airport transfers", "USD"),
  ],
  bach: [
    bkRow("Sharm El Sheikh flights", "EGP"), bkRow("Sharm El Sheikh hotel", "EGP"), bkRow("Diving/desert safari", "EGP"),
    bkRow("Istanbul flights", "USD"), bkRow("Istanbul Airbnb", "USD"), bkRow("Bosphorus cruise + hammam", "USD"),
  ],
};

/* ---------------- Monthly Budget (from the couple's Google Sheet) ---------------- */
const MONTHLY_CATEGORIES = [
  "Home Appliances", "Interior Design/As Built", "Kitchen Design/Cabinets", "Civil Work",
  "Furniture", "Kitchen Essentials", "Coffee Corner", "Engagement", "Wedding", "Honeymoon", "Others",
];

function monthRow(month, values, income) {
  const vals = MONTHLY_CATEGORIES.reduce((acc, cat, i) => {
    acc[cat] = values[i] || 0;
    return acc;
  }, {});
  return { id: uid("mo"), month, values: vals, income: income || 0 };
}

const MONTHLY_BUDGET_SEED = {
  currency: "GBP",
  rows: [
    monthRow("Nov 2024", [22240, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    monthRow("Dec 2024", [118818, 0, 0, 0, 0, 0, 0, 0, 0, 0, 30000]),
    monthRow("Jan 2025", [66500, 0, 0, 0, 0, 8159, 0, 0, 0, 0, 0]),
    monthRow("Feb 2025", [0, 0, 0, 1007356, 4129, 0, 0, 0, 0, 0, 0]),
    monthRow("Mar 2025", [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    monthRow("Apr 2025", [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    monthRow("May 2025", [0, 0, 0, 0, 0, 1029, 0, 0, 0, 0, 0]),
    monthRow("Jun 2025", [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    monthRow("Jul 2025", [114108, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    monthRow("Aug 2025", [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    monthRow("Sep 2025", [12000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    monthRow("Oct 2025", [0, 0, 0, 0, 0, 7500, 0, 0, 0, 0, 0]),
    monthRow("Nov 2025", [230000, 0, 0, 0, 22000, 0, 0, 0, 0, 0, 0]),
    monthRow("Dec 2025", [0, 0, 0, 0, 118000, 0, 0, 0, 0, 0, 0]),
    monthRow("Jan 2026", [8400, 0, 0, 0, 0, 10255, 0, 0, 0, 0, 0]),
    monthRow("Feb 2026", [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    monthRow("Mar 2026", [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    monthRow("Apr 2026", [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    monthRow("May 2026", [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    monthRow("Jun 2026", [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    monthRow("Jul 2026", [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    monthRow("Aug 2026", [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    monthRow("Sep 2026", [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    monthRow("Oct 2026", [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    monthRow("Nov 2026", [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    monthRow("Dec 2026", [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    monthRow("Jan 2027", [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    monthRow("Feb 2027", [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    monthRow("Mar 2027", [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    monthRow("Apr 2027", [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
  ],
};


/* ===== p6_dashboard.jsx ===== */
function daysUntil(dateStr) {
  const target = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.round((target - now) / 86400000);
  return diff;
}

function CountdownStat({ label, dateStr, accent, onChangeDate }) {
  const d = daysUntil(dateStr);
  const passed = d < 0;
  return (
    <div className="flex-1 min-w-[140px]">
      <div
        className="text-4xl sm:text-5xl leading-none"
        style={{ color: accent, fontFamily: "Fraunces, serif", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}
      >
        {passed ? "—" : d}
      </div>
      <div className="text-xs mt-1.5 tracking-wide" style={{ color: T.inkMute, fontFamily: "Manrope, sans-serif" }}>
        {passed ? `${label} has passed` : `days to ${label}`}
      </div>
      <input
        type="date"
        value={dateStr}
        onChange={(e) => onChangeDate(e.target.value)}
        className="mt-1 text-[11px] bg-transparent outline-none rounded px-1 -mx-1 hover:bg-black/5 focus:bg-black/5 transition-colors"
        style={{ color: T.inkFaint, colorScheme: "light", fontFamily: "Manrope, sans-serif" }}
      />
    </div>
  );
}

function computeWeddingTotal(wb) {
  const guestLine = (row) => {
    if (row.formula === "catering") return wb.guests * wb.perGuestCatering;
    if (row.formula === "favors") return wb.guests * wb.perGuestFavor;
    return (row.qty || 0) * (row.unit || 0);
  };
  const core = wb.core.reduce((s, r) => s + guestLine(r), 0);
  const pre = wb.preWedding.reduce((s, r) => s + (r.qty || 0) * (r.unit || 0), 0);
  const contingency = 0.1 * (core + pre);
  return core + pre + contingency;
}

function computeHoneymoonTotal(hm) {
  const sub = hm.rows.reduce((s, r) => s + (r.qty || 0) * (r.unit || 0), 0);
  return sub + 0.1 * sub;
}

function bachLineQty(row, bt) {
  return row.perPerson ? bt.groupSize || 0 : row.qty || 0;
}

function computeBachTotal(bt) {
  return bt.budget.reduce((s, r) => s + bachLineQty(r, bt) * (r.unit || 0), 0);
}

function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <Card className="p-5 flex items-start gap-4" accent={accent}>
      <div className="rounded-xl p-2.5 shrink-0" style={{ background: `${accent}22` }}>
        <Icon size={20} color={accent} />
      </div>
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wide font-semibold mb-1" style={{ color: T.inkMute, fontFamily: "Manrope, sans-serif" }}>
          {label}
        </div>
        <div className="text-xl sm:text-2xl truncate" style={{ color: T.ink, fontFamily: "Fraunces, serif", fontWeight: 600 }}>
          {value}
        </div>
        {sub && (
          <div className="text-xs mt-0.5" style={{ color: T.inkFaint, fontFamily: "Manrope, sans-serif" }}>
            {sub}
          </div>
        )}
      </div>
    </Card>
  );
}

function NavCard({ icon: Icon, title, desc, accent, onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl p-5 transition-all hover:-translate-y-0.5 group w-full"
      style={{ background: T.card, border: `1px solid ${T.lineSoft}` }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="rounded-xl p-2" style={{ background: `${accent}22` }}>
          <Icon size={18} color={accent} />
        </div>
        <ArrowRight size={16} color={T.inkFaint} className="group-hover:translate-x-1 transition-transform" />
      </div>
      <div className="text-base font-semibold mb-1" style={{ color: T.ink, fontFamily: "Fraunces, serif" }}>
        {title}
      </div>
      <div className="text-sm" style={{ color: T.inkMute, fontFamily: "Manrope, sans-serif" }}>
        {desc}
      </div>
    </button>
  );
}

function Dashboard({ weddingBudget, honeymoonA, honeymoonB, honeymoonChoice, bachGroom, bachBride, keyDates, setKeyDates, goTo }) {
  const weddingTotal = computeWeddingTotal(weddingBudget);
  const hmTotal = computeHoneymoonTotal(honeymoonChoice === "A" ? honeymoonA : honeymoonB);
  const groomTotal = computeBachTotal(bachGroom);
  const brideTotal = computeBachTotal(bachBride);
  const patchDate = (key) => (v) => setKeyDates((p) => ({ ...p, [key]: v }));

  return (
    <div>
      <div
        className="rounded-3xl p-7 sm:p-10 mb-8 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${T.bgSoft}, ${T.card})`, border: `1px solid ${T.lineSoft}` }}
      >
        <div
          className="text-xs tracking-[0.2em] uppercase font-semibold mb-2"
          style={{ color: T.gold, fontFamily: "Manrope, sans-serif" }}
        >
          The countdown
        </div>
        <h1
          className="text-3xl sm:text-4xl md:text-5xl mb-6 max-w-2xl"
          style={{ color: T.ink, fontFamily: "Fraunces, serif", fontWeight: 600, lineHeight: 1.15 }}
        >
          Cairo to Istanbul to Zanzibar &amp; Seychelles.
        </h1>
        <div className="flex flex-wrap gap-x-8 gap-y-5">
          <CountdownStat label="the bridesmaids' Istanbul trip" dateStr={keyDates.bachBrideStart} onChangeDate={patchDate("bachBrideStart")} accent={T.rose} />
          <CountdownStat label="the groomsmen's Sharm trip" dateStr={keyDates.bachGroomStart} onChangeDate={patchDate("bachGroomStart")} accent={T.sage} />
          <CountdownStat label="the Katb Ketab" dateStr={keyDates.katbKetab} onChangeDate={patchDate("katbKetab")} accent={T.goldSoft} />
          <CountdownStat label="the wedding" dateStr={keyDates.wedding} onChangeDate={patchDate("wedding")} accent={T.gold} />
          <CountdownStat label="the honeymoon" dateStr={keyDates.honeymoonStart} onChangeDate={patchDate("honeymoonStart")} accent={T.sky} />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Sparkles} label="Wedding budget" value={fmtMoney(weddingTotal, "EGP")} sub={`${weddingBudget.guests} guests`} accent={T.gold} />
        <StatCard icon={Waves} label="Honeymoon budget" value={fmtMoney(hmTotal, "USD")} sub={`Option ${honeymoonChoice} selected`} accent={T.sky} />
        <StatCard icon={Users2} label="Bridesmaids trip" value={fmtMoney(brideTotal, "USD")} sub={`Istanbul, ${bachBride.groupSize} people`} accent={T.rose} />
        <StatCard icon={Plane} label="Groomsmen trip" value={fmtMoney(groomTotal, "EGP")} sub={`Sharm El Sheikh, ${bachGroom.groupSize} people`} accent={T.sage} />
      </div>

      <div
        className="text-xs tracking-[0.18em] uppercase font-semibold mb-3"
        style={{ color: T.inkFaint, fontFamily: "Manrope, sans-serif" }}
      >
        Jump to
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <NavCard icon={Sparkles} title="Wedding budget" desc="Line items, guest count & catering formulas" accent={T.gold} onClick={() => goTo("wedding")} />
        <NavCard icon={Users2} title="Vendor directory" desc="Planners, venues, DJs, photographers" accent={T.goldSoft} onClick={() => goTo("vendors")} />
        <NavCard icon={Palette} title="Inspiration" desc="Mood boards, color palettes, furniture links" accent={T.rose} onClick={() => goTo("inspiration")} />
        <NavCard icon={Waves} title="Honeymoon" desc="Budget + day-by-day itinerary" accent={T.sky} onClick={() => goTo("honeymoon")} />
        <NavCard icon={Plane} title="Bach trips" desc="Sharm + Istanbul, incl. Airbnb comparison" accent={T.rose} onClick={() => goTo("bach")} />
        <NavCard icon={Gift} title="Gifts" desc="Groomsmen & bridesmaids gift boxes, budget per person" accent={T.goldSoft} onClick={() => goTo("gifts")} />
        <NavCard icon={Sparkles} title="To-dos" desc="Add, edit and check off as you go" accent={T.sage} onClick={() => goTo("todos")} />
        <NavCard icon={Waves} title="Monthly budget" desc="Your actual spend, month by month" accent={T.goldSoft} onClick={() => goTo("monthly")} />
      </div>
    </div>
  );
}


/* ===== p7_wedding_vendors.jsx ===== */
function lineTotal(row, wb) {
  if (row.formula === "catering") return wb.guests * wb.perGuestCatering;
  if (row.formula === "favors") return wb.guests * wb.perGuestFavor;
  return (row.qty || 0) * (row.unit || 0);
}

function BudgetTable({ rows, onChange, wb, currency, onAdd, onRemove }) {
  return (
    <div>
      {/* Mobile: stacked cards */}
      <div className="sm:hidden space-y-3">
        {rows.map((row) => {
          const isFormula = !!row.formula;
          const est = lineTotal(row, wb);
          return (
            <div key={row.id} className="rounded-xl p-3.5" style={{ background: T.bgSoft, border: `1px solid ${T.lineSoft}` }}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <EditableText value={row.item} onChange={(v) => onChange(row.id, { item: v })} className="text-sm font-semibold" />
                <IconBtn onClick={() => onRemove(row.id)} danger title="Remove">
                  <Trash2 size={14} />
                </IconBtn>
              </div>
              <MobileField label="Category">
                <EditableText value={row.category} onChange={(v) => onChange(row.id, { category: v })} className="text-sm text-right" />
              </MobileField>
              <MobileField label="Qty">
                {isFormula ? (
                  <span className="text-xs italic" style={{ color: T.inkFaint }}>guests</span>
                ) : (
                  <EditableNumber value={row.qty} onChange={(v) => onChange(row.id, { qty: v })} className="text-sm w-16" />
                )}
              </MobileField>
              <MobileField label="Unit cost">
                {isFormula ? (
                  <span className="text-xs italic" style={{ color: T.inkFaint }}>per-guest</span>
                ) : (
                  <EditableNumber value={row.unit} onChange={(v) => onChange(row.id, { unit: v })} className="text-sm w-20" />
                )}
              </MobileField>
              <MobileField label="Est.">
                <span style={{ color: T.goldSoft, fontVariantNumeric: "tabular-nums" }}>{fmtMoney(est, currency)}</span>
              </MobileField>
              <MobileField label="Actual">
                <EditableNumber value={row.actual} onChange={(v) => onChange(row.id, { actual: v })} className="text-sm w-20" />
              </MobileField>
            </div>
          );
        })}
      </div>

      {/* Desktop / tablet: table */}
      <div className="hidden sm:block overflow-x-auto -mx-2 wt-scroll">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.lineSoft}` }}>
              {["Category", "Item", "Qty", "Unit cost", "Est.", "Actual", ""].map((h) => (
                <th
                  key={h}
                  className="text-left py-2 px-2 text-xs uppercase tracking-wide font-semibold"
                  style={{ color: T.inkFaint, fontFamily: "Manrope, sans-serif" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isFormula = !!row.formula;
              const est = lineTotal(row, wb);
              return (
                <tr key={row.id} className="group" style={{ borderBottom: `1px solid ${T.lineSoft}` }}>
                  <td className="py-2 px-2 w-32">
                    <EditableText value={row.category} onChange={(v) => onChange(row.id, { category: v })} className="text-xs" />
                  </td>
                  <td className="py-2 px-2 min-w-[220px]">
                    <EditableText value={row.item} onChange={(v) => onChange(row.id, { item: v })} className="text-sm" />
                  </td>
                  <td className="py-2 px-2 w-16">
                    {isFormula ? (
                      <span className="text-xs italic" style={{ color: T.inkFaint }}>
                        {row.formula === "catering" ? "guests" : "guests"}
                      </span>
                    ) : (
                      <EditableNumber value={row.qty} onChange={(v) => onChange(row.id, { qty: v })} className="text-sm w-14" />
                    )}
                  </td>
                  <td className="py-2 px-2 w-24">
                    {isFormula ? (
                      <span className="text-xs italic" style={{ color: T.inkFaint }}>
                        per-guest
                      </span>
                    ) : (
                      <EditableNumber value={row.unit} onChange={(v) => onChange(row.id, { unit: v })} className="text-sm w-20" />
                    )}
                  </td>
                    <td className="py-2 px-2 w-28 text-right" style={{ color: T.goldSoft, fontFamily: "Manrope, sans-serif", fontVariantNumeric: "tabular-nums" }}>
                    {fmtMoney(est, currency)}
                  </td>
                  <td className="py-2 px-2 w-28">
                    <EditableNumber value={row.actual} onChange={(v) => onChange(row.id, { actual: v })} className="text-sm w-24" />
                  </td>
                  <td className="py-2 px-1 w-8">
                    <IconBtn onClick={() => onRemove(row.id)} title="Remove" danger>
                      <Trash2 size={14} />
                    </IconBtn>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button
        onClick={onAdd}
        className="mt-3 ml-2 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors hover:bg-black/10"
        style={{ color: T.gold, fontFamily: "Manrope, sans-serif" }}
      >
        <Plus size={14} /> Add line item
      </button>
    </div>
  );
}

function WeddingBudget({ wb, setWb }) {
  const patchRow = (listKey) => (id, patch) =>
    setWb((prev) => ({ ...prev, [listKey]: prev[listKey].map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  const addRow = (listKey) => () =>
    setWb((prev) => ({
      ...prev,
      [listKey]: [...prev[listKey], { id: uid("wb"), category: "New category", item: "New item", qty: 1, unit: 0, actual: 0, notes: "" }],
    }));
  const removeRow = (listKey) => (id) =>
    setWb((prev) => ({ ...prev, [listKey]: prev[listKey].filter((r) => r.id !== id) }));

  const coreEst = wb.core.reduce((s, r) => s + lineTotal(r, wb), 0);
  const preEst = wb.preWedding.reduce((s, r) => s + lineTotal(r, wb), 0);
  const contingency = 0.1 * (coreEst + preEst);
  const total = coreEst + preEst + contingency;
  const coreActual = wb.core.reduce((s, r) => s + (r.actual || 0), 0);
  const preActual = wb.preWedding.reduce((s, r) => s + (r.actual || 0), 0);

  return (
    <div>
      <SectionHeading eyebrow="Cairo, 350 guests" title="Wedding Budget" />

      <Card className="p-5 mb-6 flex flex-wrap gap-8">
        <div>
          <div className="text-xs uppercase tracking-wide font-semibold mb-1" style={{ color: T.inkFaint, fontFamily: "Manrope, sans-serif" }}>
            Guest count
          </div>
          <EditableNumber value={wb.guests} onChange={(v) => setWb((p) => ({ ...p, guests: v }))} className="text-2xl w-24" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide font-semibold mb-1" style={{ color: T.inkFaint, fontFamily: "Manrope, sans-serif" }}>
            Per-guest catering (EGP)
          </div>
          <EditableNumber value={wb.perGuestCatering} onChange={(v) => setWb((p) => ({ ...p, perGuestCatering: v }))} className="text-2xl w-28" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide font-semibold mb-1" style={{ color: T.inkFaint, fontFamily: "Manrope, sans-serif" }}>
            Per-guest favor (EGP)
          </div>
          <EditableNumber value={wb.perGuestFavor} onChange={(v) => setWb((p) => ({ ...p, perGuestFavor: v }))} className="text-2xl w-24" />
        </div>
      </Card>

      <Card className="p-5 mb-6">
        <div className="text-sm font-semibold mb-4" style={{ color: T.ink, fontFamily: "Fraunces, serif" }}>
          A. Core wedding costs
        </div>
        <BudgetTable rows={wb.core} onChange={patchRow("core")} wb={wb} currency="EGP" onAdd={addRow("core")} onRemove={removeRow("core")} />
      </Card>

      <Card className="p-5 mb-6">
        <div className="text-sm font-semibold mb-4" style={{ color: T.ink, fontFamily: "Fraunces, serif" }}>
          B. Pre-wedding events
        </div>
        <BudgetTable rows={wb.preWedding} onChange={patchRow("preWedding")} wb={wb} currency="EGP" onAdd={addRow("preWedding")} onRemove={removeRow("preWedding")} />
      </Card>

      <Card className="p-6" accent={T.gold}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <div className="text-xs uppercase tracking-wide font-semibold mb-1" style={{ color: T.inkFaint }}>
              Estimated total (incl. 10% contingency)
            </div>
            <div className="text-3xl" style={{ color: T.gold, fontFamily: "Fraunces, serif", fontWeight: 600 }}>
              {fmtMoney(total, "EGP")}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide font-semibold mb-1" style={{ color: T.inkFaint }}>
              Actual spent so far
            </div>
            <div className="text-3xl" style={{ color: T.ink, fontFamily: "Fraunces, serif", fontWeight: 600 }}>
              {fmtMoney(coreActual + preActual, "EGP")}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function VendorTable({ title, rows, onChange, onAdd, onRemove }) {
  return (
    <Card className="p-5 mb-5">
      <div className="text-sm font-semibold mb-4" style={{ color: T.ink, fontFamily: "Fraunces, serif" }}>
        {title}
      </div>
      <div className="space-y-3">
        {rows.map((v) => (
          <div key={v.id} className="rounded-xl p-3" style={{ background: T.bgSoft }}>
            <div className="flex items-start gap-3 flex-wrap">
              <div className="flex-1 min-w-[160px]">
                <EditableText value={v.name} onChange={(val) => onChange(v.id, { name: val })} className="font-semibold text-sm" />
              </div>
              <select
                value={v.status || ""}
                onChange={(e) => onChange(v.id, { status: e.target.value })}
                className="text-xs rounded-lg px-2 py-1 outline-none"
                style={{ background: T.card, color: T.ink, border: `1px solid ${T.lineSoft}`, fontFamily: "Manrope, sans-serif" }}
              >
                <option value="">Not contacted</option>
                <option value="contacted">Contacted</option>
                <option value="quoted">Quoted</option>
                <option value="booked">Booked</option>
              </select>
              <IconBtn onClick={() => onRemove(v.id)} title="Remove" danger>
                <Trash2 size={14} />
              </IconBtn>
            </div>
            <div className="text-xs mt-1.5" style={{ color: T.inkMute }}>
              <EditableText value={v.style} onChange={(val) => onChange(v.id, { style: val })} multiline />
            </div>
            <div className="flex gap-4 mt-2 text-xs" style={{ color: T.goldSoft }}>
              <EditableText value={v.price} onChange={(val) => onChange(v.id, { price: val })} className="w-40" />
              <EditableText value={v.notes} onChange={(val) => onChange(v.id, { notes: val })} className="flex-1" />
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={onAdd}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors hover:bg-black/10"
        style={{ color: T.gold, fontFamily: "Manrope, sans-serif" }}
      >
        <Plus size={14} /> Add
      </button>
    </Card>
  );
}

function VendorDirectory({ vendors, setVendors }) {
  const patch = (listKey) => (id, p) =>
    setVendors((prev) => ({ ...prev, [listKey]: prev[listKey].map((r) => (r.id === id ? { ...r, ...p } : r)) }));
  const add = (listKey) => () =>
    setVendors((prev) => ({ ...prev, [listKey]: [...prev[listKey], { id: uid("v"), name: "New vendor", style: "", price: "", notes: "", status: "" }] }));
  const remove = (listKey) => (id) => setVendors((prev) => ({ ...prev, [listKey]: prev[listKey].filter((r) => r.id !== id) }));

  return (
    <div>
      <SectionHeading eyebrow="Reference & status tracking" title="Vendor Directory" />
      <VendorTable title="Event planners" rows={vendors.planners} onChange={patch("planners")} onAdd={add("planners")} onRemove={remove("planners")} />
      <VendorTable title="Outdoor venues" rows={vendors.venues} onChange={patch("venues")} onAdd={add("venues")} onRemove={remove("venues")} />
      <VendorTable title="DJs" rows={vendors.djs} onChange={patch("djs")} onAdd={add("djs")} onRemove={remove("djs")} />
      <VendorTable title="Photographers" rows={vendors.photographers} onChange={patch("photographers")} onAdd={add("photographers")} onRemove={remove("photographers")} />
    </div>
  );
}


/* ===== p8_honeymoon.jsx ===== */
function ToggleAB({ choice, setChoice }) {
  return (
    <div className="inline-flex rounded-xl p-1" style={{ background: T.bgSoft, border: `1px solid ${T.lineSoft}` }}>
      {["A", "B"].map((opt) => (
        <button
          key={opt}
          onClick={() => setChoice(opt)}
          className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
          style={{
            background: choice === opt ? T.gold : "transparent",
            color: choice === opt ? T.onAccent : T.inkMute,
            fontFamily: "Manrope, sans-serif",
          }}
        >
          Option {opt}
        </button>
      ))}
    </div>
  );
}

function HoneymoonBudgetSection({ honeymoonA, setHoneymoonA, honeymoonB, setHoneymoonB, choice, setChoice }) {
  const hm = choice === "A" ? honeymoonA : honeymoonB;
  const setHm = choice === "A" ? setHoneymoonA : setHoneymoonB;
  const sub = hm.rows.reduce((s, r) => s + (r.qty || 0) * (r.unit || 0), 0);
  const contingency = 0.1 * sub;
  const total = sub + contingency;
  const actualTotal = hm.rows.reduce((s, r) => s + (r.actual || 0), 0);

  const patch = (id, p) => setHm((prev) => ({ ...prev, rows: prev.rows.map((r) => (r.id === id ? { ...r, ...p } : r)) }));
  const add = () =>
    setHm((prev) => ({ ...prev, rows: [...prev.rows, { id: uid("hm"), category: "New", item: "New item", qty: 1, unit: 0, actual: 0 }] }));
  const remove = (id) => setHm((prev) => ({ ...prev, rows: prev.rows.filter((r) => r.id !== id) }));

  return (
    <Card className="p-5 mb-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="text-sm font-semibold" style={{ color: T.ink, fontFamily: "Fraunces, serif" }}>
          {hm.label}
        </div>
        <ToggleAB choice={choice} setChoice={setChoice} />
      </div>
      <div className="sm:hidden space-y-3">
        {hm.rows.map((r) => (
          <div key={r.id} className="rounded-xl p-3.5" style={{ background: T.bgSoft, border: `1px solid ${T.lineSoft}` }}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <EditableText value={r.item} onChange={(v) => patch(r.id, { item: v })} className="text-sm font-semibold" />
              <IconBtn onClick={() => remove(r.id)} danger title="Remove">
                <Trash2 size={14} />
              </IconBtn>
            </div>
            <MobileField label="Category">
              <EditableText value={r.category} onChange={(v) => patch(r.id, { category: v })} className="text-sm text-right" />
            </MobileField>
            <MobileField label="Qty">
              <EditableNumber value={r.qty} onChange={(v) => patch(r.id, { qty: v })} className="text-sm w-16" />
            </MobileField>
            <MobileField label="Unit">
              <EditableNumber value={r.unit} onChange={(v) => patch(r.id, { unit: v })} className="text-sm w-20" />
            </MobileField>
            <MobileField label="Est.">
              <span style={{ color: T.sky, fontVariantNumeric: "tabular-nums" }}>{fmtMoney((r.qty || 0) * (r.unit || 0), "USD")}</span>
            </MobileField>
            <MobileField label="Actual">
              <EditableNumber value={r.actual} onChange={(v) => patch(r.id, { actual: v })} className="text-sm w-20" />
            </MobileField>
          </div>
        ))}
      </div>
      <div className="hidden sm:block overflow-x-auto -mx-2 wt-scroll">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.lineSoft}` }}>
              {["Category", "Item", "Qty", "Unit", "Est.", "Actual", ""].map((h) => (
                <th key={h} className="text-left py-2 px-2 text-xs uppercase tracking-wide font-semibold" style={{ color: T.inkFaint }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hm.rows.map((r) => (
              <tr key={r.id} style={{ borderBottom: `1px solid ${T.lineSoft}` }}>
                <td className="py-2 px-2 w-28">
                  <EditableText value={r.category} onChange={(v) => patch(r.id, { category: v })} className="text-xs" />
                </td>
                <td className="py-2 px-2 min-w-[220px]">
                  <EditableText value={r.item} onChange={(v) => patch(r.id, { item: v })} className="text-sm" />
                </td>
                <td className="py-2 px-2 w-14">
                  <EditableNumber value={r.qty} onChange={(v) => patch(r.id, { qty: v })} className="text-sm w-12" />
                </td>
                <td className="py-2 px-2 w-20">
                  <EditableNumber value={r.unit} onChange={(v) => patch(r.id, { unit: v })} className="text-sm w-16" />
                </td>
                <td className="py-2 px-2 w-24 text-right" style={{ color: T.sky, fontVariantNumeric: "tabular-nums" }}>
                  {fmtMoney((r.qty || 0) * (r.unit || 0), "USD")}
                </td>
                <td className="py-2 px-2 w-24">
                  <EditableNumber value={r.actual} onChange={(v) => patch(r.id, { actual: v })} className="text-sm w-20" />
                </td>
                <td className="py-2 px-1 w-8">
                  <IconBtn onClick={() => remove(r.id)} danger title="Remove">
                    <Trash2 size={14} />
                  </IconBtn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={add} className="mt-3 ml-2 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-black/10" style={{ color: T.gold }}>
          <Plus size={14} /> Add line item
        </button>
      </div>
      <button onClick={add} className="sm:hidden mt-1 ml-1 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-black/10" style={{ color: T.gold }}>
        <Plus size={14} /> Add line item
      </button>
      <div className="grid sm:grid-cols-2 gap-4 mt-5 pt-5" style={{ borderTop: `1px solid ${T.lineSoft}` }}>
        <div>
          <div className="text-xs uppercase tracking-wide font-semibold" style={{ color: T.inkFaint }}>
            Estimated total (incl. 10% buffer)
          </div>
          <div className="text-2xl" style={{ color: T.sky, fontFamily: "Fraunces, serif", fontWeight: 600 }}>
            {fmtMoney(total, "USD")}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide font-semibold" style={{ color: T.inkFaint }}>
            Actual spent so far
          </div>
          <div className="text-2xl" style={{ color: T.ink, fontFamily: "Fraunces, serif", fontWeight: 600 }}>
            {fmtMoney(actualTotal, "USD")}
          </div>
        </div>
      </div>
    </Card>
  );
}

function ItinerarySection({ itineraryA, setItineraryA, itineraryB, setItineraryB, choice, setChoice }) {
  const days = choice === "A" ? itineraryA : itineraryB;
  const setDays = choice === "A" ? setItineraryA : setItineraryB;
  const patch = (id, p) => setDays((prev) => prev.map((r) => (r.id === id ? { ...r, ...p } : r)));

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="text-sm font-semibold" style={{ color: T.ink, fontFamily: "Fraunces, serif" }}>
          Day-by-day itinerary
        </div>
        <ToggleAB choice={choice} setChoice={setChoice} />
      </div>
      <div className="space-y-2.5">
        {days.map((d) => (
          <div key={d.id} className="rounded-xl p-3.5 flex flex-wrap gap-3 items-start" style={{ background: T.bgSoft }}>
            <div
              className="rounded-lg px-2.5 py-1 text-xs font-bold shrink-0"
              style={{ background: `${T.sky}22`, color: T.sky, fontFamily: "Manrope, sans-serif" }}
            >
              Day {d.day}
            </div>
            <div className="text-xs shrink-0 w-28" style={{ color: T.inkFaint }}>
              {d.date}
            </div>
            <div className="text-xs font-semibold shrink-0 w-40" style={{ color: T.goldSoft }}>
              {d.location}
            </div>
            <div className="flex-1 min-w-[220px]">
              <EditableText value={d.plan} onChange={(v) => patch(d.id, { plan: v })} multiline className="text-sm" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Honeymoon(props) {
  return (
    <div>
      <SectionHeading eyebrow="Zanzibar + Seychelles, Apr 4-16, 2027" title="Honeymoon" />
      <HoneymoonBudgetSection {...props} />
      <ItinerarySection {...props} />
    </div>
  );
}


/* ===== p9_bachtrips.jsx ===== */
function TripHeader({ trip, setTrip, accent }) {
  return (
    <Card className="p-5 mb-5" accent={accent}>
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide font-semibold mb-1" style={{ color: T.inkFaint }}>
            Destination
          </div>
          <EditableText value={trip.destination} onChange={(v) => setTrip((p) => ({ ...p, destination: v }))} className="text-lg font-semibold" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide font-semibold mb-1" style={{ color: T.inkFaint }}>
            Dates
          </div>
          <EditableText value={trip.dates} onChange={(v) => setTrip((p) => ({ ...p, dates: v }))} className="text-sm" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide font-semibold mb-1" style={{ color: T.inkFaint }}>
            Group size
          </div>
          <div className="flex items-center gap-1.5">
            <EditableNumber value={trip.groupSize} onChange={(v) => setTrip((p) => ({ ...p, groupSize: v }))} className="text-sm w-10" />
            <span className="text-sm" style={{ color: T.inkMute }}>
              people
            </span>
          </div>
          <div className="text-xs mt-0.5" style={{ color: T.inkFaint }}>
            <EditableText
              value={trip.groupNote}
              onChange={(v) => setTrip((p) => ({ ...p, groupNote: v }))}
              placeholder="e.g. incl. groom"
            />
          </div>
        </div>
      </div>
      <div className="mt-3 text-xs italic" style={{ color: T.inkMute }}>
        <EditableText value={trip.timingNote} onChange={(v) => setTrip((p) => ({ ...p, timingNote: v }))} multiline />
      </div>
    </Card>
  );
}

function OptionsTable({ trip, setTrip, accent }) {
  const patch = (id, p) => setTrip((prev) => ({ ...prev, options: prev.options.map((o) => (o.id === id ? { ...o, ...p } : o)) }));
  const add = () =>
    setTrip((prev) => ({ ...prev, options: [...prev.options, { id: uid("bo"), name: "New option", vibe: "", why: "", cost: "" }] }));
  const remove = (id) => setTrip((prev) => ({ ...prev, options: prev.options.filter((o) => o.id !== id) }));

  return (
    <Card className="p-5 mb-5">
      <div className="text-sm font-semibold mb-4" style={{ color: T.ink, fontFamily: "Fraunces, serif" }}>
        Destination options
      </div>
      <div className="space-y-3">
        {trip.options.map((o) => (
          <div key={o.id} className="rounded-xl p-3.5" style={{ background: T.bgSoft }}>
            <div className="flex items-start gap-3 flex-wrap">
              <div className="flex-1 min-w-[160px]">
                <EditableText value={o.name} onChange={(v) => patch(o.id, { name: v })} className="font-semibold text-sm" />
              </div>
              <div className="text-sm font-semibold" style={{ color: accent }}>
                <EditableText value={o.cost} onChange={(v) => patch(o.id, { cost: v })} className="w-28 text-right" />
              </div>
              <IconBtn onClick={() => remove(o.id)} danger title="Remove">
                <Trash2 size={14} />
              </IconBtn>
            </div>
            <div className="text-xs mt-1.5" style={{ color: T.inkMute }}>
              <EditableText value={o.vibe} onChange={(v) => patch(o.id, { vibe: v })} multiline />
            </div>
            <div className="text-xs mt-1" style={{ color: T.inkFaint }}>
              <EditableText value={o.why} onChange={(v) => patch(o.id, { why: v })} multiline />
            </div>
          </div>
        ))}
      </div>
      <button onClick={add} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-black/10" style={{ color: T.gold }}>
        <Plus size={14} /> Add option
      </button>
    </Card>
  );
}

function PlanList({ trip, setTrip }) {
  const patch = (id, p) => setTrip((prev) => ({ ...prev, plan: prev.plan.map((r) => (r.id === id ? { ...r, ...p } : r)) }));
  return (
    <Card className="p-5 mb-5">
      <div className="text-sm font-semibold mb-4" style={{ color: T.ink, fontFamily: "Fraunces, serif" }}>
        Recommended plan
      </div>
      <div className="space-y-2.5">
        {trip.plan.map((d) => (
          <div key={d.id} className="rounded-xl p-3.5 flex flex-wrap gap-3 items-start" style={{ background: T.bgSoft }}>
            <div className="rounded-lg px-2.5 py-1 text-xs font-bold shrink-0" style={{ background: `${T.gold}22`, color: T.gold }}>
              Day {d.day}
            </div>
            <div className="text-xs shrink-0 w-32" style={{ color: T.inkFaint }}>
              {d.date}
            </div>
            <div className="flex-1 min-w-[220px]">
              <EditableText value={d.plan} onChange={(v) => patch(d.id, { plan: v })} multiline className="text-sm" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function TripBudget({ trip, setTrip, accent }) {
  const patch = (id, p) => setTrip((prev) => ({ ...prev, budget: prev.budget.map((r) => (r.id === id ? { ...r, ...p } : r)) }));
  const add = () =>
    setTrip((prev) => ({ ...prev, budget: [...prev.budget, { id: uid("bg"), category: "New", item: "New item", qty: 1, unit: 0, actual: 0 }] }));
  const remove = (id) => setTrip((prev) => ({ ...prev, budget: prev.budget.filter((r) => r.id !== id) }));
  const sub = trip.budget.reduce((s, r) => s + bachLineQty(r, trip) * (r.unit || 0), 0);
  const contingency = 0.1 * sub;
  const total = sub + contingency;

  return (
    <Card className="p-5 mb-5">
      <div className="text-sm font-semibold mb-4" style={{ color: T.ink, fontFamily: "Fraunces, serif" }}>
        Budget ({trip.currency})
      </div>
      <div className="sm:hidden space-y-3">
        {trip.budget.map((r) => (
          <div key={r.id} className="rounded-xl p-3.5" style={{ background: T.bgSoft, border: `1px solid ${T.lineSoft}` }}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <EditableText value={r.item} onChange={(v) => patch(r.id, { item: v })} className="text-sm font-semibold" />
              <IconBtn onClick={() => remove(r.id)} danger title="Remove">
                <Trash2 size={14} />
              </IconBtn>
            </div>
            <MobileField label="Category">
              <EditableText value={r.category} onChange={(v) => patch(r.id, { category: v })} className="text-sm text-right" />
            </MobileField>
            <MobileField label="Qty">
              {r.perPerson ? (
                <span className="text-xs italic" style={{ color: T.inkFaint }}>
                  {trip.groupSize} pax
                </span>
              ) : (
                <EditableNumber value={r.qty} onChange={(v) => patch(r.id, { qty: v })} className="text-sm w-16" />
              )}
            </MobileField>
            <MobileField label="Unit">
              <EditableNumber value={r.unit} onChange={(v) => patch(r.id, { unit: v })} className="text-sm w-20" />
            </MobileField>
            <MobileField label="Est.">
              <span style={{ color: accent, fontVariantNumeric: "tabular-nums" }}>{fmtMoney(bachLineQty(r, trip) * (r.unit || 0), trip.currency)}</span>
            </MobileField>
            <MobileField label="Actual">
              <EditableNumber value={r.actual} onChange={(v) => patch(r.id, { actual: v })} className="text-sm w-20" />
            </MobileField>
          </div>
        ))}
        <button onClick={add} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-black/10" style={{ color: T.gold }}>
          <Plus size={14} /> Add line item
        </button>
      </div>
      <div className="hidden sm:block overflow-x-auto -mx-2 wt-scroll">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.lineSoft}` }}>
              {["Category", "Item", "Qty", "Unit", "Est.", "Actual", ""].map((h) => (
                <th key={h} className="text-left py-2 px-2 text-xs uppercase tracking-wide font-semibold" style={{ color: T.inkFaint }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trip.budget.map((r) => (
              <tr key={r.id} style={{ borderBottom: `1px solid ${T.lineSoft}` }}>
                <td className="py-2 px-2 w-28">
                  <EditableText value={r.category} onChange={(v) => patch(r.id, { category: v })} className="text-xs" />
                </td>
                <td className="py-2 px-2 min-w-[200px]">
                  <EditableText value={r.item} onChange={(v) => patch(r.id, { item: v })} className="text-sm" />
                </td>
                <td className="py-2 px-2 w-14">
                  {r.perPerson ? (
                    <span className="text-xs italic" style={{ color: T.inkFaint }}>
                      {trip.groupSize} pax
                    </span>
                  ) : (
                    <EditableNumber value={r.qty} onChange={(v) => patch(r.id, { qty: v })} className="text-sm w-12" />
                  )}
                </td>
                <td className="py-2 px-2 w-20">
                  <EditableNumber value={r.unit} onChange={(v) => patch(r.id, { unit: v })} className="text-sm w-16" />
                </td>
                <td className="py-2 px-2 w-24 text-right" style={{ color: accent, fontVariantNumeric: "tabular-nums" }}>
                  {fmtMoney(bachLineQty(r, trip) * (r.unit || 0), trip.currency)}
                </td>
                <td className="py-2 px-2 w-24">
                  <EditableNumber value={r.actual} onChange={(v) => patch(r.id, { actual: v })} className="text-sm w-20" />
                </td>
                <td className="py-2 px-1 w-8">
                  <IconBtn onClick={() => remove(r.id)} danger title="Remove">
                    <Trash2 size={14} />
                  </IconBtn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={add} className="mt-3 ml-2 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-black/10" style={{ color: T.gold }}>
          <Plus size={14} /> Add line item
        </button>
      </div>
      <div className="mt-4 pt-4 flex gap-8" style={{ borderTop: `1px solid ${T.lineSoft}` }}>
        <div>
          <div className="text-xs uppercase tracking-wide font-semibold" style={{ color: T.inkFaint }}>
            Estimated total
          </div>
          <div className="text-2xl" style={{ color: accent, fontFamily: "Fraunces, serif", fontWeight: 600 }}>
            {fmtMoney(total, trip.currency)}
          </div>
        </div>
      </div>
    </Card>
  );
}

function AirbnbComparison({ options, setOptions, groupSize, dates }) {
  const [sortByPrice, setSortByPrice] = useState(false);
  const patch = (id, p) => setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, ...p } : o)));
  const remove = (id) => setOptions((prev) => prev.filter((o) => o.id !== id));
  const add = () =>
    setOptions((prev) => [
      ...prev,
      { id: uid("ab"), name: "New listing", area: "", size: "", rating: "", eur: 0, usd: 0, usdpp: 0, note: "", url: "", pool: "", pick: false },
    ]);

  const sorted = sortByPrice ? [...options].sort((a, b) => (a.usdpp || 0) - (b.usdpp || 0)) : options;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="text-sm font-semibold" style={{ color: T.ink, fontFamily: "Fraunces, serif" }}>
          Airbnb options comparison ({groupSize} guests, {dates})
        </div>
        <button
          onClick={() => setSortByPrice((s) => !s)}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors hover:bg-black/10"
          style={{ color: T.gold, border: `1px solid ${T.lineSoft}` }}
        >
          {sortByPrice ? "Showing: cheapest first" : "Sort by price / person"}
        </button>
      </div>
      <div className="space-y-2.5">
        {sorted.map((o) => (
          <div
            key={o.id}
            className="rounded-xl p-3.5"
            style={{ background: o.pick ? `${T.gold}14` : T.bgSoft, border: o.pick ? `1px solid ${T.gold}55` : "1px solid transparent" }}
          >
            <div className="flex items-start gap-3 flex-wrap">
              <button
                onClick={() => patch(o.id, { pick: !o.pick })}
                title="Mark as top pick"
                className="shrink-0 mt-0.5"
              >
                <Star size={16} fill={o.pick ? T.gold : "none"} color={o.pick ? T.gold : T.inkFaint} />
              </button>
              <div className="min-w-[160px]">
                <EditableText value={o.name} onChange={(v) => patch(o.id, { name: v })} className="font-semibold text-sm" />
                <div className="text-xs" style={{ color: T.inkFaint }}>
                  {o.area} - {o.size} - {o.rating}
                </div>
              </div>
              <div className="ml-auto flex items-center gap-4 text-sm shrink-0">
                <div className="text-right">
                  <div style={{ color: T.goldSoft, fontVariantNumeric: "tabular-nums" }}>{fmtMoney(o.usdpp, "USD")}/pp</div>
                  <div className="text-xs" style={{ color: T.inkFaint }}>
                    {fmtMoney(o.usd, "USD")} total
                  </div>
                </div>
                {o.url && (
                  <a href={o.url} target="_blank" rel="noreferrer" style={{ color: T.gold }} title="View listing">
                    <ExternalLink size={16} />
                  </a>
                )}
                <IconBtn onClick={() => remove(o.id)} danger title="Remove">
                  <Trash2 size={14} />
                </IconBtn>
              </div>
            </div>
            <div className="text-xs mt-2" style={{ color: T.sage }}>
              {o.pool}
            </div>
            <div className="text-xs mt-1" style={{ color: T.inkMute }}>
              <EditableText value={o.note} onChange={(v) => patch(o.id, { note: v })} multiline />
            </div>
          </div>
        ))}
      </div>
      <button onClick={add} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-black/10" style={{ color: T.gold }}>
        <Plus size={14} /> Add listing
      </button>
    </Card>
  );
}

function BachTrips({ bachGroom, setBachGroom, bachBride, setBachBride, airbnbOptions, setAirbnbOptions }) {
  const [tab, setTab] = useState("bride");
  return (
    <div>
      <SectionHeading eyebrow="Two separate small-group trips" title="Bach Trips" />
      <div className="inline-flex rounded-xl p-1 mb-5" style={{ background: T.bgSoft, border: `1px solid ${T.lineSoft}` }}>
        {[
          { k: "bride", label: "Bridesmaids - Istanbul" },
          { k: "groom", label: "Groomsmen - Sharm" },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
            style={{ background: tab === t.k ? T.rose : "transparent", color: tab === t.k ? T.onAccent : T.inkMute }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "bride" ? (
        <>
          <TripHeader trip={bachBride} setTrip={setBachBride} accent={T.rose} />
          <AirbnbComparison options={airbnbOptions} setOptions={setAirbnbOptions} groupSize={bachBride.groupSize} dates={bachBride.dates} />
          <div className="h-5" />
          <OptionsTable trip={bachBride} setTrip={setBachBride} accent={T.rose} />
          <PlanList trip={bachBride} setTrip={setBachBride} />
          <TripBudget trip={bachBride} setTrip={setBachBride} accent={T.rose} />
        </>
      ) : (
        <>
          <TripHeader trip={bachGroom} setTrip={setBachGroom} accent={T.sage} />
          <OptionsTable trip={bachGroom} setTrip={setBachGroom} accent={T.sage} />
          <PlanList trip={bachGroom} setTrip={setBachGroom} />
          <TripBudget trip={bachGroom} setTrip={setBachGroom} accent={T.sage} />
        </>
      )}
    </div>
  );
}


/* ===== p9b_gifts.jsx ===== */
function GiftBox({ gifts, setGifts, accent, label }) {
  const patchItem = (id, p) => setGifts((prev) => ({ ...prev, items: prev.items.map((it) => (it.id === id ? { ...it, ...p } : it)) }));
  const addItem = () => setGifts((prev) => ({ ...prev, items: [...prev.items, { id: uid("gi"), name: "New item", price: 0 }] }));
  const removeItem = (id) => setGifts((prev) => ({ ...prev, items: prev.items.filter((it) => it.id !== id) }));

  const boxTotal = gifts.items.reduce((s, it) => s + (it.price || 0), 0);
  const totalSpend = boxTotal * (gifts.groupSize || 0);
  const diff = boxTotal - (gifts.budgetPerPerson || 0);

  return (
    <div>
      <Card className="p-5 mb-5" accent={accent}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <div className="text-xs uppercase tracking-wide font-semibold mb-1" style={{ color: T.inkFaint }}>
              Budget per person
            </div>
            <EditableNumber
              value={gifts.budgetPerPerson}
              onChange={(v) => setGifts((p) => ({ ...p, budgetPerPerson: v }))}
              className="text-lg font-semibold w-28"
            />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide font-semibold mb-1" style={{ color: T.inkFaint }}>
              Group size
            </div>
            <div className="flex items-center gap-1.5">
              <EditableNumber value={gifts.groupSize} onChange={(v) => setGifts((p) => ({ ...p, groupSize: v }))} className="text-lg font-semibold w-14" />
              <span className="text-sm" style={{ color: T.inkMute }}>
                people
              </span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="text-sm font-semibold mb-4" style={{ color: T.ink, fontFamily: "Fraunces, serif" }}>
          Gift box - {label}
        </div>
        <div className="space-y-2">
          {gifts.items.map((it) => (
            <div key={it.id} className="rounded-xl p-3 flex items-center gap-3" style={{ background: T.bgSoft }}>
              <div className="flex-1 min-w-0">
                <EditableText value={it.name} onChange={(v) => patchItem(it.id, { name: v })} className="text-sm" />
              </div>
              <EditableNumber value={it.price} onChange={(v) => patchItem(it.id, { price: v })} className="text-sm w-24 text-right" />
              <IconBtn onClick={() => removeItem(it.id)} danger title="Remove">
                <Trash2 size={14} />
              </IconBtn>
            </div>
          ))}
          {gifts.items.length === 0 && (
            <div className="text-xs italic py-2" style={{ color: T.inkFaint }}>
              No items yet - add the first gift box element below.
            </div>
          )}
        </div>
        <button onClick={addItem} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-black/5" style={{ color: T.gold }}>
          <Plus size={14} /> Add item
        </button>

        <div className="mt-4 pt-4 flex flex-wrap gap-8" style={{ borderTop: `1px solid ${T.lineSoft}` }}>
          <div>
            <div className="text-xs uppercase tracking-wide font-semibold" style={{ color: T.inkFaint }}>
              Cost per box
            </div>
            <div className="text-2xl" style={{ color: accent, fontFamily: "Fraunces, serif", fontWeight: 600 }}>
              {fmtMoney(boxTotal, "EGP")}
            </div>
            {gifts.budgetPerPerson > 0 && (
              <div className="text-xs mt-0.5" style={{ color: diff > 0 ? T.danger : T.sage }}>
                {diff > 0 ? `${fmtMoney(diff, "EGP")} over budget` : `${fmtMoney(-diff, "EGP")} under budget`}
              </div>
            )}
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide font-semibold" style={{ color: T.inkFaint }}>
              Total for {gifts.groupSize || 0} people
            </div>
            <div className="text-2xl" style={{ color: accent, fontFamily: "Fraunces, serif", fontWeight: 600 }}>
              {fmtMoney(totalSpend, "EGP")}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Gifts({ giftsGroom, setGiftsGroom, giftsBride, setGiftsBride }) {
  const [tab, setTab] = useState("bride");
  return (
    <div>
      <SectionHeading eyebrow="One gift box design per side" title="Gifts" />
      <div className="inline-flex rounded-xl p-1 mb-5" style={{ background: T.bgSoft, border: `1px solid ${T.lineSoft}` }}>
        {[
          { k: "bride", label: "Bridesmaids" },
          { k: "groom", label: "Groomsmen" },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
            style={{ background: tab === t.k ? T.rose : "transparent", color: tab === t.k ? T.onAccent : T.inkMute }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "bride" ? (
        <GiftBox gifts={giftsBride} setGifts={setGiftsBride} accent={T.rose} label="Bridesmaids" />
      ) : (
        <GiftBox gifts={giftsGroom} setGifts={setGiftsGroom} accent={T.sage} label="Groomsmen" />
      )}
    </div>
  );
}


/* ===== p10_todos_bookings.jsx ===== */
function TodoCategoryCard({ catKey, items, onAdd, onToggle, onEdit, onRemove }) {
  const meta = CATEGORY_META[catKey];
  const Icon = meta.icon;
  const [draft, setDraft] = useState("");
  const done = items.filter((i) => i.done).length;

  const submit = () => {
    if (!draft.trim()) return;
    onAdd(draft.trim());
    setDraft("");
  };

  return (
    <Card className="p-5" accent={meta.color}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="rounded-lg p-1.5" style={{ background: `${meta.color}22` }}>
          <Icon size={16} color={meta.color} />
        </div>
        <div className="text-sm font-semibold" style={{ color: T.ink, fontFamily: "Fraunces, serif" }}>
          {meta.label}
        </div>
        <div className="ml-auto text-xs" style={{ color: T.inkFaint, fontFamily: "Manrope, sans-serif" }}>
          {done}/{items.length}
        </div>
      </div>

      <div className="space-y-1.5 mb-3">
        {items.map((it) => (
          <div key={it.id} className="flex items-start gap-2 group rounded-lg px-1.5 py-1 -mx-1.5 hover:bg-black/5">
            <button
              onClick={() => onToggle(it.id)}
              className="mt-0.5 shrink-0 w-4 h-4 rounded flex items-center justify-center transition-colors"
              style={{ border: `1.5px solid ${it.done ? meta.color : T.inkFaint}`, background: it.done ? meta.color : "transparent" }}
            >
              {it.done && <Check size={11} color={T.onAccent} strokeWidth={3} />}
            </button>
            <div className="flex-1 min-w-0">
              <EditableText
                value={it.text}
                onChange={(v) => onEdit(it.id, { text: v })}
                className={`text-sm ${it.done ? "line-through opacity-50" : ""}`}
              />
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                {it.when && (
                  <div className="text-[11px]" style={{ color: T.inkFaint }}>
                    {it.when}
                  </div>
                )}
                <input
                  type="date"
                  value={it.deadline || ""}
                  onChange={(e) => onEdit(it.id, { deadline: e.target.value })}
                  className="text-[11px] bg-transparent outline-none rounded px-1 -mx-1 hover:bg-black/5 focus:bg-black/5 transition-colors"
                  style={{ color: T.inkFaint, colorScheme: "light" }}
                />
                {it.deadline &&
                  !it.done &&
                  (() => {
                    const d = daysUntil(it.deadline);
                    return (
                      <span className="text-[11px] font-semibold" style={{ color: d < 0 ? T.danger : T.inkFaint }}>
                        {d < 0 ? `${Math.abs(d)}d overdue` : d === 0 ? "due today" : `${d}d left`}
                      </span>
                    );
                  })()}
              </div>
            </div>
            <IconBtn onClick={() => onRemove(it.id)} danger title="Remove">
              <Trash2 size={13} />
            </IconBtn>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-xs italic py-2" style={{ color: T.inkFaint }}>
            Nothing here yet - add your first to-do below.
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Add a to-do..."
          className="flex-1 text-sm bg-transparent outline-none rounded-lg px-2 py-1.5 placeholder:opacity-40"
          style={{ color: T.ink, border: `1px solid ${T.lineSoft}`, fontFamily: "Manrope, sans-serif" }}
        />
        <button onClick={submit} className="rounded-lg px-2.5 transition-colors hover:bg-black/10" style={{ color: meta.color }}>
          <Plus size={16} />
        </button>
      </div>
    </Card>
  );
}

function Todos({ todos, setTodos }) {
  const add = (catKey) => (text) =>
    setTodos((prev) => ({ ...prev, [catKey]: [...prev[catKey], { id: uid("td"), text, when: "", deadline: "", done: false }] }));
  const toggle = (catKey) => (id) =>
    setTodos((prev) => ({ ...prev, [catKey]: prev[catKey].map((t) => (t.id === id ? { ...t, done: !t.done } : t)) }));
  const edit = (catKey) => (id, p) =>
    setTodos((prev) => ({ ...prev, [catKey]: prev[catKey].map((t) => (t.id === id ? { ...t, ...p } : t)) }));
  const remove = (catKey) => (id) => setTodos((prev) => ({ ...prev, [catKey]: prev[catKey].filter((t) => t.id !== id) }));

  const totalDone = Object.values(todos).flat().filter((t) => t.done).length;
  const totalAll = Object.values(todos).flat().length;

  return (
    <div>
      <SectionHeading
        eyebrow={`${totalDone} of ${totalAll} done`}
        title="To-Dos"
        right={
          <div className="w-40 h-2 rounded-full overflow-hidden" style={{ background: T.bgSoft }}>
            <div className="h-full rounded-full" style={{ width: `${totalAll ? (totalDone / totalAll) * 100 : 0}%`, background: T.gold }} />
          </div>
        }
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Object.keys(CATEGORY_META).map((catKey) => (
          <TodoCategoryCard
            key={catKey}
            catKey={catKey}
            items={todos[catKey] || []}
            onAdd={add(catKey)}
            onToggle={toggle(catKey)}
            onEdit={edit(catKey)}
            onRemove={remove(catKey)}
          />
        ))}
      </div>
    </div>
  );
}

const STATUS_OPTIONS = ["", "Pending", "Booked", "Paid in full"];

function BookingGroup({ title, rows, onChange, onAdd, onRemove }) {
  return (
    <Card className="p-5 mb-5">
      <div className="text-sm font-semibold mb-4" style={{ color: T.ink, fontFamily: "Fraunces, serif" }}>
        {title}
      </div>
      <div className="sm:hidden space-y-3">
        {rows.map((r) => {
          const balance = (r.total || 0) - (r.deposit || 0);
          return (
            <div key={r.id} className="rounded-xl p-3.5" style={{ background: T.bgSoft, border: `1px solid ${T.lineSoft}` }}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <EditableText value={r.item} onChange={(v) => onChange(r.id, { item: v })} className="text-sm font-semibold" />
                <IconBtn onClick={() => onRemove(r.id)} danger title="Remove">
                  <Trash2 size={14} />
                </IconBtn>
              </div>
              <MobileField label="Provider">
                <EditableText value={r.provider} onChange={(v) => onChange(r.id, { provider: v })} className="text-sm text-right" />
              </MobileField>
              <MobileField label="Confirmation #">
                <EditableText value={r.conf} onChange={(v) => onChange(r.id, { conf: v })} className="text-sm text-right" />
              </MobileField>
              <MobileField label="Total">
                <EditableNumber value={r.total} onChange={(v) => onChange(r.id, { total: v })} className="text-sm w-24" />
              </MobileField>
              <MobileField label="Deposit">
                <EditableNumber value={r.deposit} onChange={(v) => onChange(r.id, { deposit: v })} className="text-sm w-24" />
              </MobileField>
              <MobileField label="Balance">
                <span style={{ color: T.goldSoft }}>{fmtMoney(balance, r.currency)}</span>
              </MobileField>
              <MobileField label="Due date">
                <EditableText value={r.dueDate} onChange={(v) => onChange(r.id, { dueDate: v })} className="text-sm text-right" />
              </MobileField>
              <MobileField label="Status">
                <select
                  value={r.status}
                  onChange={(e) => onChange(r.id, { status: e.target.value })}
                  className="text-sm rounded-lg px-2 py-1 outline-none"
                  style={{ background: T.card, color: T.ink, border: `1px solid ${T.lineSoft}` }}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s || "-"}
                    </option>
                  ))}
                </select>
              </MobileField>
            </div>
          );
        })}
        <button onClick={onAdd} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-black/10" style={{ color: T.gold }}>
          <Plus size={14} /> Add booking
        </button>
      </div>
      <div className="hidden sm:block overflow-x-auto -mx-2 wt-scroll">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.lineSoft}` }}>
              {["Item", "Provider", "Confirmation #", "Total", "Deposit", "Balance", "Due date", "Status", ""].map((h) => (
                <th key={h} className="text-left py-2 px-2 text-xs uppercase tracking-wide font-semibold" style={{ color: T.inkFaint }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const balance = (r.total || 0) - (r.deposit || 0);
              return (
                <tr key={r.id} style={{ borderBottom: `1px solid ${T.lineSoft}` }}>
                  <td className="py-2 px-2 min-w-[180px]">
                    <EditableText value={r.item} onChange={(v) => onChange(r.id, { item: v })} className="text-sm" />
                  </td>
                  <td className="py-2 px-2 w-36">
                    <EditableText value={r.provider} onChange={(v) => onChange(r.id, { provider: v })} className="text-xs" />
                  </td>
                  <td className="py-2 px-2 w-28">
                    <EditableText value={r.conf} onChange={(v) => onChange(r.id, { conf: v })} className="text-xs" />
                  </td>
                  <td className="py-2 px-2 w-24">
                    <EditableNumber value={r.total} onChange={(v) => onChange(r.id, { total: v })} className="text-sm w-20" />
                  </td>
                  <td className="py-2 px-2 w-24">
                    <EditableNumber value={r.deposit} onChange={(v) => onChange(r.id, { deposit: v })} className="text-sm w-20" />
                  </td>
                  <td className="py-2 px-2 w-24" style={{ color: T.goldSoft }}>
                    {fmtMoney(balance, r.currency)}
                  </td>
                  <td className="py-2 px-2 w-28">
                    <EditableText value={r.dueDate} onChange={(v) => onChange(r.id, { dueDate: v })} className="text-xs" />
                  </td>
                  <td className="py-2 px-2 w-32">
                    <select
                      value={r.status}
                      onChange={(e) => onChange(r.id, { status: e.target.value })}
                      className="text-xs rounded-lg px-1.5 py-1 outline-none w-full"
                      style={{ background: T.bgSoft, color: T.ink, border: `1px solid ${T.lineSoft}` }}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s || "-"}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-1 w-8">
                    <IconBtn onClick={() => onRemove(r.id)} danger title="Remove">
                      <Trash2 size={14} />
                    </IconBtn>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button onClick={onAdd} className="mt-3 ml-2 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-black/10" style={{ color: T.gold }}>
          <Plus size={14} /> Add booking
        </button>
      </div>
    </Card>
  );
}

function BookingTracker({ bookings, setBookings }) {
  const patch = (groupKey) => (id, p) =>
    setBookings((prev) => ({ ...prev, [groupKey]: prev[groupKey].map((r) => (r.id === id ? { ...r, ...p } : r)) }));
  const add = (groupKey, currency) => () =>
    setBookings((prev) => ({
      ...prev,
      [groupKey]: [...prev[groupKey], { id: uid("bk"), item: "New booking", provider: "", conf: "", total: 0, deposit: 0, dueDate: "", status: "", currency }],
    }));
  const remove = (groupKey) => (id) => setBookings((prev) => ({ ...prev, [groupKey]: prev[groupKey].filter((r) => r.id !== id) }));

  return (
    <div>
      <SectionHeading eyebrow="Every confirmation, deposit and balance" title="Booking Tracker" />
      <BookingGroup title="Wedding" rows={bookings.wedding} onChange={patch("wedding")} onAdd={add("wedding", "EGP")} onRemove={remove("wedding")} />
      <BookingGroup title="Honeymoon" rows={bookings.honeymoon} onChange={patch("honeymoon")} onAdd={add("honeymoon", "USD")} onRemove={remove("honeymoon")} />
      <BookingGroup title="Bach trips" rows={bookings.bach} onChange={patch("bach")} onAdd={add("bach", "USD")} onRemove={remove("bach")} />
    </div>
  );
}


/* ===== p11_monthly.jsx ===== */
function rowTotal(row) {
  return MONTHLY_CATEGORIES.reduce((s, c) => s + (row.values[c] || 0), 0);
}

function MonthlyBudget({ monthly, setMonthly }) {
  const [collapsed, setCollapsed] = useState(true);

  const patchValue = (id, cat, val) =>
    setMonthly((prev) => ({
      ...prev,
      rows: prev.rows.map((r) => (r.id === id ? { ...r, values: { ...r.values, [cat]: val } } : r)),
    }));
  const patchIncome = (id, val) => setMonthly((prev) => ({ ...prev, rows: prev.rows.map((r) => (r.id === id ? { ...r, income: val } : r)) }));
  const patchMonth = (id, val) => setMonthly((prev) => ({ ...prev, rows: prev.rows.map((r) => (r.id === id ? { ...r, month: val } : r)) }));
  const addMonth = () =>
    setMonthly((prev) => ({
      ...prev,
      rows: [
        ...prev.rows,
        { id: uid("mo"), month: "New month", values: MONTHLY_CATEGORIES.reduce((a, c) => ({ ...a, [c]: 0 }), {}), income: 0 },
      ],
    }));
  const removeMonth = (id) => setMonthly((prev) => ({ ...prev, rows: prev.rows.filter((r) => r.id !== id) }));

  const grand = monthly.rows.reduce(
    (acc, r) => {
      MONTHLY_CATEGORIES.forEach((c) => (acc[c] = (acc[c] || 0) + (r.values[c] || 0)));
      acc.total += rowTotal(r);
      acc.income += r.income || 0;
      return acc;
    },
    { total: 0, income: 0 }
  );

  const shownCats = collapsed ? ["Engagement", "Wedding", "Honeymoon", "Others"] : MONTHLY_CATEGORIES;

  return (
    <div>
      <SectionHeading
        eyebrow="Carried over from Our Journey Budget Tracker"
        title="Monthly Budget"
        right={
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors hover:bg-black/10"
            style={{ color: T.gold, border: `1px solid ${T.lineSoft}` }}
          >
            {collapsed ? "Show all categories (incl. home renovation)" : "Show wedding-related only"}
          </button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card className="p-4" accent={T.gold}>
          <div className="text-xs uppercase tracking-wide font-semibold" style={{ color: T.inkFaint }}>
            Total expenditure
          </div>
          <div className="text-xl" style={{ color: T.gold, fontFamily: "Fraunces, serif", fontWeight: 600 }}>
            {fmtMoney(grand.total, "GBP")}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide font-semibold" style={{ color: T.inkFaint }}>
            Total income logged
          </div>
          <div className="text-xl" style={{ color: T.sage, fontFamily: "Fraunces, serif", fontWeight: 600 }}>
            {fmtMoney(grand.income, "GBP")}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide font-semibold" style={{ color: T.inkFaint }}>
            Wedding spend
          </div>
          <div className="text-xl" style={{ color: T.roseSoft, fontFamily: "Fraunces, serif", fontWeight: 600 }}>
            {fmtMoney(grand["Wedding"] || 0, "GBP")}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide font-semibold" style={{ color: T.inkFaint }}>
            Honeymoon spend
          </div>
          <div className="text-xl" style={{ color: T.sky, fontFamily: "Fraunces, serif", fontWeight: 600 }}>
            {fmtMoney(grand["Honeymoon"] || 0, "GBP")}
          </div>
        </Card>
      </div>

      <div className="sm:hidden space-y-3">
        {monthly.rows.map((r) => {
          const total = rowTotal(r);
          const savings = (r.income || 0) - total;
          return (
            <div key={r.id} className="rounded-xl p-3.5" style={{ background: T.card, border: `1px solid ${T.lineSoft}` }}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <EditableText value={r.month} onChange={(v) => patchMonth(r.id, v)} className="text-sm font-semibold" />
                <IconBtn onClick={() => removeMonth(r.id)} danger title="Remove month">
                  <Trash2 size={13} />
                </IconBtn>
              </div>
              {shownCats.map((c) => (
                <MobileField key={c} label={c}>
                  <EditableNumber value={r.values[c]} onChange={(v) => patchValue(r.id, c, v)} className="text-sm w-20" />
                </MobileField>
              ))}
              <MobileField label="Income">
                <EditableNumber value={r.income} onChange={(v) => patchIncome(r.id, v)} className="text-sm w-20" />
              </MobileField>
              <div className="mt-2 pt-2 flex justify-between" style={{ borderTop: `1px solid ${T.lineSoft}` }}>
                <span className="text-xs" style={{ color: T.goldSoft }}>Total: {fmtMoney(total, "GBP")}</span>
                <span className="text-xs font-semibold" style={{ color: savings < 0 ? T.danger : T.sage }}>
                  Savings: {fmtMoney(savings, "GBP")}
                </span>
              </div>
            </div>
          );
        })}
        <button onClick={addMonth} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-black/10" style={{ color: T.gold }}>
          <Plus size={14} /> Add month
        </button>
      </div>

      <Card className="p-5 hidden sm:block">
        <div className="overflow-x-auto -mx-2 wt-scroll">
          <table className="w-full text-xs min-w-[900px]">
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.lineSoft}` }}>
                <th className="text-left py-2 px-2 uppercase tracking-wide font-semibold sticky left-0" style={{ color: T.inkFaint, background: T.card }}>
                  Month
                </th>
                {shownCats.map((c) => (
                  <th key={c} className="text-right py-2 px-2 uppercase tracking-wide font-semibold whitespace-nowrap" style={{ color: T.inkFaint }}>
                    {c}
                  </th>
                ))}
                <th className="text-right py-2 px-2 uppercase tracking-wide font-semibold" style={{ color: T.gold }}>
                  Total
                </th>
                <th className="text-right py-2 px-2 uppercase tracking-wide font-semibold" style={{ color: T.sage }}>
                  Income
                </th>
                <th className="text-right py-2 px-2 uppercase tracking-wide font-semibold" style={{ color: T.inkFaint }}>
                  Savings
                </th>
                <th className="w-6"></th>
              </tr>
            </thead>
            <tbody>
              {monthly.rows.map((r) => {
                const total = rowTotal(r);
                const savings = (r.income || 0) - total;
                return (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${T.lineSoft}` }}>
                    <td className="py-1.5 px-2 whitespace-nowrap sticky left-0" style={{ background: T.card }}>
                      <EditableText value={r.month} onChange={(v) => patchMonth(r.id, v)} className="text-xs font-semibold w-24" />
                    </td>
                    {shownCats.map((c) => (
                      <td key={c} className="py-1.5 px-2">
                        <EditableNumber value={r.values[c]} onChange={(v) => patchValue(r.id, c, v)} className="text-xs w-20" />
                      </td>
                    ))}
                    <td className="py-1.5 px-2 text-right font-semibold" style={{ color: T.goldSoft, fontVariantNumeric: "tabular-nums" }}>
                      {fmtMoney(total, "GBP")}
                    </td>
                    <td className="py-1.5 px-2">
                      <EditableNumber value={r.income} onChange={(v) => patchIncome(r.id, v)} className="text-xs w-20" />
                    </td>
                    <td
                      className="py-1.5 px-2 text-right font-semibold"
                      style={{ color: savings < 0 ? T.danger : T.sage, fontVariantNumeric: "tabular-nums" }}
                    >
                      {fmtMoney(savings, "GBP")}
                    </td>
                    <td className="py-1.5 px-1">
                      <IconBtn onClick={() => removeMonth(r.id)} danger title="Remove month">
                        <Trash2 size={12} />
                      </IconBtn>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button onClick={addMonth} className="mt-3 ml-2 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-black/10" style={{ color: T.gold }}>
          <Plus size={14} /> Add month
        </button>
      </Card>
    </div>
  );
}


/* ===== p13_inspiration.jsx ===== */
function InspoImage({ url }) {
  const [broken, setBroken] = useState(false);
  if (!url || broken) {
    return (
      <div
        className="w-full aspect-[4/3] rounded-xl flex items-center justify-center"
        style={{ background: T.bgSoft, border: `1px dashed ${T.lineSoft}` }}
      >
        <ImageOff size={22} color={T.inkFaint} />
      </div>
    );
  }
  return (
    <div className="w-full aspect-[4/3] rounded-xl overflow-hidden" style={{ background: T.bgSoft }}>
      <img src={url} alt="" onError={() => setBroken(true)} className="w-full h-full object-cover" />
    </div>
  );
}

function InspoCard({ item, onChange, onRemove, accent }) {
  const [editing, setEditing] = useState(!item.imageUrl && !item.title);

  if (editing) {
    return (
      <div className="rounded-2xl p-4 space-y-2.5" style={{ background: T.bgSoft, border: `1px solid ${accent}55` }}>
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: accent }}>
            New inspo
          </div>
          <IconBtn onClick={() => onRemove(item.id)} danger title="Remove">
            <Trash2 size={13} />
          </IconBtn>
        </div>
        <input
          value={item.imageUrl || ""}
          onChange={(e) => onChange(item.id, { imageUrl: e.target.value })}
          placeholder="Image URL (paste a link to a photo)"
          className="w-full text-xs bg-transparent outline-none rounded-lg px-2.5 py-2 placeholder:opacity-40"
          style={{ color: T.ink, border: `1px solid ${T.lineSoft}` }}
        />
        <InspoImage url={item.imageUrl} />
        <input
          value={item.title || ""}
          onChange={(e) => onChange(item.id, { title: e.target.value })}
          placeholder="Title (e.g. Terracotta + sage kosha)"
          className="w-full text-sm bg-transparent outline-none rounded-lg px-2.5 py-2 placeholder:opacity-40"
          style={{ color: T.ink, border: `1px solid ${T.lineSoft}` }}
        />
        <input
          value={item.link || ""}
          onChange={(e) => onChange(item.id, { link: e.target.value })}
          placeholder="Link (Pinterest board, store page, etc.)"
          className="w-full text-xs bg-transparent outline-none rounded-lg px-2.5 py-2 placeholder:opacity-40"
          style={{ color: T.ink, border: `1px solid ${T.lineSoft}` }}
        />
        <textarea
          value={item.note || ""}
          onChange={(e) => onChange(item.id, { note: e.target.value })}
          placeholder="Notes (why you like it, price, size...)"
          rows={2}
          className="w-full text-xs bg-transparent outline-none rounded-lg px-2.5 py-2 placeholder:opacity-40"
          style={{ color: T.ink, border: `1px solid ${T.lineSoft}` }}
        />
        <button
          onClick={() => setEditing(false)}
          className="w-full text-xs font-semibold rounded-lg py-1.5 transition-colors hover:opacity-90"
          style={{ background: accent, color: T.onAccent }}
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden group relative" style={{ background: T.bgSoft, border: `1px solid ${T.lineSoft}` }}>
      <div className="p-2.5 pb-0">
        <InspoImage url={item.imageUrl} />
      </div>
      <div className="p-3.5">
        <div className="text-sm font-semibold" style={{ color: T.ink, fontFamily: "Fraunces, serif" }}>
          {item.title || "Untitled"}
        </div>
        {item.note && (
          <div className="text-xs mt-1" style={{ color: T.inkMute }}>
            {item.note}
          </div>
        )}
        <div className="flex items-center gap-3 mt-2.5">
          {item.link && (
            <a
              href={item.link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold"
              style={{ color: accent }}
            >
              <ExternalLink size={12} /> Open link
            </a>
          )}
          <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-xs font-semibold ml-auto" style={{ color: T.inkFaint }}>
            <Pencil size={12} /> Edit
          </button>
          <IconBtn onClick={() => onRemove(item.id)} danger title="Remove">
            <Trash2 size={13} />
          </IconBtn>
        </div>
      </div>
    </div>
  );
}

function InspirationBoard({ inspiration, setInspiration }) {
  const [activeCat, setActiveCat] = useState(inspiration.categories[0]?.id);
  const cat = inspiration.categories.find((c) => c.id === activeCat) || inspiration.categories[0];

  const patchCategory = (id, p) =>
    setInspiration((prev) => ({ ...prev, categories: prev.categories.map((c) => (c.id === id ? { ...c, ...p } : c)) }));
  const addCategory = () => {
    const id = uid("cat");
    setInspiration((prev) => ({ ...prev, categories: [...prev.categories, { id, name: "New category", items: [] }] }));
    setActiveCat(id);
  };
  const removeCategory = (id) => {
    setInspiration((prev) => ({ ...prev, categories: prev.categories.filter((c) => c.id !== id) }));
    if (activeCat === id) setActiveCat(inspiration.categories[0]?.id);
  };

  const patchItem = (id, p) =>
    patchCategory(cat.id, { items: cat.items.map((it) => (it.id === id ? { ...it, ...p } : it)) });
  const addItem = () =>
    patchCategory(cat.id, { items: [...cat.items, { id: uid("in"), imageUrl: "", title: "", link: "", note: "" }] });
  const removeItem = (id) => patchCategory(cat.id, { items: cat.items.filter((it) => it.id !== id) });

  if (!cat) {
    return (
      <div>
        <SectionHeading eyebrow="Mood boards, links & swatches" title="Inspiration" />
        <button onClick={addCategory} className="text-sm font-semibold px-4 py-2 rounded-lg" style={{ background: T.gold, color: T.onAccent }}>
          + Add your first category
        </button>
      </div>
    );
  }

  return (
    <div>
      <SectionHeading eyebrow="Mood boards, links & swatches" title="Inspiration" />

      <div className="flex flex-wrap gap-2 mb-6">
        {inspiration.categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCat(c.id)}
            className="px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-colors"
            style={{
              background: c.id === cat.id ? T.gold : T.bgSoft,
              color: c.id === cat.id ? T.onAccent : T.inkMute,
              border: `1px solid ${c.id === cat.id ? T.gold : T.lineSoft}`,
            }}
          >
            {c.name}
            <span className="ml-1.5 opacity-60 text-xs">{c.items.length}</span>
          </button>
        ))}
        <button
          onClick={addCategory}
          className="px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors hover:bg-black/5"
          style={{ color: T.gold, border: `1px dashed ${T.lineSoft}` }}
        >
          <Plus size={14} className="inline -mt-0.5" /> Category
        </button>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <EditableText
          value={cat.name}
          onChange={(v) => patchCategory(cat.id, { name: v })}
          className="text-lg font-semibold w-64"
        />
        <button onClick={() => removeCategory(cat.id)} className="text-xs ml-auto flex items-center gap-1" style={{ color: T.danger }}>
          <X size={13} /> Remove this category
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cat.items.map((it) => (
          <InspoCard key={it.id} item={it} onChange={patchItem} onRemove={removeItem} accent={T.gold} />
        ))}
        <button
          onClick={addItem}
          className="rounded-2xl flex flex-col items-center justify-center gap-2 py-10 transition-colors hover:bg-black/5"
          style={{ border: `1.5px dashed ${T.lineSoft}`, color: T.inkFaint }}
        >
          <Plus size={22} />
          <span className="text-sm font-medium">Add inspo</span>
        </button>
      </div>
    </div>
  );
}


/* ===== p12_app.jsx ===== */
const NAV = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "wedding", label: "Wedding Budget", icon: Wallet },
  { key: "vendors", label: "Vendors", icon: Store },
  { key: "inspiration", label: "Inspiration", icon: Palette },
  { key: "honeymoon", label: "Honeymoon", icon: Waves },
  { key: "bach", label: "Bach Trips", icon: Plane },
  { key: "gifts", label: "Gifts", icon: Gift },
  { key: "todos", label: "To-Dos", icon: ListChecks },
  { key: "bookings", label: "Bookings", icon: ClipboardCheck },
  { key: "monthly", label: "Monthly Budget", icon: PiggyBank },
];

function App() {
  useFonts();
  useMobileSafety();
  const [page, setPage] = useState("dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [honeymoonChoice, setHoneymoonChoice] = useState("B");
  const [itineraryChoice, setItineraryChoice] = useState("B");
  const [syncing, setSyncing] = useState(false);

  const [weddingBudget, setWeddingBudget, l1, reload1] = useShared("wt-wedding-budget", WEDDING_BUDGET_SEED);
  const [vendors, setVendors, l2, reload2] = useShared("wt-vendors", VENDOR_DIRECTORY_SEED);
  const [honeymoonA, setHoneymoonA, l3, reload3] = useShared("wt-honeymoon-a", HONEYMOON_BUDGET_A_SEED);
  const [honeymoonB, setHoneymoonB, l4, reload4] = useShared("wt-honeymoon-b", HONEYMOON_BUDGET_B_SEED);
  const [itineraryA, setItineraryA, l5, reload5] = useShared("wt-itinerary-a", ITINERARY_A_SEED);
  const [itineraryB, setItineraryB, l6, reload6] = useShared("wt-itinerary-b", ITINERARY_B_SEED);
  const [bachGroom, setBachGroom, l7, reload7] = useShared("wt-bach-groom", BACH_GROOMSMEN_SEED);
  const [bachBride, setBachBride, l8, reload8] = useShared("wt-bach-bride", BACH_BRIDESMAIDS_SEED);
  const [airbnbOptions, setAirbnbOptions, l9, reload9] = useShared("wt-airbnb-options", BACH_AIRBNB_OPTIONS_SEED);
  const [todos, setTodos, l10, reload10] = useShared("wt-todos", TODOS_SEED);
  const [bookings, setBookings, l11, reload11] = useShared("wt-bookings", BOOKING_TRACKER_SEED);
  const [monthly, setMonthly, l12, reload12] = useShared("wt-monthly-budget", MONTHLY_BUDGET_SEED);
  const [inspiration, setInspiration, l13, reload13] = useShared("wt-inspiration", INSPIRATION_SEED);
  const [keyDates, setKeyDates, l14, reload14] = useShared("wt-key-dates", KEY_DATES_SEED);
  const [giftsGroom, setGiftsGroom, l15, reload15] = useShared("wt-gifts-groom", GIFTS_GROOMSMEN_SEED);
  const [giftsBride, setGiftsBride, l16, reload16] = useShared("wt-gifts-bride", GIFTS_BRIDESMAIDS_SEED);

  const allLoaded = [l1, l2, l3, l4, l5, l6, l7, l8, l9, l10, l11, l12, l13, l14, l15, l16].every(Boolean);

  const refreshAll = async () => {
    setSyncing(true);
    await Promise.all([
      reload1(), reload2(), reload3(), reload4(), reload5(), reload6(), reload7(), reload8(),
      reload9(), reload10(), reload11(), reload12(), reload13(), reload14(), reload15(), reload16(),
    ]);
    setTimeout(() => setSyncing(false), 500);
  };

  const goTo = (key) => {
    setPage(key);
    setMobileNavOpen(false);
  };

  if (!allLoaded) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: T.bg }}>
        <div className="text-sm animate-pulse" style={{ color: T.inkMute, fontFamily: "Manrope, sans-serif" }}>
          Loading your tracker...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full flex" style={{ background: T.bg, fontFamily: "Manrope, sans-serif" }}>
      {/* Sidebar - desktop */}
      <div
        className="hidden md:flex flex-col w-60 shrink-0 p-5"
        style={{ background: T.bgSoft, borderRight: `1px solid ${T.lineSoft}` }}
      >
        <div className="mb-8 px-1">
          <div className="text-xs tracking-[0.2em] uppercase font-semibold" style={{ color: T.gold }}>
            Our Journey
          </div>
          <div className="text-lg mt-0.5" style={{ color: T.ink, fontFamily: "Fraunces, serif", fontWeight: 600 }}>
            Wedding Tracker
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = page === n.key;
            return (
              <button
                key={n.key}
                onClick={() => goTo(n.key)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
                style={{ background: active ? T.card : "transparent", color: active ? T.gold : T.inkMute }}
              >
                <Icon size={16} />
                {n.label}
              </button>
            );
          })}
        </nav>
        <button
          onClick={refreshAll}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors hover:bg-black/5"
          style={{ color: T.inkFaint }}
        >
          <RefreshCw size={13} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Syncing..." : "Refresh shared data"}
        </button>
      </div>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3" style={{ background: T.bgSoft, borderBottom: `1px solid ${T.lineSoft}` }}>
        <div className="text-sm" style={{ color: T.ink, fontFamily: "Fraunces, serif", fontWeight: 600 }}>
          Our Journey
        </div>
        <button onClick={() => setMobileNavOpen((o) => !o)} style={{ color: T.ink }}>
          {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {mobileNavOpen && (
        <div className="md:hidden fixed top-12 left-0 right-0 z-20 p-3 space-y-1" style={{ background: T.bgSoft, borderBottom: `1px solid ${T.lineSoft}` }}>
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = page === n.key;
            return (
              <button
                key={n.key}
                onClick={() => goTo(n.key)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium"
                style={{ background: active ? T.card : "transparent", color: active ? T.gold : T.inkMute }}
              >
                <Icon size={16} />
                {n.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0 p-5 sm:p-8 md:p-10 pt-16 md:pt-10 max-w-6xl mx-auto w-full">
        {page === "dashboard" && (
          <Dashboard
            weddingBudget={weddingBudget}
            honeymoonA={honeymoonA}
            honeymoonB={honeymoonB}
            honeymoonChoice={honeymoonChoice}
            bachGroom={bachGroom}
            bachBride={bachBride}
            keyDates={keyDates}
            setKeyDates={setKeyDates}
            goTo={goTo}
          />
        )}
        {page === "wedding" && <WeddingBudget wb={weddingBudget} setWb={setWeddingBudget} />}
        {page === "vendors" && <VendorDirectory vendors={vendors} setVendors={setVendors} />}
        {page === "inspiration" && <InspirationBoard inspiration={inspiration} setInspiration={setInspiration} />}
        {page === "honeymoon" && (
          <Honeymoon
            honeymoonA={honeymoonA}
            setHoneymoonA={setHoneymoonA}
            honeymoonB={honeymoonB}
            setHoneymoonB={setHoneymoonB}
            choice={honeymoonChoice}
            setChoice={(c) => {
              setHoneymoonChoice(c);
              setItineraryChoice(c);
            }}
            itineraryA={itineraryA}
            setItineraryA={setItineraryA}
            itineraryB={itineraryB}
            setItineraryB={setItineraryB}
          />
        )}
        {page === "bach" && (
          <BachTrips
            bachGroom={bachGroom}
            setBachGroom={setBachGroom}
            bachBride={bachBride}
            setBachBride={setBachBride}
            airbnbOptions={airbnbOptions}
            setAirbnbOptions={setAirbnbOptions}
          />
        )}
        {page === "gifts" && (
          <Gifts giftsGroom={giftsGroom} setGiftsGroom={setGiftsGroom} giftsBride={giftsBride} setGiftsBride={setGiftsBride} />
        )}
        {page === "todos" && <Todos todos={todos} setTodos={setTodos} />}
        {page === "bookings" && <BookingTracker bookings={bookings} setBookings={setBookings} />}
        {page === "monthly" && <MonthlyBudget monthly={monthly} setMonthly={setMonthly} />}

        <div className="mt-12 pb-4 text-center text-xs" style={{ color: T.inkFaint }}>
          Shared with your fiance - changes save automatically and sync live across both your devices.
        </div>
      </div>
    </div>
  );
}


export default App;

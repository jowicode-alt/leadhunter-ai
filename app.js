import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDocs, collection, serverTimestamp, addDoc, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

/* Firebase Web App config is public client config. Never put service-account keys here. */
const firebaseConfig = {
  apiKey: "AIzaSyD7Z0zWtLU3ZGvfa67En5eKt9NNFQlC40Q",
  authDomain: "leadhunter-ai-8ac33.firebaseapp.com",
  projectId: "leadhunter-ai-8ac33",
  storageBucket: "leadhunter-ai-8ac33.firebasestorage.app",
  messagingSenderId: "290171538413",
  appId: "1:290171538413:web:b1fce1118a87b4ba44f5e4"
};
const configReady = Boolean(firebaseConfig.apiKey && firebaseConfig.appId);
const $ = (id) => document.getElementById(id);
let creatingAccount = false, auth = null, db = null, activeUid = null;

function message(id, text, good = false) {
  const el = $(id); if (!el) return;
  el.textContent = text; el.style.color = good ? "#14764e" : "";
}
function show(el, visible) { el.classList.toggle("hidden", !visible); }
const authPanel = $("auth-panel"), workspace = $("workspace"), loginTab = $("login-tab"), signupTab = $("signup-tab"), submit = $("auth-submit");

function setAuthMode(create) {
  creatingAccount = create;
  loginTab.classList.toggle("active", !create); signupTab.classList.toggle("active", create);
  submit.textContent = create ? "Create account" : "Sign in";
  $("password").autocomplete = create ? "new-password" : "current-password";
  message("auth-message", "");
}
loginTab.addEventListener("click", () => setAuthMode(false));
signupTab.addEventListener("click", () => setAuthMode(true));

if (!configReady) {
  message("auth-message", "Setup required: configure the Firebase Web App and enable Email/Password sign-in.");
  submit.disabled = true; $("reset-password").disabled = true;
} else {
  try {
    const app = initializeApp(firebaseConfig); auth = getAuth(app); db = getFirestore(app);
    $("auth-form").addEventListener("submit", async (event) => {
      event.preventDefault(); submit.disabled = true; message("auth-message", "");
      try {
        const email = $("email").value.trim(), password = $("password").value;
        if (creatingAccount) {
          const credential = await createUserWithEmailAndPassword(auth, email, password);
          await setDoc(doc(db, "users", credential.user.uid), {
            email: credential.user.email, createdAt: serverTimestamp(), plan: "free"
          }, { merge: true });
          message("auth-message", "Account created. Loading your workspace…", true);
        } else await signInWithEmailAndPassword(auth, email, password);
      } catch (error) {
        const messages = {
          "auth/email-already-in-use": "An account already exists for this email. Try signing in.",
          "auth/invalid-email": "Enter a valid email address.",
          "auth/weak-password": "Use a password with at least 6 characters.",
          "auth/invalid-credential": "Email or password is incorrect.",
          "auth/too-many-requests": "Too many attempts. Wait a while and try again.",
          "auth/operation-not-allowed": "Enable Email/Password sign-in in Firebase Authentication."
        };
        message("auth-message", messages[error.code] || "Could not complete sign-in. Check Firebase setup and try again.");
      } finally { submit.disabled = false; }
    });
    $("reset-password").addEventListener("click", async () => {
      const email = $("email").value.trim();
      if (!email) return message("auth-message", "Enter your email address first.");
      try {
        await sendPasswordResetEmail(auth, email);
        message("auth-message", "If an account exists for that email, a password reset message will be sent.", true);
      } catch { message("auth-message", "Could not request a reset. Check the email and Firebase Authentication settings."); }
    });
    $("signout-btn").addEventListener("click", () => signOut(auth));
    onAuthStateChanged(auth, async (user) => {
      activeUid = user?.uid || null;
      show(authPanel, !user); show(workspace, Boolean(user)); show($("signout-btn"), Boolean(user));
      $("user-label").textContent = user ? user.email : "Not signed in";
      if (user) { await loadCounts(user.uid); await loadSavedProspects(user.uid); }
    });
  } catch { message("auth-message", "Firebase could not initialize. Verify the Web App configuration in app.js."); }
}

async function loadCounts(uid) {
  try {
    const [prospects, campaigns] = await Promise.all([
      getDocs(collection(db, "users", uid, "prospects")),
      getDocs(collection(db, "users", uid, "campaigns"))
    ]);
    $("prospect-count").textContent = String(prospects.size);
    $("campaign-count").textContent = String(campaigns.size);
  } catch { message("discover-message", "Signed in, but workspace data could not load. Check Firestore setup and security rules."); }
}
function normalizeWebsite(raw) {
  let value = raw.trim();
  if (!value) throw new Error("Enter your business website.");
  if (!/^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(value)) value = "https://" + value;
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || !url.hostname.includes(".") || url.hostname.startsWith(".") || url.hostname.endsWith(".")) {
    throw new Error("Enter a domain such as jumia.com.");
  }
  return url;
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}
function categoryTags(description) {
  const text = description.toLowerCase();
  if (/hotel|lodge|guest.?house|accommodation|resort/.test(text)) return ['["tourism"~"hotel|guest_house|motel|hostel|apartment"]','["tourism"="hotel"]'];
  if (/restaurant|cafe|coffee|bar|eatery|food/.test(text)) return ['["amenity"~"restaurant|cafe|fast_food|bar|pub"]'];
  if (/shop|retail|store|supermarket|boutique|clothing|fashion|jumia/.test(text)) return ['["shop"]'];
  if (/school|university|college|education/.test(text)) return ['["amenity"~"school|college|university|kindergarten"]'];
  if (/clinic|hospital|health|pharmacy|medical/.test(text)) return ['["amenity"~"clinic|hospital|pharmacy|doctors"]'];
  if (/salon|barber|beauty|spa/.test(text)) return ['["shop"~"hairdresser|beauty"]','["leisure"="beauty_salon"]'];
  if (/real estate|property|estate agent/.test(text)) return ['["office"="estate_agent"]'];
  if (/car|garage|mechanic|auto/.test(text)) return ['["shop"~"car|car_repair|tyres"]','["amenity"="car_repair"]'];
  if (/gym|fitness/.test(text)) return ['["leisure"="fitness_centre"]'];
  if (/bank|finance|accounting/.test(text)) return ['["amenity"="bank"]','["office"="accountant"]'];
  return ['["office"]','["shop"]','["amenity"~"restaurant|cafe|hotel|clinic|school"]'];
}
async function getLocationBounds(location) {
  const endpoint = "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=" + encodeURIComponent(location);
  const response = await fetch(endpoint, { headers: { "Accept":"application/json" } });
  if (!response.ok) throw new Error("The location lookup service is temporarily unavailable. Try again later.");
  const places = await response.json();
  if (!places.length || !places[0].boundingbox) throw new Error("Could not find that target location. Try a city and country, e.g. Kampala, Uganda.");
  const b = places[0].boundingbox.map(Number);
  return { south:b[0], north:b[1], west:b[2], east:b[3], label:places[0].display_name };
}
async function searchPublicBusinesses(description, location) {
  const bounds = await getLocationBounds(location);
  const tags = categoryTags(description);
  const filters = tags.map(tag => `node${tag}(${bounds.south},${bounds.west},${bounds.north},${bounds.east});way${tag}(${bounds.south},${bounds.west},${bounds.north},${bounds.east});relation${tag}(${bounds.south},${bounds.west},${bounds.north},${bounds.east});`).join("");
  const queryText = `[out:json][timeout:25];(${filters});out center tags 60;`;
  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method:"POST", headers:{"Content-Type":"text/plain;charset=UTF-8","Accept":"application/json"}, body:queryText
  });
  if (!response.ok) throw new Error("The public business directory is busy right now. Wait a little and try again.");
  const data = await response.json();
  const seen = new Set();
  return (data.elements || []).map(item => {
    const tags = item.tags || {}, center = item.center || {};
    const lat = item.lat ?? center.lat, lon = item.lon ?? center.lon;
    return {
      id:String(item.type + "/" + item.id), name:tags.name || tags["name:en"] || "",
      website:tags.website || tags["contact:website"] || "",
      phone:tags.phone || tags["contact:phone"] || "",
      email:tags.email || tags["contact:email"] || "",
      category:tags.shop || tags.amenity || tags.tourism || tags.office || tags.leisure || "Business",
      address:[tags["addr:housenumber"],tags["addr:street"],tags["addr:city"] || tags["addr:town"] || tags["addr:village"]].filter(Boolean).join(" "),
      map:lat != null && lon != null ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}` : "",
      source:"OpenStreetMap", sourceUrl:`https://www.openstreetmap.org/${item.type}/${item.id}`
    };
  }).filter(item => {
    if (!item.name) return false;
    const key = item.name.toLowerCase() + "|" + item.address.toLowerCase();
    if (seen.has(key)) return false; seen.add(key); return true;
  }).slice(0,60).map(item => ({...item, targetLocation:bounds.label, searchedCategory:description}));
}
function renderResults(leads) {
  $("result-count").textContent = `${leads.length} found`;
  const container = $("results-list"); container.replaceChildren();
  if (!leads.length) {
    container.innerHTML = '<div class="empty-state"><h3>No named businesses found</h3><p>Try a broader location or a more general category. Public map listings do not cover every business.</p></div>';
    return;
  }
  for (const lead of leads) {
    const card = document.createElement("article"); card.className = "lead-card";
    const actions = [];
    if (lead.website) actions.push(`<a href="${escapeHtml(/^https?:\/\//i.test(lead.website) ? lead.website : "https://" + lead.website)}" target="_blank" rel="noopener noreferrer">Website</a>`);
    if (lead.phone) actions.push(`<a href="tel:${escapeHtml(lead.phone)}">Call ${escapeHtml(lead.phone)}</a>`);
    if (lead.email) actions.push(`<a href="mailto:${escapeHtml(lead.email)}">Email ${escapeHtml(lead.email)}</a>`);
    if (lead.map) actions.push(`<a href="${escapeHtml(lead.map)}" target="_blank" rel="noopener noreferrer">Map</a>`);
    card.innerHTML = `<h3>${escapeHtml(lead.name)}</h3><p><strong>Type:</strong> ${escapeHtml(lead.category)}</p>${lead.address ? `<p><strong>Address:</strong> ${escapeHtml(lead.address)}</p>` : ""}${actions.length ? `<div class="lead-actions">${actions.join("")}</div>` : '<p>No public contact details listed.</p>'}<span class="lead-source">Source: OpenStreetMap · public listing, not independently verified</span>`;
    container.appendChild(card);
  }
}
async function loadSavedProspects(uid) {
  try {
    const snap = await getDocs(query(collection(db,"users",uid,"prospects"),orderBy("savedAt","desc"),limit(60)));
    const saved = snap.docs.map(d => ({...d.data(), id:d.id}));
    if (saved.length) renderResults(saved);
  } catch { /* An empty workspace is normal; count load reports actual access errors. */ }
}
$("discover-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = $("discover-submit"); button.disabled = true;
  message("discover-message", "Searching public business listings…");
  try {
    if (!activeUid) throw new Error("Please sign in again before searching.");
    const website = normalizeWebsite($("website-url").value);
    $("website-url").value = website.href;
    const description = $("buyer-description").value.trim(), location = $("target-location").value.trim();
    if (!description) throw new Error("Describe the type of business you want to find.");
    if (!location) throw new Error("Enter a target location.");
    const leads = await searchPublicBusinesses(description, location);
    if (!leads.length) {
      renderResults([]);
      message("discover-message", "Search completed but no named listings matched. No leads were fabricated and no credits were used.");
      return;
    }
    let saved = 0;
    for (const lead of leads) {
      try {
        await addDoc(collection(db,"users",activeUid,"prospects"), {
          ...lead, businessWebsite:website.href, savedAt:serverTimestamp()
        });
        saved++;
      } catch { /* still show source-backed results if saving is denied */ }
    }
    renderResults(leads);
    await loadCounts(activeUid);
    message("discover-message", `Found ${leads.length} public listings for ${description} near ${location}. ${saved} saved to your workspace. These are directory leads, not verified decision-makers. No paid credits were used.`, true);
  } catch (error) {
    message("discover-message", error.message || "Search failed. Try again later. No credits were used.");
  } finally { button.disabled = false; }
});

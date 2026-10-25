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
  const queryText = `[out:json][timeout:25];(${filters});out body center 60;`;
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

function plainText(markdown) {
  return String(markdown || "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/[*_~`>#|]/g, " ")
    .replace(/\s+/g, " ").trim();
}
async function readWebsitePage(url) {
  const response = await fetch("https://r.jina.ai/" + url.href, {headers:{"Accept":"text/plain"}});
  if (!response.ok) throw new Error("Website reader returned HTTP " + response.status);
  const text = await response.text();
  if (!text || text.length < 80) throw new Error("The site returned too little readable text.");
  return text.slice(0,60000);
}
function extractInternalLinks(markdown, baseUrl) {
  const candidates = [...markdown.matchAll(/\[[^\]]+\]\((https?:\/\/[^)\s]+)\)/g)]
    .map(match => { try { return new URL(match[1].replace(/[),.;]+$/, ""), baseUrl); } catch { return null; } })
    .filter(link => link && link.hostname.replace(/^www\./,"") === baseUrl.hostname.replace(/^www\./,"") && !link.hash)
    .filter(link => !/\.(?:pdf|jpg|jpeg|png|gif|svg|webp|zip|mp4|mp3|css|js)(?:$|\?)/i.test(link.pathname))
    .filter((link,index,list) => list.findIndex(other => other.href === link.href) === index);
  const priority = /about|product|service|solution|business|shop|catalog|what-we-do|company|pricing|industry|sector|customer|client|category|brand|contact|faq|wholesale|partner/i;
  return candidates.sort((a,b) => Number(priority.test(b.pathname))-Number(priority.test(a.pathname))).slice(0,9);
}
async function searchExternalSources(url, title) {
  const host = url.hostname.replace(/^www\./,"");
  const safeTitle = (title && !/just a moment|security verification|captcha|favicon|unusual traffic/i.test(title)) ? title : "";
  const label = safeTitle || (host.split(".")[0] === "jumia" ? "Jumia" : host.split(".")[0].replace(/[-_]/g," "));
  const brand = label.replace(/\s*[|–—-].*$/, "").trim().slice(0,90);
  const queries = [
    '"' + host + '" products services customers',
    '"' + brand + '" what does it sell services',
    '"' + host + '" reviews products categories',
    '"' + brand + '" business customers suppliers partners'
  ];
  const results = [];
  for (const queryText of queries) {
    try {
      const searchUrl = "https://www.google.com/search?q=" + encodeURIComponent(queryText);
      const response = await fetch("https://r.jina.ai/" + searchUrl, {headers:{"Accept":"text/plain"}});
      if (!response.ok) throw new Error("Search reader HTTP " + response.status);
      const text = await response.text();
      results.push({query:queryText,text:text.slice(0,9000)});
    } catch (error) { results.push({query:queryText,text:"",error:error.message || "unavailable"}); }
  }
  return results;
}
async function analyzeWebsite(url) {
  const pages = [{url:url.href,markdown:await readWebsitePage(url)}];
  const links = extractInternalLinks(pages[0].markdown,url);
  for (const link of links) {
    try { pages.push({url:link.href,markdown:await readWebsitePage(link)}); } catch { /* skip blocked pages */ }
  }
  const homepage = pages[0].markdown;
  const rawTitle = (homepage.match(/^Title:\s*(.+)$/im)||[])[1]?.trim() || "";
  const title = /just a moment|security verification|captcha|favicon|unusual traffic/i.test(rawTitle) ? (url.hostname.replace(/^www\./,"").split(".")[0] === "jumia" ? "Jumia" : url.hostname.replace(/^www\./,"").split(".")[0]) : (rawTitle || url.hostname);
  const externalResults = await searchExternalSources(url,title);
  const usableExternalResults = externalResults.filter(item=>item.text && !/just a moment|security verification|verify you are not a bot|unusual traffic|captcha|access denied/i.test(item.text));
  const combined = pages.map(page=>page.markdown).concat(usableExternalResults.map(item=>item.text)).join("\n");
  const text = plainText(combined).slice(0,50000);
  const description = (combined.match(/^(?:Description|Meta Description):\s*(.+)$/im)||[])[1]?.trim() || "";
  const headings = [...combined.matchAll(/^#{1,3}\s+(.+)$/gm)].map(match=>plainText(match[1])).filter(item=>item.length>3 && item.length<100 && !/just a moment|security verification|captcha|favicon|unusual traffic/i.test(item)).slice(0,15);
  const industries = [
    ["e-commerce / online marketplace",/e-?commerce|online marketplace|online shop|online store|shop online|marketplace|shopping platform/i,"Retailers, wholesalers, distributors and brands"],
    ["retail / consumer products",/retail|clothing|fashion|electronics|homeware|groceries|consumer products|products for sale/i,"Retailers, wholesalers and bulk purchasers"],
    ["software / technology",/software|saas|technology platform|app development|cloud platform|IT services|digital solutions/i,"Companies needing software, technology or IT services"],
    ["professional services",/consulting|accounting|legal services|professional services|marketing agency|digital agency/i,"Small and medium businesses needing professional services"],
    ["construction / property",/construction|contractor|real estate|property development|building materials|architecture/i,"Property developers, contractors and building suppliers"],
    ["education",/school|university|training|education|courses|learning platform/i,"Schools, training centres and education organisations"],
    ["healthcare",/clinic|hospital|healthcare|medical|pharmacy|wellness|diagnostic/i,"Clinics, pharmacies, hospitals and healthcare organisations"],
    ["hospitality / tourism",/hotel|tourism|travel|accommodation|restaurant|hospitality|tour operator/i,"Hotels, lodges, tour operators and restaurants"],
    ["logistics / transport",/logistics|delivery|shipping|transport|freight|warehouse|courier/i,"Retailers, wholesalers, manufacturers and delivery buyers"],
    ["manufacturing / wholesale",/manufacturer|manufacturing|wholesale|factory|supplier|distribution/i,"Retailers, distributors, institutions and bulk buyers"],
    ["finance",/finance|financial services|insurance|banking|payments|lending/i,"Businesses and organisations needing financial services"],
    ["agriculture / food supply",/agriculture|farm|agri|produce|livestock|seed|fertilizer|food processing/i,"Farmers, agro-dealers, processors and institutional buyers"]
  ];
  const matched = industries.filter(item=>item[1].test(text));
  const leadQueries = [];
  for (const item of matched) {
    if (/e-commerce|retail/.test(item[0])) leadQueries.push("shops retailers wholesalers distributors");
    else if (/software|technology/.test(item[0])) leadQueries.push("businesses offices companies");
    else if (/professional services/.test(item[0])) leadQueries.push("small businesses offices");
    else if (/construction|property/.test(item[0])) leadQueries.push("construction companies property developers building suppliers");
    else if (/education/.test(item[0])) leadQueries.push("schools training centres");
    else if (/healthcare/.test(item[0])) leadQueries.push("clinics pharmacies hospitals");
    else if (/hospitality/.test(item[0])) leadQueries.push("hotels lodges restaurants");
    else if (/logistics/.test(item[0])) leadQueries.push("retailers wholesalers manufacturers");
    else if (/manufacturing/.test(item[0])) leadQueries.push("shops wholesalers distributors");
    else if (/finance/.test(item[0])) leadQueries.push("business offices");
    else if (/agriculture/.test(item[0])) leadQueries.push("agro dealers farms food processors");
  }
  const evidence = pages.map(item=>({source:item.url,title:(item.markdown.match(/^Title:\s*(.+)$/im)||[])[1]?.trim()||item.url}));
  usableExternalResults.forEach(item=>evidence.push({source:"External search: "+item.query,title:"External search results"}));
  return {
    url:url.href,title:title,description:description,pagesScanned:pages.length,
    headings:[...new Set(headings)].slice(0,10),matched:[...new Set(matched.map(item=>item[0]))],
    buyerSegments:[...new Set(matched.map(item=>item[2]))].slice(0,6),
    leadQueries:[...new Set(leadQueries)].slice(0,5),evidence:evidence.slice(0,20),
    excerpt:text.slice(0,1600),externalSearches:usableExternalResults.length,
    scannedAt:new Date().toISOString()
  };
}
function renderWebsiteAnalysis(analysis, warning = "") {
  const panel = $("website-analysis"); panel.classList.remove("hidden");
  const labels = analysis.matched.length ? analysis.matched.join(", ") : "No clear industry detected from available text";
  const segments = analysis.buyerSegments.length ? analysis.buyerSegments.join("; ") : "Not enough evidence to infer likely buyers confidently.";
  const sources = analysis.evidence.map(item=>item.title+" ("+item.source+")").slice(0,8).join(" · ");
  panel.innerHTML = '<div class="analysis-summary"><div class="eyebrow">WEBSITE & WEB RESEARCH</div><h3>'+escapeHtml(analysis.title)+'</h3><p><strong>Website pages read:</strong> '+analysis.pagesScanned+' · <strong>External searches with results:</strong> '+analysis.externalSearches+'</p>' +
    (analysis.description ? '<p><strong>Site description:</strong> '+escapeHtml(analysis.description.slice(0,500))+'</p>' : '')+
    '<p><strong>Likely business areas:</strong> '+escapeHtml(labels)+'</p>'+
    (analysis.headings.length ? '<p><strong>Products/services or key headings:</strong> '+escapeHtml(analysis.headings.join(" · "))+'</p>' : '')+
    '<p><strong>Potential customer groups inferred:</strong> '+escapeHtml(segments)+'</p>'+
    '<details><summary>Research sources and extracted text</summary><p>'+escapeHtml(sources)+'</p><p>'+escapeHtml(analysis.excerpt)+'</p></details>'+
    (warning ? '<p class="notice">'+escapeHtml(warning)+'</p>' : '')+
    '<small class="field-help">Automated public-web research can be incomplete. Some sites/search engines block requests; buyer fit is not guaranteed.</small></div>';
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
  $("website-analysis").classList.add("hidden");
  message("discover-message", "Reading your website and researching public web sources…");
  try {
    if (!activeUid) throw new Error("Please sign in again before searching.");
    const website = normalizeWebsite($("website-url").value);
    $("website-url").value = website.href;
    const location = $("target-location").value.trim();
    if (!location) throw new Error("Enter a target location.");
    const analysis = await analyzeWebsite(website);
    renderWebsiteAnalysis(analysis);
    if (!analysis.leadQueries.length) {
      renderResults([]);
      message("discover-message", "Website research finished, but the available sources did not provide enough evidence to infer customer groups. Review the scan panel. No credits were used.");
      return;
    }
    const allLeads = [], failures = [];
    for (const buyerType of analysis.leadQueries) {
      try {
        const results = await searchPublicBusinesses(buyerType, location);
        for (const lead of results) {
          lead.inferredBuyerGroup = buyerType;
          if (!allLeads.some(existing=>existing.id===lead.id || (existing.name.toLowerCase()===lead.name.toLowerCase() && existing.address.toLowerCase()===lead.address.toLowerCase()))) allLeads.push(lead);
        }
      } catch(error) { failures.push(error.message || "One category search failed"); }
    }
    const leads = allLeads.slice(0,60);
    if (!leads.length) {
      renderResults([]);
      message("discover-message", "Website research completed, but no matching named businesses were found in "+location+". Try a city or district instead of an entire country. "+(failures[0]||"")+" No credits were used.");
      return;
    }
    let saved=0;
    for (const lead of leads) {
      try {
        await addDoc(collection(db,"users",activeUid,"prospects"),{
          ...lead,businessWebsite:website.href,
          websiteAnalysis:{title:analysis.title,matched:analysis.matched,pagesScanned:analysis.pagesScanned,externalSearches:analysis.externalSearches,buyerSegments:analysis.buyerSegments},
          savedAt:serverTimestamp()
        });
        saved++;
      } catch { /* display source-backed results even if saving fails */ }
    }
    renderResults(leads); await loadCounts(activeUid);
    message("discover-message","Researched "+analysis.pagesScanned+" website pages and "+analysis.externalSearches+" external search results; found "+leads.length+" public listings across inferred customer groups. "+saved+" saved. Contacts and buyer fit are not independently verified. No paid credits were used.",true);
  } catch(error) {
    message("discover-message",error.message || "Website research failed. Try again later. No credits were used.");
  } finally { button.disabled=false; }
});

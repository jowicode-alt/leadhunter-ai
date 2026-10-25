import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDocs, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

/*
 * Copy your web app's config from Firebase Console > Project settings > Your apps.
 * Firebase web config is not a server secret. Never put service-account keys here.
 */
const firebaseConfig = {
  apiKey: "REPLACE_WITH_FIREBASE_WEB_API_KEY",
  authDomain: "leadhunter-ai-8ac33.firebaseapp.com",
  projectId: "leadhunter-ai-8ac33",
  appId: "REPLACE_WITH_FIREBASE_WEB_APP_ID"
};
const configReady = Boolean(
  firebaseConfig.apiKey && firebaseConfig.appId &&
  !firebaseConfig.apiKey.startsWith("REPLACE_") &&
  !firebaseConfig.appId.startsWith("REPLACE_")
);
const $ = (id) => document.getElementById(id);
let creatingAccount = false;
let auth = null;
let db = null;

function message(id, text, good = false) {
  const el = $(id);
  if (!el) return;
  el.textContent = text;
  el.style.color = good ? "#14764e" : "";
}
function show(el, visible) { el.classList.toggle("hidden", !visible); }

const authPanel = $("auth-panel");
const workspace = $("workspace");
const loginTab = $("login-tab");
const signupTab = $("signup-tab");
const submit = $("auth-submit");

function setAuthMode(create) {
  creatingAccount = create;
  loginTab.classList.toggle("active", !create);
  signupTab.classList.toggle("active", create);
  submit.textContent = create ? "Create account" : "Sign in";
  $("password").autocomplete = create ? "new-password" : "current-password";
  message("auth-message", "");
}
loginTab.addEventListener("click", () => setAuthMode(false));
signupTab.addEventListener("click", () => setAuthMode(true));

if (!configReady) {
  message("auth-message", "Setup required: add your Firebase Web App apiKey and appId in app.js, then enable Email/Password sign-in in Firebase Authentication.");
  submit.disabled = true;
  submit.title = "Firebase setup is not complete";
  $("reset-password").disabled = true;
} else {
  try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    $("auth-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      submit.disabled = true;
      message("auth-message", "");
      const email = $("email").value.trim();
      const password = $("password").value;
      try {
        if (creatingAccount) {
          const credential = await createUserWithEmailAndPassword(auth, email, password);
          await setDoc(doc(db, "users", credential.user.uid), {
            email: credential.user.email,
            createdAt: serverTimestamp(),
            plan: "free"
          }, { merge: true });
          message("auth-message", "Account created. Loading your workspace…", true);
        } else {
          await signInWithEmailAndPassword(auth, email, password);
        }
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
      } finally {
        submit.disabled = false;
      }
    });

    $("reset-password").addEventListener("click", async () => {
      const email = $("email").value.trim();
      if (!email) return message("auth-message", "Enter your email address first.");
      try {
        await sendPasswordResetEmail(auth, email);
        message("auth-message", "If an account exists for that email, a password reset message will be sent.", true);
      } catch {
        message("auth-message", "Could not request a reset. Check the email and Firebase Authentication settings.");
      }
    });

    $("signout-btn").addEventListener("click", () => signOut(auth));
    onAuthStateChanged(auth, async (user) => {
      show(authPanel, !user);
      show(workspace, Boolean(user));
      show($("signout-btn"), Boolean(user));
      $("user-label").textContent = user ? user.email : "Not signed in";
      if (user) await loadCounts(user.uid);
    });
  } catch {
    message("auth-message", "Firebase could not initialize. Verify the Web App configuration in app.js.");
  }
}

async function loadCounts(uid) {
  try {
    const [prospects, campaigns] = await Promise.all([
      getDocs(collection(db, "users", uid, "prospects")),
      getDocs(collection(db, "users", uid, "campaigns"))
    ]);
    $("prospect-count").textContent = String(prospects.size);
    $("campaign-count").textContent = String(campaigns.size);
  } catch {
    message("discover-message", "Signed in, but workspace data could not load. Check that the Firestore database and security rules are configured.");
  }
}

$("discover-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const raw = $("website-url").value.trim();
  try {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("protocol");
    message("discover-message", "Your URL is valid, but live website analysis and lead discovery are not connected yet. No leads were fabricated and no credits were used.");
  } catch {
    message("discover-message", "Enter a valid website URL beginning with https://");
  }
});

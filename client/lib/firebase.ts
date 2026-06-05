import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAh35xMFhuv3H-MZXCDYSGfSLerMiBI_YY",
  authDomain: "reamtv-23f3f.firebaseapp.com",
  projectId: "reamtv-23f3f",
  storageBucket: "reamtv-23f3f.firebasestorage.app",
  messagingSenderId: "557392018475",
  appId: "1:557392018475:web:8ee6ab09e3a44ea27abe6e",
  measurementId: "G-BW61ZQKXZD"
};

// Initialize Firebase (SSR-safe, reusing existing instances)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
const auth = getAuth(app);

// Initialize Analytics dynamically (client-side only)
let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { app, auth, analytics };

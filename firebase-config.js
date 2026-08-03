// ==========================================
// POCKETCHAIN - FIREBASE CONFIGURATION
// ==========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { getFirestore, getDocs, increment, serverTimestamp, Timestamp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAeE5T0Q0PQkQMouPlvcIsOvI3l9BgkwNA",
  authDomain: "pocketchain-e1f91.firebaseapp.com",
  projectId: "pocketchain-e1f91",
  storageBucket: "pocketchain-e1f91.firebasestorage.app",
  messagingSenderId: "514803824047",
  appId: "1:514803824047:web:51fa9d02ee389f072c6b5a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage, onAuthStateChanged, getDocs, increment, serverTimestamp };

export const getCurrentUser = () => auth.currentUser;
export const getCurrentUserId = () => auth.currentUser?.uid || null;
export const isAuthenticated = () => !!auth.currentUser;

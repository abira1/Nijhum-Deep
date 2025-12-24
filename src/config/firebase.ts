// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase, Database } from "firebase/database";
import { getAuth, Auth, GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAD7dH4Wl7j0cu9coTk_wWn1YJzCn8Bmgs",
  authDomain: "nijhum-dip.firebaseapp.com",
  databaseURL: "https://nijhum-dip-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "nijhum-dip",
  storageBucket: "nijhum-dip.firebasestorage.app",
  messagingSenderId: "430432374261",
  appId: "1:430432374261:web:8a099f2cedc857da4be4bc",
  measurementId: "G-KGHXSFLT6H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics (only in browser environment)
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

// Initialize Realtime Database and get a reference to the service
const database: Database = getDatabase(app);

// Initialize Firebase Authentication and get a reference to the service
const auth: Auth = getAuth(app);

// Initialize Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

export { app, analytics, database, auth, googleProvider };
export default database;

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyC6Y9Je9xlHZ23eU24v0eGZSI5h6bhQRSI",
    authDomain: "zafira-contratos.firebaseapp.com",
    projectId: "zafira-contratos",
    storageBucket: "zafira-contratos.firebasestorage.app",
    messagingSenderId: "854314696178",
    appId: "1:854314696178:web:6fc7c1672980b515dd3f6b",
    measurementId: "G-XC05P78598"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Initialize Firestore service
export const db = getFirestore(app);

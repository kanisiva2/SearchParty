// firebaseConfig.ts

import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';

// Your Firebase configuration object
const firebaseConfig = {
  apiKey: "AIzaSyBKKWmBO-KzpC7LDZ9rx_24TqV64SNvbDE",
  authDomain: "searchparty-4b997.firebaseapp.com",
  projectId: "searchparty-4b997",
  storageBucket: "searchparty-4b997.firebasestorage.app",
  messagingSenderId: "1055092420865",
  appId: "1:1055092420865:web:153e1a097fe854a981ab00",
  measurementId: "G-DQHSSBN7MZ"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);  // Initialize Firebase app with config
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
export const db = getFirestore(app);  // Pass the app to getFirestore

// // Export the necessary Firebase services
// export { auth, db };

// ============================================================
//  🔥 CONFIGURATION FIREBASE
//  1. Va sur https://console.firebase.google.com
//  2. Crée un projet (gratuit)
//  3. Clique sur "Ajouter une app Web" (icône </>)
//  4. Copie les valeurs affichées ici à la place des "TON_..."
//  5. Dans Firebase : Realtime Database → Créer une base de données
//     → Choisir le mode TEST pour commencer
// ============================================================

import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey:            "TON_API_KEY",
  authDomain:        "TON_PROJECT_ID.firebaseapp.com",
  databaseURL:       "https://TON_PROJECT_ID-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "TON_PROJECT_ID",
  storageBucket:     "TON_PROJECT_ID.appspot.com",
  messagingSenderId: "TON_SENDER_ID",
  appId:             "TON_APP_ID"
}

const app = initializeApp(firebaseConfig)
export const db = getDatabase(app)

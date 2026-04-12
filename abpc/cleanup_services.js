import "dotenv/config";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function normalizeName(name) {
  if (!name) return "";
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function cleanupDuplicates() {
  console.log("Fetching services...");
  const snap = await getDocs(collection(db, "services"));
  const groups = {};

  snap.docs.forEach(docSnap => {
    const data = docSnap.data();
    const name = data.serviceName || data.name || "";
    const norm = normalizeName(name);
    
    if (!norm) return;
    
    if (!groups[norm]) {
      groups[norm] = [];
    }
    groups[norm].push({ id: docSnap.id, data });
  });

  console.log(`Found ${Object.keys(groups).length} unique services.`);

  for (const norm of Object.keys(groups)) {
    const group = groups[norm];
    if (group.length > 1) {
      console.log(`\nFound duplicate for: ${group[0].data.serviceName || group[0].data.name} (${group.length} duplicates)`);
      
      // Sort to make the oldest one the primary, based on createdAt 
      group.sort((a, b) => {
         const tA = a.data.createdAt?.toMillis ? a.data.createdAt.toMillis() : 0;
         const tB = b.data.createdAt?.toMillis ? b.data.createdAt.toMillis() : 0;
         return tA - tB;
      });

      const primary = group[0];
      const duplicates = group.slice(1);

      let mergedUnitOptions = new Set(primary.data.unitOptions || []);
      let mergedUnitPrices = { ...(primary.data.unitPrices || {}) };

      // Merge data into the primary from duplicates
      for (const dup of duplicates) {
        if (dup.data.unitOptions) {
          dup.data.unitOptions.forEach(opt => mergedUnitOptions.add(opt));
        }
        if (dup.data.unitPrices) {
          mergedUnitPrices = { ...mergedUnitPrices, ...dup.data.unitPrices };
        }
      }

      // Update primary document
      console.log(`Updating primary ${primary.id}...`);
      await updateDoc(doc(db, "services", primary.id), {
        unitOptions: Array.from(mergedUnitOptions),
        unitPrices: mergedUnitPrices
      });

      // Delete the duplicates
      for (const dup of duplicates) {
        console.log(`Deleting duplicate ${dup.id}...`);
        await deleteDoc(doc(db, "services", dup.id));
      }
      
      console.log("Merge and Cleanup completed for this service.");
    }
  }

  console.log("\nAll Done!");
  process.exit(0);
}

cleanupDuplicates().catch(console.error);

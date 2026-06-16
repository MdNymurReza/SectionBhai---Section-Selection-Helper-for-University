import { db } from "./src/server/db";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";

async function wipe() {
  const collectionsToWipe = ["courses", "teachers", "sections", "schedules", "ratings", "saved_routines"];
  
  for (const coll of collectionsToWipe) {
    console.log(`Wiping ${coll}...`);
    const snapshot = await getDocs(collection(db, coll));
    let count = 0;
    for (const d of snapshot.docs) {
      await deleteDoc(doc(db, coll, d.id));
      count++;
    }
    console.log(`Cleared ${count} items from ${coll}!`);
  }
  console.log("Database wiped successfully.");
  process.exit(0);
}

wipe().catch(console.error);

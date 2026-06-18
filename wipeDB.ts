import { getDb, DB } from "./src/server/db";

async function wipe() {
  // Initialize DB and connection
  await DB.init();
  const db = getDb();
  
  const collectionsToWipe = ["courses", "teachers", "sections", "schedules", "ratings", "saved_routines"];
  
  for (const coll of collectionsToWipe) {
    console.log(`Wiping ${coll}...`);
    const snapshot = await db.collection(coll).get();
    let count = 0;
    for (const d of snapshot.docs) {
      await d.ref.delete();
      count++;
    }
    console.log(`Cleared ${count} items from ${coll}!`);
  }
  console.log("Database wiped successfully.");
  process.exit(0);
}

wipe().catch(console.error);

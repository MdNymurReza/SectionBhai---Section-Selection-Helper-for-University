/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  User,
  StudentProfile,
  AdminProfile,
  Trimester,
  Course,
  Teacher,
  Section,
  ScheduleItem,
  TeacherRating,
  RoutinePreferences,
  GeneratedRoutine
} from "../types";

// Load Firebase configuration safely
let serviceAccount: any = null;
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } catch (e) {
    console.warn("⚠️ Invalid JSON in FIREBASE_SERVICE_ACCOUNT_JSON");
  }
} else {
  // Local fallback: Read from file if available
  const saPath = path.join(process.cwd(), "service-account.json");
  if (fs.existsSync(saPath)) {
    serviceAccount = JSON.parse(fs.readFileSync(saPath, "utf-8"));
  }
}

// Initialize Firebase Admin
try {
  if (serviceAccount) {
    initializeApp({
      credential: cert(serviceAccount)
    });
    console.log("Firebase Admin initialized with service account.");
  } else if (process.env.FIREBASE_CONFIG_JSON || fs.existsSync(path.join(process.cwd(), "firebase-applet-config.json"))) {
    // If no service account is provided, but a client config is found, Vercel/GCP might use Application Default Credentials.
    initializeApp();
    console.log("Firebase Admin initialized (Application Default Credentials). Warning: Ensure you provide FIREBASE_SERVICE_ACCOUNT_JSON in production for full security.");
  } else {
    initializeApp();
  }
} catch (error: any) {
  if (error.code !== "app/duplicate-app") {
    console.error("Firebase Admin Initialization Error:", error);
  }
}

let dbInstance: admin.firestore.Firestore | null = null;
try {
  dbInstance = getFirestore();
} catch (e) {
  console.warn("Firestore could not be initialized at module load.");
}

export const getDb = () => {
  if (!dbInstance) {
    throw new Error("Database is not initialized. Please configure Firebase Service Account.");
  }
  return dbInstance;
};

let firestoreEnabled = true;
function disableFirestore(reason: string) {
  if (firestoreEnabled) {
    firestoreEnabled = false;
    console.warn(`🚫 Firestore access disabled: ${reason}`);
    console.warn("   The app will continue using in-memory data only.");
  }
}

// Global in-memory cache for ultra-fast, non-blocking synchronous returns in App endpoints
const memCache: Record<string, any[]> = {};

// Sync collection mutation back to Cloud Firestore
async function syncCollectionToFirestore(tableName: string, data: any[]): Promise<void> {
  if (!firestoreEnabled) {
    return;
  }

  const newDocIds = new Set<string>();

  try {
    // 1. Fetch current document IDs from the Firestore collection to plan deletes
    let currentDocIds = new Set<string>();
    try {
      const currentSnapshot = await getDb().collection(tableName).get();
      currentSnapshot.forEach((d) => currentDocIds.add(d.id));
    } catch (err: any) {
      const msg = err?.message || "Unknown error";
      console.warn(`⚠️  Could not sync '${tableName}' to Firestore (read phase): ${msg}`);
      return; // Exit gracefully
    }

    // 2. Perform set/update and delete in batches of 400 documents (limit is 500)
    let batch = getDb().batch();
    let count = 0;

    for (const item of data) {
      const docId = item.id || item.studentId;
      if (!docId) continue;
      newDocIds.add(docId);

      const docRef = getDb().collection(tableName).doc(docId);
      batch.set(docRef, item);
      count++;

      if (count >= 400) {
        await batch.commit();
        batch = getDb().batch();
        count = 0;
      }
    }

    // 3. Purge elements that were deleted
    for (const oldId of currentDocIds) {
      if (!newDocIds.has(oldId)) {
        const docRef = getDb().collection(tableName).doc(oldId);
        batch.delete(docRef);
        count++;

        if (count >= 400) {
          await batch.commit();
          batch = getDb().batch();
          count = 0;
        }
      }
    }

    // Commit any remaining operations
    if (count > 0) {
      await batch.commit();
    }
    
    console.log(`Synced table '${tableName}' to Firestore successfully (${newDocIds.size} records active).`);
  } catch (err: any) {
    console.warn(`⚠️  syncCollectionToFirestore failed for table ${tableName}. Using in-memory/local cache only. Error: ${err.message || err}`);
  }
}

// Complete Schema Database Object
export const DB = {
  // Synchronous cached retrieval for backward-compatibility & fast response
  getCollection<T>(table: string): T[] {
    return (memCache[table] || []) as T[];
  },

  // Synchronous caching updates, with non-blocking asynchronous Firestore flush
  async saveCollection<T>(table: string, data: T[]): Promise<void> {
    memCache[table] = data;
    // Push updates directly and securely to the cloud
    try {
      await syncCollectionToFirestore(table, data);
    } catch (err) {
      console.error(`Async background Firestore synchronization failed on table ${table}:`, err);
      throw err;
    }
  },

  // Asynchronous database bootstrap and seeding
  async init(): Promise<void> {
    console.log("Initializing Cloud Firestore Database Engine...");

    // Test connection first
    try {
      await getDb().collection("test").doc("connection").get();
      console.log("Firestore connection validated successfully!");
    } catch (err) {
      console.log("Firestore connection test completed (or skipped).");
    }

    const tables = [
      "trimesters",
      "users",
      "students",
      "admins",
      "courses",
      "teachers",
      "sections",
      "schedules",
      "ratings",
      "preferences",
      "saved_routines",
      "announcements",
      "exams",
      "routine_shares"
    ];

    // Load every collection from Firestore into the Cache
    for (const table of tables) {
      if (!firestoreEnabled) {
        memCache[table] = [];
        continue;
      }

      try {
        const querySnapshot = await getDb().collection(table).get();
        const items: any[] = [];
        querySnapshot.forEach((docSnap) => {
          items.push(docSnap.data());
        });
        memCache[table] = items;
        console.log(`Loaded collection '${table}' from Firestore (${items.length} records).`);

        // Setup real-time listener to sync remote edits/deletions automatically
        getDb().collection(table).onSnapshot((snapshot) => {
          const updatedItems: any[] = [];
          snapshot.forEach((docSnap) => {
            updatedItems.push(docSnap.data());
          });
          memCache[table] = updatedItems;
          console.log(`[Sync] Collection '${table}' updated in real-time (${updatedItems.length} records).`);
        }, (err) => {
          console.warn(`⚠️ Real-time listener error for '${table}':`, err.message || err);
        });
      } catch (err: any) {
        const errorMsg = err?.message || 'Unknown error';
        console.warn(`⚠️  Could not load '${table}' from Firestore: ${errorMsg}`);
        console.warn(`   Using empty in-memory cache for '${table}' instead.`);
        memCache[table] = [];
      }
    }

    // Seeding logic if the database collections are currently empty
    if (this.getCollection("trimesters").length === 0) {
      console.log("Cloud database appears empty. Bootstrapping with default educational seeds...");

      // 1. Trimesters
      const seedTrimesters: Trimester[] = [
        {
          id: "t1",
          name: "Summer 2026",
          isCurrent: true,
          createdAt: new Date().toISOString()
        },
        {
          id: "t2",
          name: "Spring 2026",
          isCurrent: false,
          createdAt: new Date().toISOString()
        }
      ];
      memCache["trimesters"] = seedTrimesters;
      await syncCollectionToFirestore("trimesters", seedTrimesters);

      const currTrimesterId = "t1";

      // 2. Users & Profiles
      const adminPassHash = bcrypt.hashSync("adminpassword123", 10);
      const studentPassHash = bcrypt.hashSync("studentpassword123", 10);

      const seedUsers: User[] = [
        {
          id: "u1",
          email: "admin@sectionbhai.edu",
          passwordHash: adminPassHash,
          role: "admin",
          createdAt: new Date().toISOString()
        },
        {
          id: "u2",
          email: "student@sectionbhai.edu",
          passwordHash: studentPassHash,
          role: "student",
          createdAt: new Date().toISOString()
        }
      ];
      memCache["users"] = seedUsers;
      await syncCollectionToFirestore("users", seedUsers);

      const seedAdmins: AdminProfile[] = [
        {
          id: "a1",
          userId: "u1",
          name: "Admin Bhai"
        }
      ];
      memCache["admins"] = seedAdmins;
      await syncCollectionToFirestore("admins", seedAdmins);

      const seedStudents: StudentProfile[] = [
        {
          id: "s1",
          userId: "u2",
          name: "Nymur Reza",
          studentId: "011211029",
          department: "Computer Science & Engineering (CSE)",
          currentTrimesterId: currTrimesterId,
          createdAt: new Date().toISOString()
        }
      ];
      memCache["students"] = seedStudents;
      await syncCollectionToFirestore("students", seedStudents);

      // 3. Courses
      memCache["courses"] = [];
      await syncCollectionToFirestore("courses", []);

      // 4. Teachers
      memCache["teachers"] = [];
      await syncCollectionToFirestore("teachers", []);

      // 5. Sections & Schedules
      memCache["sections"] = [];
      await syncCollectionToFirestore("sections", []);

      memCache["schedules"] = [];
      await syncCollectionToFirestore("schedules", []);

      // 6. Ratings
      memCache["ratings"] = [];
      await syncCollectionToFirestore("ratings", []);

      // Empty collections
      memCache["preferences"] = [];
      await syncCollectionToFirestore("preferences", []);

      memCache["saved_routines"] = [];
      await syncCollectionToFirestore("saved_routines", []);

      memCache["announcements"] = [];
      await syncCollectionToFirestore("announcements", []);

      memCache["exams"] = [];
      await syncCollectionToFirestore("exams", []);

      memCache["routine_shares"] = [];
      await syncCollectionToFirestore("routine_shares", []);

      console.log("Cloud database seeding is comprehensive and completed!");
    } else {
      console.log("Cloud Firestore database has pre-existing records. Skipping seeding phase.");
    }
  }
};

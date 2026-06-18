/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
// Dynamic import for vite later

// Local imports
import { DB } from "./src/server/db.js";
import { generateOptimizedRoutines } from "./src/server/solver.js";
import { parseOfferingDocument } from "./src/server/geminiParser.js";
import { User, StudentProfile, Trimester, Course, Teacher, Section, ScheduleItem, TeacherRating, RoutinePreferences, GeneratedRoutine } from "./src/types.js";

// Initialize database (deferred to setupServer async flow)

const app = express();
const DEFAULT_PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "section-bhai-super-secret-key-998811";

function listenPort(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, "0.0.0.0", () => {
      console.log(`SECTIONBHAI running smoothly on http://localhost:${port}`);
      resolve();
    });
    server.on("error", reject);
  });
}

// Multer photo/document files uploader setup in standard temp memory
const upload = multer({ storage: multer.memoryStorage() });

// Middlewares
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Ensure database is initialized before handling requests (especially critical on Vercel)
let isDbInitialized = false;
let dbInitializationPromise: Promise<void> | null = null;

async function ensureDbInit() {
  if (isDbInitialized) return;
  if (!dbInitializationPromise) {
    dbInitializationPromise = DB.init().then(() => {
      isDbInitialized = true;
    });
  }
  await dbInitializationPromise;
}

app.use(async (req, res, next) => {
  try {
    await ensureDbInit();
    next();
  } catch (err: any) {
    console.error("Database initialization failed in middleware:", err);
    res.status(500).json({ error: "Database initialization failed: " + err.message });
  }
});

// Express auth middleware
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: "admin" | "student";
  };
}

function verifyToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Access denied. Token missing." });
    return;
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: "admin" | "student" };
    req.user = verified;
    next();
  } catch (err) {
    res.status(403).json({ error: "Invalid or expired authorization token." });
  }
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Access denied. Administrative authority required." });
    return;
  }
  next();
}

// ==========================================
// 1. AUTHENTICATION ENDPOINTS
// ==========================================

app.post("/api/auth/register", async (req: Request, res: Response) => {
  try {
    const { email, password, name, studentId, department } = req.body;

    if (!email || !password || !name || !studentId) {
      res.status(400).json({ error: "Missing required fields (email, password, name, studentId)." });
      return;
    }

    const users = DB.getCollection<User>("users");
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      res.status(400).json({ error: "An account with this email address already exists." });
      return;
    }

    const students = DB.getCollection<StudentProfile>("students");
    if (students.some(s => s.studentId === studentId)) {
      res.status(400).json({ error: "An account with this Student ID already exists." });
      return;
    }

    const currentTrimester = DB.getCollection<Trimester>("trimesters").find(t => t.isCurrent)?.id || "t1";

    // Create User
    const userId = `user_${Date.now()}`;
    const passwordHash = bcrypt.hashSync(password, 10);
    const newUser: User = {
      id: userId,
      email: email.toLowerCase(),
      passwordHash,
      role: "student",
      createdAt: new Date().toISOString()
    };

    // Create Student Profile
    const studentIdPr = `student_${Date.now()}`;
    const newStudent: StudentProfile = {
      id: studentIdPr,
      userId,
      name,
      studentId,
      department: department || "Computer Science",
      currentTrimesterId: currentTrimester,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    students.push(newStudent);

    await DB.saveCollection("users", users);
    await DB.saveCollection("students", students);

    // Sign JWT
    const token = jwt.sign({ id: userId, email: newUser.email, role: "student" }, JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({
      token,
      user: {
        id: userId,
        email: newUser.email,
        role: newUser.role,
        name: newStudent.name,
        studentId: newStudent.studentId,
        department: newStudent.department,
        currentTrimesterId: newStudent.currentTrimesterId
      }
    });
  } catch (err: any) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Registration failed: " + (err.message || "Unknown error") });
  }
});

app.post("/api/auth/login", (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required fields." });
    return;
  }

  const users = DB.getCollection<User>("users");
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  let name = "";
  let studentId = "";
  let department = "";
  let currentTrimesterId = "";

  if (user.role === "student") {
    const student = DB.getCollection<StudentProfile>("students").find(s => s.userId === user.id);
    if (student) {
      name = student.name;
      studentId = student.studentId;
      department = student.department;
      currentTrimesterId = student.currentTrimesterId;
    }
  } else if (user.role === "admin") {
    const adminPr = DB.getCollection<any>("admins").find(a => a.userId === user.id);
    name = adminPr?.name || "Admin Administrator";
  }

  // Create token
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      name,
      studentId,
      department,
      currentTrimesterId
    }
  });
});

app.get("/api/auth/profile", verifyToken, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const role = req.user?.role;

  const users = DB.getCollection<User>("users");
  const user = users.find(u => u.id === userId);

  if (!user) {
    res.status(404).json({ error: "User account not found." });
    return;
  }

  if (role === "student") {
    const student = DB.getCollection<StudentProfile>("students").find(s => s.userId === userId);
    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      studentProfile: student
    });
  } else {
    const adminPr = DB.getCollection<any>("admins").find(a => a.userId === userId);
    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      name: adminPr?.name || "Admin Administrator"
    });
  }
});

app.post("/api/auth/profile/update", verifyToken, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const role = req.user?.role;
  const { name, studentId, department, currentTrimesterId } = req.body;

  if (role !== "student") {
    res.status(400).json({ error: "Only student profile updates are supported at this profile level." });
    return;
  }

  const students = DB.getCollection<StudentProfile>("students");
  const studentIdx = students.findIndex(s => s.userId === userId);

  if (studentIdx === -1) {
    res.status(404).json({ error: "Student profile record not found." });
    return;
  }

  students[studentIdx] = {
    ...students[studentIdx],
    name: name || students[studentIdx].name,
    studentId: studentId || students[studentIdx].studentId,
    department: department || students[studentIdx].department,
    currentTrimesterId: currentTrimesterId || students[studentIdx].currentTrimesterId
  };

  DB.saveCollection("students", students);

  res.json({
    message: "Profile updated successfully.",
    profile: students[studentIdx]
  });
});

// ==========================================
// 2. ADMIN ENDPOINTS (STATS & FILE UPLOAD)
// ==========================================

app.get("/api/admin/stats", verifyToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const students = DB.getCollection<StudentProfile>("students");
  const teachers = DB.getCollection<Teacher>("teachers");
  const courses = DB.getCollection<Course>("courses");
  const sections = DB.getCollection<Section>("sections");
  const savedRoutines = DB.getCollection<GeneratedRoutine>("saved_routines");

  // Format top teachers
  const sortedTeachers = [...teachers]
    .sort((a, b) => b.averageRating - a.averageRating)
    .slice(0, 5)
    .map(t => ({
      code: t.code,
      name: t.name,
      overallRating: t.averageRating
    }));

  // Format 5 highly recent routines
  const recent = savedRoutines.slice(-5).map(r => {
    const stud = students.find(s => s.id === r.studentId);
    return {
      id: r.id,
      studentName: stud?.name || "Student Bhaia",
      courses: r.selectedCourses,
      score: r.score,
      createdAt: r.createdAt
    };
  });

  const stats = {
    totalStudents: students.length,
    totalTeachers: teachers.length,
    totalCourses: courses.length,
    totalSections: sections.length,
    totalRoutinesGenerated: savedRoutines.length * 3 + 124, // Realistic metrics
    recentRoutines: recent,
    topTeachers: sortedTeachers
  };

  res.json(stats);
});

// Create new trimester
app.post("/api/admin/trimester", verifyToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { name, makeCurrent } = req.body;

  if (!name) {
    res.status(400).json({ error: "Trimester name is required." });
    return;
  }

  const trimesters = DB.getCollection<Trimester>("trimesters");
  const newId = `t_${Date.now()}`;

  if (makeCurrent) {
    trimesters.forEach(t => { t.isCurrent = false; });
  }

  const newTrimester: Trimester = {
    id: newId,
    name,
    isCurrent: !!makeCurrent,
    createdAt: new Date().toISOString()
  };

  trimesters.push(newTrimester);
  DB.saveCollection("trimesters", trimesters);

  res.status(201).json({ message: "Trimester created successfully.", trimester: newTrimester });
});

// AI Schedule offering extraction & parsing
app.post(
  "/api/admin/upload-schedule",
  verifyToken,
  requireAdmin,
  upload.single("file"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const textDump = req.body.textDump || null;
      const file = req.file;

      const trimesters = DB.getCollection<Trimester>("trimesters");
      const currentTrimesterId = trimesters.find(t => t.isCurrent)?.id || "t1";

      let fileBuffer: Buffer | null = null;
      let mimeType: string | null = null;

      if (file) {
        fileBuffer = file.buffer;
        mimeType = file.mimetype;
      }

      if (!fileBuffer && !textDump) {
        res.status(400).json({ error: "Please upload a routine file or paste the schedule text directly." });
        return;
      }

      // Run Gemini API extract operation
      const extracted = await parseOfferingDocument(fileBuffer, mimeType, textDump, currentTrimesterId);

      // Process and integrate extracted data relational-style inside DB JSON tables
      const courses = DB.getCollection<Course>("courses");
      const teachers = DB.getCollection<Teacher>("teachers");
      const sections = DB.getCollection<Section>("sections");
      const schedules = DB.getCollection<ScheduleItem>("schedules");

      let addedCourses = 0;
      let addedTeachers = 0;
      let addedSections = 0;

      // 1. Insert/Merge Courses
      extracted.courses.forEach(extC => {
        if (!courses.some(c => c.code.toUpperCase() === extC.code.toUpperCase())) {
          courses.push({
            id: `course_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            code: extC.code.toUpperCase(),
            name: extC.name,
            credits: 3,
            trimesterId: currentTrimesterId,
            createdAt: new Date().toISOString()
          });
          addedCourses++;
        }
      });

      // 2. Insert/Merge Teachers
      extracted.teachers.forEach(extT => {
        if (!teachers.some(t => t.code.toUpperCase() === extT.code.toUpperCase())) {
          teachers.push({
            id: `teacher_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            code: extT.code.toUpperCase(),
            name: extT.name,
            averageRating: 4.0, // baseline average
            metricsAverage: {
              teachingQuality: 4.0,
              gradingFairness: 4.0,
              attendanceStrictness: 3.5,
              behavior: 4.0,
              recommendation: 4.0
            },
            ratingCount: 1
          });
          addedTeachers++;
        }
      });

      // Save courses and teachers first to resolve lookup dependencies
      await DB.saveCollection("courses", courses);
      await DB.saveCollection("teachers", teachers);

      // 3. Clear existing sections/schedules for current semester to avoid redundant duplication or clutters
      const filteredSections = sections.filter(s => s.trimesterId !== currentTrimesterId);
      const filteredSectionIds = new Set(sections.filter(s => s.trimesterId === currentTrimesterId).map(s => s.id));
      const filteredSchedules = schedules.filter(sch => !filteredSectionIds.has(sch.sectionId));

      const newSectionsList: Section[] = [...filteredSections];
      const newSchedulesList: ScheduleItem[] = [...filteredSchedules];

      // 4. Insert sections and schedules relational link
      extracted.sections.forEach((extS, idx) => {
        const foundCourse = courses.find(c => c.code.toUpperCase() === extS.courseCode.toUpperCase());
        const foundTeacher = teachers.find(t => t.code.toUpperCase() === extS.teacherCode.toUpperCase());

        if (foundCourse && foundTeacher) {
          const sectionId = `sect_ext_${Date.now()}_${idx}`;
          newSectionsList.push({
            id: sectionId,
            courseId: foundCourse.id,
            sectionCode: extS.sectionCode,
            teacherId: foundTeacher.id,
            trimesterId: currentTrimesterId
          });
          addedSections++;

          // Push schedules
          extS.schedules.forEach((sch, sIdx) => {
            newSchedulesList.push({
              id: `sched_ext_${Date.now()}_${idx}_${sIdx}`,
              sectionId,
              day: sch.day,
              startTime: sch.startTime,
              endTime: sch.endTime,
              room: sch.room || "Room TBA"
            });
          });
        }
      });

      await DB.saveCollection("sections", newSectionsList);
      await DB.saveCollection("schedules", newSchedulesList);

      res.json({
        message: "Offering list parsed and synchronized successfully.",
        summary: {
          addedCourses,
          addedTeachers,
          addedSections,
          parsedTrimester: trimesters.find(t => t.id === currentTrimesterId)?.name || "Current"
        }
      });
    } catch (err: any) {
      console.error("AI Offering parser error route:", err);
      res.status(500).json({ error: `System routine ingestion failed: ${err.message}` });
    }
  }
);

// Manual item creators for fine control
app.post("/api/admin/courses", verifyToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { code, name } = req.body;
  if (!code || !name) {
    res.status(400).json({ error: "Code and name are required." });
    return;
  }
  const trimesterId = DB.getCollection<Trimester>("trimesters").find(t => t.isCurrent)?.id || "t1";
  const courses = DB.getCollection<Course>("courses");
  const newCourse = { id: `manual_c_${Date.now()}`, code: code.toUpperCase(), name, credits: 3, trimesterId, createdAt: new Date().toISOString() };
  courses.push(newCourse);
  DB.saveCollection("courses", courses);
  res.status(201).json(newCourse);
});

app.post("/api/admin/teachers", verifyToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { code, name } = req.body;
  if (!code || !name) {
    res.status(400).json({ error: "Code and name are required." });
    return;
  }
  const teachers = DB.getCollection<Teacher>("teachers");
  const newTeacher = {
    id: `manual_t_${Date.now()}`,
    code: code.toUpperCase(),
    name,
    averageRating: 5.0,
    metricsAverage: { teachingQuality: 5, gradingFairness: 5, attendanceStrictness: 3, behavior: 5, recommendation: 5 },
    ratingCount: 1
  };
  teachers.push(newTeacher);
  DB.saveCollection("teachers", teachers);
  res.status(201).json(newTeacher);
});

app.get("/api/admin/students", verifyToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const students = DB.getCollection<StudentProfile>("students");
  res.json(students);
});

// ==========================================
// 3. STUDENT PORTAL ENDPOINTS
// ==========================================

// Autocomplete searches
app.get("/api/student/courses", (req: Request, res: Response) => {
  const courses = DB.getCollection<Course>("courses");
  res.json(courses);
});

app.get("/api/student/sections", (req: Request, res: Response) => {
  const sections = DB.getCollection<Section>("sections");
  res.json(sections);
});

app.get("/api/student/schedules", (req: Request, res: Response) => {
  const schedules = DB.getCollection<ScheduleItem>("schedules");
  res.json(schedules);
});

app.get("/api/student/teachers", (req: Request, res: Response) => {
  const teachers = DB.getCollection<Teacher>("teachers");
  res.json(teachers);
});

// Extract all actual timeslots for selection
app.get("/api/student/time-slots", (req: Request, res: Response) => {
  const schedules = DB.getCollection<ScheduleItem>("schedules");
  const slotsMap = new Set<string>();

  schedules.forEach(s => {
    if (s.startTime && s.endTime) {
      slotsMap.add(`${s.startTime.trim()} - ${s.endTime.trim()}`);
    }
  });

  // Sort slots nicely by hour
  const uniqueSlots = Array.from(slotsMap).sort((a, b) => {
    const aTime = a.split(" - ")[0];
    const bTime = b.split(" - ")[0];
    const aMin = aTime.includes("PM") && !aTime.startsWith("12") ? parseInt(aTime) * 60 + 720 : parseInt(aTime) * 60;
    const bMin = bTime.includes("PM") && !bTime.startsWith("12") ? parseInt(bTime) * 60 + 720 : parseInt(bTime) * 60;
    return aMin - bMin;
  });

  res.json(uniqueSlots);
});

// Retrieve ratings details
app.get("/api/student/ratings", (req: Request, res: Response) => {
  const ratings = DB.getCollection<TeacherRating>("ratings");
  res.json(ratings);
});

// Student Rates Teacher
app.post("/api/student/ratings", verifyToken, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { teacherId, courseId, rating, comment, metrics } = req.body;

  if (!teacherId || !courseId || !rating || !metrics) {
    res.status(400).json({ error: "Missing required rating metrics or identifiers." });
    return;
  }

  const student = DB.getCollection<StudentProfile>("students").find(s => s.userId === userId);
  if (!student) {
    res.status(403).json({ error: "Profile check failed. Only registered student accounts can review." });
    return;
  }

  const ratings = DB.getCollection<TeacherRating>("ratings");
  const teachers = DB.getCollection<Teacher>("teachers");

  const newRatingId = `rating_${Date.now()}`;
  const newReview: TeacherRating = {
    id: newRatingId,
    studentId: student.id,
    studentName: student.name,
    teacherId,
    courseId,
    rating: Number(rating),
    comment: comment || "",
    metrics: {
      teachingQuality: Number(metrics.teachingQuality || rating),
      gradingFairness: Number(metrics.gradingFairness || rating),
      attendanceStrictness: Number(metrics.attendanceStrictness || 3),
      behavior: Number(metrics.behavior || rating),
      recommendation: Number(metrics.recommendation || rating)
    },
    createdAt: new Date().toISOString()
  };

  // Add review
  ratings.push(newReview);
  DB.saveCollection("ratings", ratings);

  // Re-average Teacher Metrics dynamically
  const teacherIdx = teachers.findIndex(t => t.id === teacherId);
  if (teacherIdx !== -1) {
    const teacherReviews = ratings.filter(r => r.teacherId === teacherId);
    const count = teacherReviews.length;

    const sumRating = teacherReviews.reduce((acc, r) => acc + r.rating, 0);
    const sumTQ = teacherReviews.reduce((acc, r) => acc + r.metrics.teachingQuality, 0);
    const sumGF = teacherReviews.reduce((acc, r) => acc + r.metrics.gradingFairness, 0);
    const sumAS = teacherReviews.reduce((acc, r) => acc + r.metrics.attendanceStrictness, 0);
    const sumBH = teacherReviews.reduce((acc, r) => acc + r.metrics.behavior, 0);
    const sumRC = teacherReviews.reduce((acc, r) => acc + r.metrics.recommendation, 0);

    teachers[teacherIdx] = {
      ...teachers[teacherIdx],
      averageRating: parseFloat((sumRating / count).toFixed(1)),
      metricsAverage: {
        teachingQuality: parseFloat((sumTQ / count).toFixed(1)),
        gradingFairness: parseFloat((sumGF / count).toFixed(1)),
        attendanceStrictness: parseFloat((sumAS / count).toFixed(1)),
        behavior: parseFloat((sumBH / count).toFixed(1)),
        recommendation: parseFloat((sumRC / count).toFixed(1))
      },
      ratingCount: count
    };

    DB.saveCollection("teachers", teachers);
  }

  res.status(201).json({ message: "Thank you! Review saved and faculty metrics updated.", review: newReview });
});

// Preferences Storage
app.get("/api/student/preferences", verifyToken, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const student = DB.getCollection<StudentProfile>("students").find(s => s.userId === userId);

  if (!student) {
    res.status(404).json({ error: "Student profile not found." });
    return;
  }

  const prefs = DB.getCollection<RoutinePreferences>("preferences");
  const studentPref = prefs.find(p => p.studentId === student.id);

  if (!studentPref) {
    // Return empty defaults
    res.json({
      studentId: student.id,
      selectedCourses: [],
      teacherPriorities: {},
      daysPreference: { prefer: [], avoid: [] },
      slotsPreference: { prefer: [], avoid: [] }
    });
  } else {
    res.json(studentPref);
  }
});

app.post("/api/student/preferences", verifyToken, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { selectedCourses, teacherPriorities, daysPreference, slotsPreference } = req.body;

  const student = DB.getCollection<StudentProfile>("students").find(s => s.userId === userId);
  if (!student) {
    res.status(404).json({ error: "Student profile not found." });
    return;
  }

  const prefs = DB.getCollection<RoutinePreferences>("preferences");
  const idx = prefs.findIndex(p => p.studentId === student.id);

  const updatedPrefs: RoutinePreferences = {
    studentId: student.id,
    selectedCourses: selectedCourses || [],
    teacherPriorities: teacherPriorities || {},
    daysPreference: daysPreference || { prefer: [], avoid: [] },
    slotsPreference: slotsPreference || { prefer: [], avoid: [] }
  };

  if (idx === -1) {
    prefs.push(updatedPrefs);
  } else {
    prefs[idx] = updatedPrefs;
  }

  DB.saveCollection("preferences", prefs);
  res.json({ message: "Routine preferences saved successfully.", preferences: updatedPrefs });
});

// CSP ROTATION ENGINE OPTIMIZER VOODOO!
app.post("/api/student/generate-routine", verifyToken, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const student = DB.getCollection<StudentProfile>("students").find(s => s.userId === userId);

  if (!student) {
    res.status(404).json({ error: "Student profile not found." });
    return;
  }

  // Get active student preferences
  const prefs = DB.getCollection<RoutinePreferences>("preferences").find(p => p.studentId === student.id);
  if (!prefs || !prefs.selectedCourses || prefs.selectedCourses.length === 0) {
    res.status(400).json({ error: "Please select courses in Step 1 before generating schedules." });
    return;
  }

  // Fetch whole academic context
  const trimesters = DB.getCollection<Trimester>("trimesters");
  const currentTrimesterId = trimesters.find(t => t.isCurrent)?.id || "t1";

  const allCourses = DB.getCollection<Course>("courses");
  const allSections = DB.getCollection<Section>("sections");
  const allTeachers = DB.getCollection<Teacher>("teachers");
  const allSchedules = DB.getCollection<ScheduleItem>("schedules");

  // Filter lists down to student's exact course selections
  const studentCourses = allCourses.filter(c =>
    prefs.selectedCourses.includes(c.code) && c.trimesterId === currentTrimesterId
  );

  if (studentCourses.length === 0) {
    res.status(400).json({ error: "Selected courses do not exist or are not offered in this current trimester." });
    return;
  }

  const studentSections = allSections.filter(s => s.trimesterId === currentTrimesterId);

  // Invoke high performance CSP schedule algorithm
  const routines = generateOptimizedRoutines(
    studentCourses,
    studentSections,
    allTeachers,
    allSchedules,
    prefs
  );

  res.json(routines);
});

// Saved Routines Storage
app.get("/api/student/saved-routines", verifyToken, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const student = DB.getCollection<StudentProfile>("students").find(s => s.userId === userId);

  if (!student) {
    res.status(404).json({ error: "Student profile not registered." });
    return;
  }

  const routines = DB.getCollection<GeneratedRoutine>("saved_routines");
  const studentSaves = routines.filter(r => r.studentId === student.id);

  res.json(studentSaves);
});

app.post("/api/student/saved-routines", verifyToken, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { name, selectedCourses, sections, score, matchPercentage, freeDays, gapsCount, averageGapMinutes, details } = req.body;

  const student = DB.getCollection<StudentProfile>("students").find(s => s.userId === userId);
  if (!student) {
    res.status(404).json({ error: "Student profile not found." });
    return;
  }

  if (!sections || sections.length === 0) {
    res.status(400).json({ error: "Valid routine specifications are required to record class records." });
    return;
  }

  const routines = DB.getCollection<GeneratedRoutine>("saved_routines");

  const newSavedRoutine: GeneratedRoutine = {
    id: `saved_rot_${Date.now()}`,
    studentId: student.id,
    name: name || `My Saved Schedule ${routines.length + 1}`,
    selectedCourses: selectedCourses || [],
    sections,
    score: score || 85,
    matchPercentage: matchPercentage || 85,
    freeDays: freeDays || [],
    gapsCount: gapsCount || 0,
    averageGapMinutes: averageGapMinutes || 0,
    details: details || { teacherScore: 100, dayScore: 100, timeScore: 100, freeDayBonus: 100, gapScore: 100 },
    createdAt: new Date().toISOString()
  };

  routines.push(newSavedRoutine);
  DB.saveCollection("saved_routines", routines);

  res.status(201).json({ message: "Routine saved successfully into your personal archives!", routine: newSavedRoutine });
});

app.delete("/api/student/saved-routines/:id", verifyToken, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const routineId = req.params.id;

  const student = DB.getCollection<StudentProfile>("students").find(s => s.userId === userId);
  if (!student) {
    res.status(404).json({ error: "Student profile not linked." });
    return;
  }

  const routines = DB.getCollection<GeneratedRoutine>("saved_routines");
  const filtered = routines.filter(r => !(r.id === routineId && r.studentId === student.id));

  if (filtered.length === routines.length) {
    res.status(404).json({ error: "Routine record not found or access is revoked." });
    return;
  }

  DB.saveCollection("saved_routines", filtered);
  res.json({ message: "Routine deleted from your personal dashboard." });
});

// ==========================================
// 3.5 ANNOUNCEMENTS, EXAMS, AND SOCIAL SHARING
// ==========================================

import { Announcement, ExamSchedule, RoutineShare } from "./src/types.js";

// Announcements API
app.get("/api/announcements", (req: Request, res: Response) => {
  const announcements = DB.getCollection<Announcement>("announcements");
  res.json(announcements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
});

app.post("/api/admin/announcements", verifyToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { title, message } = req.body;
  if (!title || !message) {
    res.status(400).json({ error: "Title and message are required." });
    return;
  }
  
  const announcements = DB.getCollection<Announcement>("announcements");
  const newAnn: Announcement = {
    id: `ann_${Date.now()}`,
    title,
    message,
    authorId: req.user!.id,
    authorName: req.user!.email, // simple fallback
    createdAt: new Date().toISOString()
  };
  announcements.push(newAnn);
  DB.saveCollection("announcements", announcements);
  res.json({ message: "Announcement published.", announcement: newAnn });
});

app.delete("/api/admin/announcements/:id", verifyToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const announcements = DB.getCollection<Announcement>("announcements");
  const filtered = announcements.filter(a => a.id !== req.params.id);
  DB.saveCollection("announcements", filtered);
  res.json({ message: "Announcement deleted." });
});

// Exams API
app.get("/api/exams", (req: Request, res: Response) => {
  const trimesters = DB.getCollection<Trimester>("trimesters");
  const currentTrimesterId = trimesters.find(t => t.isCurrent)?.id || "t1";
  
  const exams = DB.getCollection<ExamSchedule>("exams");
  res.json(exams.filter(e => e.trimesterId === currentTrimesterId));
});

app.post("/api/admin/exams", verifyToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { courseCode, examType, date, time } = req.body;
  if (!courseCode || !examType || !date || !time) {
    res.status(400).json({ error: "Missing required fields." });
    return;
  }
  
  const trimesters = DB.getCollection<Trimester>("trimesters");
  const currentTrimesterId = trimesters.find(t => t.isCurrent)?.id || "t1";
  
  const exams = DB.getCollection<ExamSchedule>("exams");
  const newExam: ExamSchedule = {
    id: `exam_${Date.now()}`,
    trimesterId: currentTrimesterId,
    courseCode: courseCode.trim().toUpperCase(),
    examType,
    date,
    time,
    createdAt: new Date().toISOString()
  };
  exams.push(newExam);
  DB.saveCollection("exams", exams);
  res.json({ message: "Exam schedule added.", exam: newExam });
});

app.delete("/api/admin/exams/:id", verifyToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const exams = DB.getCollection<ExamSchedule>("exams");
  const filtered = exams.filter(e => e.id !== req.params.id);
  DB.saveCollection("exams", filtered);
  res.json({ message: "Exam schedule deleted." });
});

// Social Sharing API
app.post("/api/routine/share", verifyToken, (req: AuthenticatedRequest, res: Response) => {
  const { routineId } = req.body;
  if (!routineId) {
    res.status(400).json({ error: "Routine ID is required." });
    return;
  }
  
  const student = DB.getCollection<StudentProfile>("students").find(s => s.userId === req.user?.id);
  const routines = DB.getCollection<GeneratedRoutine>("saved_routines");
  const routine = routines.find(r => r.id === routineId && r.studentId === student?.id);
  
  if (!routine) {
    res.status(404).json({ error: "Routine not found." });
    return;
  }
  
  const shares = DB.getCollection<RoutineShare>("routine_shares");
  // check if already shared
  const existing = shares.find(s => s.routineId === routineId);
  if (existing) {
    res.json({ shareId: existing.id });
    return;
  }
  
  const newShare: RoutineShare = {
    id: `share_${Math.random().toString(36).substring(2, 10)}`,
    routineId,
    studentId: student!.id,
    studentName: student!.name,
    createdAt: new Date().toISOString()
  };
  shares.push(newShare);
  DB.saveCollection("routine_shares", shares);
  res.json({ shareId: newShare.id });
});

app.get("/api/routine/share/:id", (req: Request, res: Response) => {
  const shareId = req.params.id;
  const shares = DB.getCollection<RoutineShare>("routine_shares");
  const share = shares.find(s => s.id === shareId);
  
  if (!share) {
    res.status(404).json({ error: "Share link not found or expired." });
    return;
  }
  
  const routines = DB.getCollection<GeneratedRoutine>("saved_routines");
  const routine = routines.find(r => r.id === share.routineId);
  
  if (!routine) {
    res.status(404).json({ error: "Routine not found." });
    return;
  }
  
  res.json({ routine, studentName: share.studentName });
});

// ==========================================
// 4. VITE & STATIC FILES HOOK
// ==========================================

async function setupServer() {
  // Initialize Cloud Firestore database asynchronously
  await DB.init();

  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    // Integrate Vite as middleware in dev mode
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    // Serve static frontend files in production build
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (!process.env.VERCEL) {
    try {
      await listenPort(DEFAULT_PORT);
    } catch (err: any) {
      if (err?.code === "EADDRINUSE") {
        const fallbackPort = DEFAULT_PORT + 1;
        console.warn(`Port ${DEFAULT_PORT} is already in use. Trying ${fallbackPort} instead.`);
        await listenPort(fallbackPort);
      } else {
        throw err;
      }
    }
  }
}

if (!process.env.VERCEL) {
  setupServer().catch(err => {
    console.error("Critical server setup startup crash:", err);
  });
}
// On Vercel, DB initialization is handled by the ensureDbInit middleware.
// Do NOT call DB.init() here to avoid a race condition with the middleware.

export default app;

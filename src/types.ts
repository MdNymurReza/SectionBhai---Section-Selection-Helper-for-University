/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// User and Auth Types
export type UserRole = "admin" | "student";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: string;
}

export interface StudentProfile {
  id: string;
  userId: string;
  name: string;
  studentId: string;
  department: string;
  currentTrimesterId: string;
  createdAt: string;
}

export interface AdminProfile {
  id: string;
  userId: string;
  name: string;
}

// Trimester Management
export interface Trimester {
  id: string;
  name: string; // e.g., "Summer 2026", "Spring 2026"
  isCurrent: boolean;
  createdAt: string;
}

// Academic Models
export interface Course {
  id: string;
  code: string; // e.g., "CSE111", "CSE220"
  name: string; // e.g., "Computer Programming", "Data Structures"
  trimesterId: string;
  credits: number;
  createdAt: string;
}

export interface Teacher {
  id: string;
  code: string; // e.g., "SR", "NH"
  name: string; // e.g., "Dr. Rahman", "Dr. Hasan"
  averageRating: number; // 1 to 5 average
  metricsAverage: {
    teachingQuality: number;
    gradingFairness: number;
    attendanceStrictness: number;
    behavior: number;
    recommendation: number;
  };
  ratingCount: number;
}

export interface Section {
  id: string;
  courseId: string;
  sectionCode: string; // e.g., "A", "B", "C1"
  teacherId: string;
  trimesterId: string;
}

export interface ScheduleItem {
  id: string;
  sectionId: string;
  day: string; // "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday"
  startTime: string; // "08:00 AM" (extracted actual slot)
  endTime: string; // "09:30 AM"
  room: string; // "Room 302"
}

// Student Review & Ranking
export interface TeacherRating {
  id: string;
  studentId: string; // Foreign key to StudentProfile
  studentName: string;
  teacherId: string;
  courseId: string; // rating context
  rating: number; // 1-5 overall
  comment: string;
  metrics: {
    teachingQuality: number; // 1-5
    gradingFairness: number; // 1-5
    attendanceStrictness: number; // 1-5 (5 = strict, 1 = relaxed)
    behavior: number; // 1-5
    recommendation: number; // 1-5
  };
  createdAt: string;
}

// Student Constraints / Preferences for Routine Builder
export interface RoutinePreferences {
  studentId: string;
  selectedCourses: string[]; // Course Code strings, e.g. ["CSE111", "CSE220"]
  teacherPriorities: Record<string, Record<string, number>>; // { [courseCode]: { [teacherCode]: stars(1-5) } }
  daysPreference: {
    prefer: string[]; // e.g., ["Sunday", "Monday"]
    avoid: string[]; // e.g., ["Tuesday"]
  };
  slotsPreference: {
    prefer: string[]; // e.g., ["10:00 AM - 11:30 AM"]
    avoid: string[]; // e.g., ["08:00 AM - 09:30 AM"]
  };
}

// Generated Schedules
export interface GeneratedRoutine {
  id: string;
  studentId: string;
  name: string; // Custom saved name
  selectedCourses: string[];
  sections: {
    courseId: string;
    courseCode: string;
    courseName: string;
    sectionId: string;
    sectionCode: string;
    teacherId: string;
    teacherCode: string;
    teacherName: string;
    schedules: Omit<ScheduleItem, "sectionId">[];
  }[];
  score: number;
  matchPercentage: number;
  freeDays: string[];
  gapsCount: number;
  averageGapMinutes: number;
  details: {
    teacherScore: number;
    dayScore: number;
    timeScore: number;
    freeDayBonus: number;
    gapScore: number;
  };
  createdAt: string;
}

// Full API Response and Request Interfaces
export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
    name: string;
    studentId?: string;
    department?: string;
    currentTrimesterId?: string;
  };
}

export interface StatsResponse {
  totalStudents: number;
  totalTeachers: number;
  totalCourses: number;
  totalSections: number;
  totalRoutinesGenerated: number;
  recentRoutines: {
    id: string;
    studentName: string;
    courses: string[];
    score: number;
    createdAt: string;
  }[];
  topTeachers: {
    code: string;
    name: string;
    overallRating: number;
  }[];
}

// Announcements
export interface Announcement {
  id: string;
  title: string;
  message: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

// Exam Schedules
export interface ExamSchedule {
  id: string;
  trimesterId: string;
  courseCode: string;
  examType: "Midterm" | "Final";
  date: string; // YYYY-MM-DD
  time: string; // e.g. "10:00 AM - 12:00 PM"
  createdAt: string;
}

// Social Sharing
export interface RoutineShare {
  id: string; // acts as the sharing token
  routineId: string;
  studentId: string;
  studentName: string;
  createdAt: string;
}

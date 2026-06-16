/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Section, ScheduleItem, Course, Teacher, GeneratedRoutine, RoutinePreferences } from "../types";

// Helper to convert time string e.g. "08:00 AM" or "01:30 PM" to minutes from midnight
export function timeToMinutes(timeStr: string): number {
  const clean = timeStr.trim().toUpperCase();
  const match = clean.match(/^(\d+):(\d+)\s*(AM|PM)$/);
  if (!match) {
    // Fallback if formatting is slightly off
    return 0;
  }
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3];

  if (ampm === "PM" && hours !== 12) {
    hours += 12;
  } else if (ampm === "AM" && hours === 12) {
    hours = 0;
  }

  return hours * 60 + minutes;
}

// Check if two schedule items overlap
export function checkScheduleOverlap(itemA: Omit<ScheduleItem, "sectionId">, itemB: Omit<ScheduleItem, "sectionId">): boolean {
  if (itemA.day !== itemB.day) return false;

  const startA = timeToMinutes(itemA.startTime);
  const endA = timeToMinutes(itemA.endTime);
  const startB = timeToMinutes(itemB.startTime);
  const endB = timeToMinutes(itemB.endTime);

  // Overlap occurs when start of A is before end of B AND start of B is before end of A
  return startA < endB && startB < endA;
}

// Evaluate and score a specific, conflict-free combination of sections
interface ScoringInput {
  combination: {
    course: Course;
    section: Section;
    teacher: Teacher;
    schedules: ScheduleItem[];
  }[];
  preferences: RoutinePreferences;
}

export function evaluateRoutine(input: ScoringInput): Omit<GeneratedRoutine, "id" | "studentId" | "name" | "createdAt"> {
  const { combination, preferences } = input;
  const { teacherPriorities, daysPreference, slotsPreference } = preferences;

  // 1. Teacher Preference Score (0.40 weight)
  // Each selected section has a teacher. Calculate aggregate star rating awarded.
  let totalTeacherStars = 0;
  let maxPossibleStars = combination.length * 5;

  combination.forEach(item => {
    const courseCode = item.course.code;
    const teacherCode = item.teacher.code;

    // Retrieve custom priority stars assigned by user; default is 3 stars if not specified
    const stars = teacherPriorities[courseCode]?.[teacherCode] ?? 3;
    totalTeacherStars += stars;
  });

  const teacherScore = maxPossibleStars > 0 ? (totalTeacherStars / maxPossibleStars) * 100 : 60;

  // 2. Day Preference Score (0.15 weight)
  // Prefer days increase, avoid days decrease
  // Days of classes scheduled
  const activeDays = new Set<string>();
  combination.forEach(item => {
    item.schedules.forEach(s => activeDays.add(s.day));
  });

  let dayScore = 70; // baseline score
  activeDays.forEach(day => {
    if (daysPreference.prefer.includes(day)) {
      dayScore += 15; // bonus
    }
    if (daysPreference.avoid.includes(day)) {
      dayScore -= 25; // penalty
    }
  });
  dayScore = Math.max(0, Math.min(100, dayScore));

  // 3. Time Slot Preference Score (0.20 weight)
  // Preferred slots increase, avoided slots decrease
  let timeScore = 70; // baseline score
  combination.forEach(item => {
    item.schedules.forEach(s => {
      const slotStr = `${s.startTime} - ${s.endTime}`;
      // Direct exact match OR partial match check
      const isPreferred = slotsPreference.prefer.some(pref => pref.includes(s.startTime) || s.startTime.includes(pref));
      const isAvoided = slotsPreference.avoid.some(av => av.includes(s.startTime) || s.startTime.includes(av));

      if (isPreferred) {
        timeScore += 10;
      }
      if (isAvoided) {
        timeScore -= 15;
      }
    });
  });
  timeScore = Math.max(0, Math.min(100, timeScore));

  // 4. Free Day Bonus (0.15 weight)
  // Classes take place over standard university academic days: Sat, Sun, Mon, Tue, Wed, Thu (6 days)
  const standardDays = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
  const freeDays = standardDays.filter(day => !activeDays.has(day));
  const freeDayBonus = (freeDays.length / 6) * 100;

  // 5. Gap Optimization (0.10 weight)
  // Large gaps between classes on the same day decrease the score. Back-to-back or short gaps are optimal
  let gapScore = 100;
  let totalGapsCount = 0;
  let totalGapMinutes = 0;

  // Group scheduled slots by day
  const dailySlots: Record<string, { start: number; end: number }[]> = {};
  combination.forEach(item => {
    item.schedules.forEach(s => {
      if (!dailySlots[s.day]) dailySlots[s.day] = [];
      dailySlots[s.day].push({
        start: timeToMinutes(s.startTime),
        end: timeToMinutes(s.endTime)
      });
    });
  });

  // Calculate gaps for each day
  Object.keys(dailySlots).forEach(day => {
    const slots = dailySlots[day];
    // Sort slots by start time
    slots.sort((a, b) => a.start - b.start);

    for (let i = 0; i < slots.length - 1; i++) {
      const gap = slots[i + 1].start - slots[i].end;
      if (gap > 0) {
        totalGapsCount++;
        totalGapMinutes += gap;

        // Apply a penalty schema
        if (gap <= 30) {
          // Normal gap (e.g., lunch or class transition)
          gapScore -= 5;
        } else if (gap <= 90) {
          // Noticeable gap
          gapScore -= 15;
        } else {
          // Extremely long waiting time (slop gap)
          gapScore -= 30;
        }
      }
    }
  });

  gapScore = Math.max(0, Math.min(100, gapScore));
  const averageGapMinutes = totalGapsCount > 0 ? totalGapMinutes / totalGapsCount : 0;

  // Weighted Scoring Aggregator
  // FinalScore = (TeacherChoice * 0.40) + (DayPref * 0.15) + (TimePref * 0.20) + (FreeBonus * 0.15) + (GapOpt * 0.10)
  const score =
    teacherScore * 0.40 +
    dayScore * 0.15 +
    timeScore * 0.20 +
    freeDayBonus * 0.15 +
    gapScore * 0.10;

  const matchPercentage = Math.round(score);

  return {
    selectedCourses: combination.map(item => item.course.code),
    sections: combination.map(item => ({
      courseId: item.course.id,
      courseCode: item.course.code,
      courseName: item.course.name,
      sectionId: item.section.id,
      sectionCode: item.section.sectionCode,
      teacherId: item.teacher.id,
      teacherCode: item.teacher.code,
      teacherName: item.teacher.name,
      schedules: item.schedules.map(sch => ({
        id: sch.id,
        day: sch.day,
        startTime: sch.startTime,
        endTime: sch.endTime,
        room: sch.room
      }))
    })),
    score: parseFloat(score.toFixed(2)),
    matchPercentage,
    freeDays,
    gapsCount: totalGapsCount,
    averageGapMinutes: Math.round(averageGapMinutes),
    details: {
      teacherScore: parseFloat(teacherScore.toFixed(1)),
      dayScore: parseFloat(dayScore.toFixed(1)),
      timeScore: parseFloat(timeScore.toFixed(1)),
      freeDayBonus: parseFloat(freeDayBonus.toFixed(1)),
      gapScore: parseFloat(gapScore.toFixed(1))
    }
  };
}

// Primary CSP Solver Core using Backtracking Search
export function generateOptimizedRoutines(
  courses: Course[],
  sections: Section[],
  teachers: Teacher[],
  schedules: ScheduleItem[],
  preferences: RoutinePreferences
): GeneratedRoutine[] {
  if (courses.length === 0) return [];

  // Group sections by course id
  const courseSections: Record<string, Section[]> = {};
  courses.forEach(c => {
    courseSections[c.id] = sections.filter(s => s.courseId === c.id);
  });

  const validRoutines: Omit<GeneratedRoutine, "id" | "studentId" | "name" | "createdAt">[] = [];

  // Backtracking path solver
  function solve(
    courseIndex: number,
    currentAssignment: {
      course: Course;
      section: Section;
      teacher: Teacher;
      schedules: ScheduleItem[];
    }[]
  ) {
    // If all courses have been allocated, score and store the combination
    if (courseIndex === courses.length) {
      const evaluation = evaluateRoutine({ combination: currentAssignment, preferences });
      validRoutines.push(evaluation);
      return;
    }

    const currentCourse = courses[courseIndex];
    const availableSections = courseSections[currentCourse.id] || [];

    // Iterate through sections of the current course
    for (const section of availableSections) {
      const teacher = teachers.find(t => t.id === section.teacherId) || {
        id: section.teacherId,
        code: "UNK",
        name: "Unknown Teacher",
        averageRating: 3.0,
        metricsAverage: { teachingQuality: 3, gradingFairness: 3, attendanceStrictness: 3, behavior: 3, recommendation: 3 },
        ratingCount: 0
      };

      const sectionSchedules = schedules.filter(sch => sch.sectionId === section.id);

      // Check if this section clashes with any already assigned sections in the current track
      let hasClash = false;
      for (const assigned of currentAssignment) {
        for (const assignedSchedule of assigned.schedules) {
          for (const currentSchedule of sectionSchedules) {
            if (checkScheduleOverlap(assignedSchedule, currentSchedule)) {
              hasClash = true;
              break;
            }
          }
          if (hasClash) break;
        }
        if (hasClash) break;
      }

      // If no conflict, proceed recursing
      if (!hasClash) {
        solve(courseIndex + 1, [
          ...currentAssignment,
          {
            course: currentCourse,
            section,
            teacher,
            schedules: sectionSchedules
          }
        ]);
      }
    }
  }

  // Launch search backtracking
  solve(0, []);

  // Sort by score ascending / descending (descending is default)
  validRoutines.sort((a, b) => b.score - a.score);

  // Return formatted results with unique placeholder keys and limits
  // Keep up to 10 valid routines, as requested
  const top10 = validRoutines.slice(0, 10);

  return top10.map((routine, idx) => ({
    ...routine,
    id: `routine_${Date.now()}_${idx}`,
    studentId: preferences.studentId,
    name: `Routine Option ${idx + 1}`,
    createdAt: new Date().toISOString()
  }));
}

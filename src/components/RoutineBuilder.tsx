/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Search,
  Book,
  Trash2,
  Star,
  Calendar,
  Clock,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Award,
  Loader2,
  Save,
  Check,
  CalendarDays,
  Activity,
  ThumbsDown,
  Info
} from "lucide-react";
import { Course, Teacher, Section, ScheduleItem, RoutinePreferences, GeneratedRoutine } from "../types";

interface RoutineBuilderProps {
  token: string;
  onSavedSuccess: () => void;
}

export default function RoutineBuilder({ token, onSavedSuccess }: RoutineBuilderProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [savingResultId, setSavingResultId] = useState<string | null>(null);

  // Database contexts
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [allSections, setAllSections] = useState<Section[]>([]);
  const [allSchedules, setAllSchedules] = useState<ScheduleItem[]>([]);
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
  const [allSlots, setAllSlots] = useState<string[]>([]);

  // Search autocomplete state
  const [searchTerm, setSearchTerm] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  // Student Preferences selections state
  const [selectedCourses, setSelectedCourses] = useState<Course[]>([]);
  const [teacherPriorities, setTeacherPriorities] = useState<Record<string, Record<string, number>>>({});
  const [daysPreference, setDaysPreference] = useState<{ prefer: string[]; avoid: string[] }>({
    prefer: [],
    avoid: []
  });
  const [slotsPreference, setSlotsPreference] = useState<{ prefer: string[]; avoid: string[] }>({
    prefer: [],
    avoid: []
  });

  // Generated routines output state
  const [generatedRoutines, setGeneratedRoutines] = useState<GeneratedRoutine[]>([]);
  const [activeRoutineIdx, setActiveRoutineIdx] = useState<number>(0);

  // Section popularity map: sectionId -> count of students who saved a routine with it
  const [sectionPopularity, setSectionPopularity] = useState<Record<string, number>>({});

  // Conflict warnings: list of course-pair strings that have no valid clash-free combination
  const [conflictWarnings, setConflictWarnings] = useState<string[]>([]);

  // Load backend contexts
  const loadContexts = async () => {
    try {
      const cRes = await fetch("/api/student/courses");
      const cData = await cRes.json();
      if (cRes.ok) setAllCourses(cData);

      const tRes = await fetch("/api/student/teachers");
      const tData = await tRes.json();
      if (tRes.ok) setAllTeachers(tData);

      const slotsRes = await fetch("/api/student/time-slots");
      const slotsData = await slotsRes.json();
      if (slotsRes.ok) setAllSlots(slotsData);

      // Get real sections and schedules
      const secRes = await fetch("/api/student/sections");
      const secData = await secRes.json();
      if (secRes.ok) setAllSections(secData);

      const schRes = await fetch("/api/student/schedules");
      const schData = await schRes.json();
      if (schRes.ok) setAllSchedules(schData);

      // Load section popularity counts
      const popRes = await fetch("/api/student/section-popularity");
      const popData = await popRes.json();
      if (popRes.ok) setSectionPopularity(popData);

      // Load existing user preferences if any
      const pRes = await fetch("/api/student/preferences", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const pData = (await pRes.json()) as RoutinePreferences;
      if (pRes.ok && pData.selectedCourses && pData.selectedCourses.length > 0) {
        // Map code strings back to actual Course objects
        const matchedCourses = pData.selectedCourses
          .map(code => cData.find((c: Course) => c.code === code))
          .filter(Boolean) as Course[];
        setSelectedCourses(matchedCourses);
        setTeacherPriorities(pData.teacherPriorities || {});
        setDaysPreference(pData.daysPreference || { prefer: [], avoid: [] });
        setSlotsPreference(pData.slotsPreference || { prefer: [], avoid: [] });
      }
    } catch (err) {
      console.error("Could not load university routines background context.", err);
    }
  };

  useEffect(() => {
    loadContexts();
  }, [token]);

  // Check for scheduling conflicts whenever selected courses change
  useEffect(() => {
    if (selectedCourses.length < 2 || allSections.length === 0 || allSchedules.length === 0) {
      setConflictWarnings([]);
      return;
    }

    const timeToMin = (t: string): number => {
      if (!t) return 0;
      const m = t.trim().toUpperCase().match(/^(\d+):(\d+)\s*(AM|PM)$/);
      if (!m) return 0;
      let h = parseInt(m[1]); const min = parseInt(m[2]); const ap = m[3];
      if (ap === "PM" && h !== 12) h += 12;
      else if (ap === "AM" && h === 12) h = 0;
      return h * 60 + min;
    };

    const overlaps = (a: ScheduleItem, b: ScheduleItem) =>
      a.day === b.day && timeToMin(a.startTime) < timeToMin(b.endTime) && timeToMin(b.startTime) < timeToMin(a.endTime);

    // For each pair of courses, check if every section combination clashes
    const warnings: string[] = [];
    for (let i = 0; i < selectedCourses.length; i++) {
      for (let j = i + 1; j < selectedCourses.length; j++) {
        const secA = allSections.filter(s => s.courseId === selectedCourses[i].id);
        const secB = allSections.filter(s => s.courseId === selectedCourses[j].id);
        if (secA.length === 0 || secB.length === 0) continue;

        const hasValidPair = secA.some(sa =>
          secB.some(sb => {
            const schA = allSchedules.filter(s => s.sectionId === sa.id);
            const schB = allSchedules.filter(s => s.sectionId === sb.id);
            return !schA.some(a => schB.some(b => overlaps(a, b)));
          })
        );

        if (!hasValidPair) {
          warnings.push(`${selectedCourses[i].code} ↔ ${selectedCourses[j].code}`);
        }
      }
    }
    setConflictWarnings(warnings);
  }, [selectedCourses, allSections, allSchedules]);

  // Autocomplete suggestions filter
  const suggestions = allCourses.filter(
    course =>
      !selectedCourses.some(sc => sc.id === course.id) &&
      (course.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelectCourse = (course: Course) => {
    setSelectedCourses(prev => [...prev, course]);
    setSearchTerm("");
    setSearchFocused(false);
  };

  const handleRemoveCourse = (id: string) => {
    setSelectedCourses(prev => prev.filter(c => c.id !== id));
  };

  // Helper: Get unique teachers offering sections for a course code
  const getCourseTeachers = (courseCode: string): Teacher[] => {
    const courseObj = allCourses.find(c => c.code === courseCode);
    if (!courseObj) return [];
    
    // Find sections for this course
    const courseSections = allSections.filter(sec => sec.courseId === courseObj.id);
    
    // Get unique teachers for these sections
    const teacherIds = Array.from(new Set(courseSections.map(sec => sec.teacherId)));
    
    const teachers = teacherIds
      .map(id => allTeachers.find(t => t.id === id))
      .filter(Boolean) as Teacher[];
      
    // Fallback if no sections are loaded yet to ensure UI loads nicely
    if (teachers.length === 0) {
      return allTeachers.slice(0, 4);
    }
    return teachers;
  };

  // Helper: Get section, day and time details for a faculty model
  const getFacultySessions = (courseCode: string, teacherId: string) => {
    const courseObj = allCourses.find(c => c.code === courseCode);
    if (!courseObj) return [];
    
    const teacherSections = allSections.filter(
      sec => sec.courseId === courseObj.id && sec.teacherId === teacherId
    );
    
    return teacherSections.map(sec => {
      const secSchedules = allSchedules.filter(sch => sch.sectionId === sec.id);
      const uniqueSchedules = new Map<string, string>();
      secSchedules.forEach(sch => {
        const key = `${sch.day} ${sch.startTime}`;
        const value = `${sch.day} ${sch.startTime} - ${sch.endTime}`;
        if (!uniqueSchedules.has(key)) {
          uniqueSchedules.set(key, value);
        }
      });
      const scheduleDetails = Array.from(uniqueSchedules.values());
      
      return {
        sectionCode: sec.sectionCode,
        schedule: scheduleDetails.length > 0 ? scheduleDetails[0] : "No schedule"
      };
    });
  };

  const handleSetPriority = (courseCode: string, teacherCode: string, rating: number) => {
    setTeacherPriorities(prev => ({
      ...prev,
      [courseCode]: {
        ...(prev[courseCode] || {}),
        [teacherCode]: rating
      }
    }));
  };

  const toggleDayPreference = (day: string, type: "prefer" | "avoid" | "neutral") => {
    setDaysPreference(prev => {
      const cleanPrefer = prev.prefer.filter(d => d !== day);
      const cleanAvoid = prev.avoid.filter(d => d !== day);

      if (type === "prefer") {
        return { prefer: [...cleanPrefer, day], avoid: cleanAvoid };
      } else if (type === "avoid") {
        return { prefer: cleanPrefer, avoid: [...cleanClean(cleanAvoid), day] };
      }
      return { prefer: cleanPrefer, avoid: cleanAvoid };
    });

    // Helper to keep types clear inside state callbacks
    function cleanClean(arr: string[]) {
      return arr.filter(d => d !== day);
    }
  };

  const toggleSlotPreference = (slot: string, type: "prefer" | "avoid" | "neutral") => {
    setSlotsPreference(prev => {
      const cleanPrefer = prev.prefer.filter(s => s !== slot);
      const cleanAvoid = prev.avoid.filter(s => s !== slot);

      if (type === "prefer") {
        return { prefer: [...cleanPrefer, slot], avoid: cleanAvoid };
      } else if (type === "avoid") {
        return { prefer: cleanPrefer, avoid: [...cleanAvoid, slot] };
      }
      return { prefer: cleanPrefer, avoid: cleanAvoid };
    });
  };

  // Trigger Backend Optimizer Pipeline
  const handleOptimiseRoutine = async () => {
    setLoading(true);
    try {
      const courseCodes = selectedCourses.map(c => c.code);

      // 1. Permanently record preferences
      await fetch("/api/student/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          selectedCourses: courseCodes,
          teacherPriorities,
          daysPreference,
          slotsPreference
        })
      });

      // 2. Trigger constraint rotation generation
      const res = await fetch("/api/student/generate-routine", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Optimization crashed. Please inspect course options.");
      } else {
        setGeneratedRoutines(data);
        setActiveRoutineIdx(0);
        setStep(5); // Transit to results page
      }
    } catch (err) {
      alert("Verification failed. Make sure server is alive.");
    } finally {
      setLoading(false);
    }
  };

  // Save generated Routine to personal portfolio
  const handleSaveRoutine = async (routine: GeneratedRoutine) => {
    setSavingResultId(routine.id);
    try {
      const res = await fetch("/api/student/saved-routines", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(routine)
      });

      if (res.ok) {
        alert("Routine portfolio entry archived successfully!");
        onSavedSuccess(); // Triggers reload
      } else {
        const d = await res.json();
        alert(d.error || "Failed to save.");
      }
    } catch (err) {
      alert("Network saving failed.");
    } finally {
      setSavingResultId(null);
    }
  };

  // Helper: Convert time string "08:00 AM" or "01:30 PM" to minutes from midnight
  const timeToMinutes = (timeStr: string): number => {
    if (!timeStr) return 0;
    const clean = timeStr.trim().toUpperCase();
    const match = clean.match(/^(\d+):(\d+)\s*(AM|PM)$/);
    if (!match) return 0;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[3];
    if (ampm === "PM" && hours !== 12) hours += 12;
    else if (ampm === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  // Helper: Format minutes back to readable time
  const minutesToTime = (mins: number): string => {
    let hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    const ampm = hours >= 12 ? "PM" : "AM";
    if (hours > 12) hours -= 12;
    if (hours === 0) hours = 12;
    return `${hours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  };

  // Color palette for course blocks
  const courseColors = [
    { bg: "rgba(59, 130, 246, 0.1)", border: "#3b82f6", text: "#1e3a5f", accent: "#dbeafe" },
    { bg: "rgba(16, 185, 129, 0.1)", border: "#10b981", text: "#064e3b", accent: "#d1fae5" },
    { bg: "rgba(245, 158, 11, 0.1)", border: "#f59e0b", text: "#78350f", accent: "#fef3c7" },
    { bg: "rgba(139, 92, 246, 0.1)", border: "#8b5cf6", text: "#4c1d95", accent: "#ede9fe" },
    { bg: "rgba(244, 63, 94, 0.1)", border: "#f43f5e", text: "#881337", accent: "#ffe4e6" },
    { bg: "rgba(6, 182, 212, 0.1)", border: "#06b6d4", text: "#164e63", accent: "#cffafe" },
  ];

  // Weekly Calendar representation data structure — Professional Time-Proportional Grid
  const renderCalendarView = (routine: GeneratedRoutine) => {
    const days = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];

    // Collect ALL schedule time boundaries from the routine to build the timeline
    const allTimes: number[] = [];
    routine.sections.forEach(sec => {
      sec.schedules.forEach(sch => {
        allTimes.push(timeToMinutes(sch.startTime));
        allTimes.push(timeToMinutes(sch.endTime));
      });
    });

    // Also include allSlots boundaries as fallback
    const scheduleSlots = allSlots.length > 0 ? allSlots : ["08:00 AM - 09:30 AM", "10:00 AM - 11:30 AM", "01:00 PM - 02:30 PM", "03:00 PM - 04:30 PM"];
    scheduleSlots.forEach(slot => {
      const parts = slot.split(" - ");
      if (parts.length === 2) {
        allTimes.push(timeToMinutes(parts[0].trim()));
        allTimes.push(timeToMinutes(parts[1].trim()));
      }
    });

    if (allTimes.length === 0) {
      allTimes.push(480, 570, 600, 690, 780, 870, 900, 990); // 8AM-4:30PM fallback
    }    const gridStart = Math.min(...allTimes);
    const gridEnd = Math.max(...allTimes);

    // Round to nearest hours for clean timeline
    const startHourMin = Math.max(0, Math.floor(gridStart / 60) * 60);
    const endHourMin = Math.ceil(gridEnd / 60) * 60;
    const totalMinutes = endHourMin - startHourMin;

    const hours: number[] = [];
    for (let m = startHourMin; m <= endHourMin; m += 60) {
      hours.push(m);
    }

    // 1200px min width gives enough room for detail so times won't overlap
    const timelineMinWidth = "1200px";

    return (
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm mt-8 border-t-4 border-t-indigo-600">
        <div className="bg-slate-50/70 p-4 flex items-center justify-between border-b border-slate-100">
          <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2 font-display">
            <CalendarDays className="h-4.5 w-4.5 text-indigo-600" />
            <span>Weekly Schedule Timeline</span>
          </h4>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100 font-bold uppercase tracking-wider">
              Absolute Timeline
            </span>
          </div>
        </div>

        <div className="overflow-x-auto bg-slate-50/30">
          <div style={{ minWidth: timelineMinWidth }} className="flex flex-col">
            {/* Time Header Row */}
            <div className="flex border-b border-slate-200 bg-slate-50/50" style={{ height: "40px" }}>
              <div className="w-[80px] shrink-0 p-2 text-[11px] uppercase font-mono font-bold tracking-wider text-slate-500 text-center border-r border-slate-200/60 bg-slate-50/75 flex items-center justify-center">
                Day
              </div>
              <div className="relative flex-1">
                {hours.map((h, i) => (
                  <div
                    key={h}
                    className="absolute top-0 bottom-0 border-l border-slate-300 pl-1.5 pt-1.5"
                    style={{ left: `${((h - startHourMin) / totalMinutes) * 100}%` }}
                  >
                    <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                      {minutesToTime(h)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Day Rows */}
            {days.map((day, dIdx) => {
              // Collect all classes for this day
              const dayClasses: {
                section: typeof routine.sections[0];
                schedule: typeof routine.sections[0]["schedules"][0];
                startMin: number;
                endMin: number;
              }[] = [];

              routine.sections.forEach(sec => {
                sec.schedules.forEach(sch => {
                  if (sch.day === day) {
                    dayClasses.push({
                      section: sec,
                      schedule: sch,
                      startMin: timeToMinutes(sch.startTime),
                      endMin: timeToMinutes(sch.endTime)
                    });
                  }
                });
              });

              dayClasses.sort((a, b) => a.startMin - b.startMin);

              return (
                <div
                  key={dIdx}
                  className="flex border-b border-slate-200 hover:bg-slate-50/80 transition-colors bg-white relative group"
                  style={{ minHeight: "120px" }}
                >
                  {/* Day Label */}
                  <div className="w-[80px] shrink-0 p-2 font-bold font-mono text-slate-700 bg-slate-50/40 border-r border-slate-200 text-[10px] text-center uppercase tracking-wide flex items-center justify-center">
                    {day.substring(0, 3)}
                  </div>

                  {/* Timeline Area */}
                  <div className="relative flex-1">
                    {/* Background hour lines */}
                    {hours.map((h) => (
                      <div
                        key={h}
                        className="absolute top-0 bottom-0 border-l border-slate-100 pointer-events-none"
                        style={{ left: `${((h - startHourMin) / totalMinutes) * 100}%` }}
                      />
                    ))}

                    {/* Class Blocks */}
                    {dayClasses.map((dc, i) => {
                      const courseIdx = routine.sections.indexOf(dc.section);
                      const colorSet = courseColors[courseIdx % courseColors.length];
                      const durationMinutes = dc.endMin - dc.startMin;
                      const isLab = durationMinutes >= 120;

                      return (
                        <div
                          key={i}
                          className="absolute top-1.5 bottom-1.5 p-1 transition-transform hover:z-10 hover:scale-[1.02]"
                          style={{
                            left: `${((dc.startMin - startHourMin) / totalMinutes) * 100}%`,
                            width: `${(durationMinutes / totalMinutes) * 100}%`
                          }}
                        >
                          <div
                            style={{
                              background: colorSet.bg,
                              borderLeft: `4px solid ${colorSet.border}`,
                              borderTop: `1px solid ${colorSet.accent}`,
                              borderRight: `1px solid ${colorSet.accent}`,
                              borderBottom: `1px solid ${colorSet.accent}`,
                              color: colorSet.text,
                            }}
                            className="h-full rounded-lg p-2.5 shadow-sm hover:shadow-md relative overflow-hidden flex flex-col"
                          >
                            {isLab && (
                              <span
                                style={{ background: colorSet.border }}
                                className="absolute top-1 right-1 text-white text-[7px] font-mono font-black px-1 py-0.5 rounded uppercase tracking-wider"
                              >
                                LAB
                              </span>
                            )}
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="font-extrabold text-[11px] tracking-tight truncate">
                                {dc.section.courseCode}
                              </span>
                              <span className="font-mono text-[8px] font-bold px-1 py-0.5 rounded shrink-0" style={{ background: "rgba(0,0,0,0.05)" }}>
                                {dc.section.sectionCode}
                              </span>
                            </div>
                            <p className="text-[9px] leading-tight font-medium opacity-90 truncate mb-1">
                              {selectedCourses.find(c => c.code === dc.section.courseCode)?.name || dc.section.courseName}
                            </p>
                            <div className="flex items-center gap-1 text-[8px] font-mono opacity-80 mt-auto">
                              <Clock className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate">{dc.schedule.startTime} – {dc.schedule.endTime}</span>
                            </div>
                            <div className="flex items-center justify-between gap-1 mt-1 border-t pt-1" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
                              <span className="text-[8px] font-mono font-semibold truncate" style={{ opacity: 0.8 }}>
                                {dc.schedule.room || "TBA"}
                              </span>
                              <span className="text-[8px] font-mono font-bold shrink-0" style={{ background: "rgba(0,0,0,0.05)", padding: "1px 4px", borderRadius: "3px" }} title={dc.section.teacherName}>
                                {dc.section.teacherCode}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 font-sans">
      {/* Wizard Step Navigation */}
      <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-5">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-black text-white rounded-xl flex items-center justify-center">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Optimization Engine wizard</h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              Constraint Satisfaction Algorithm (CSP) builder
            </p>
          </div>
        </div>

        {step < 5 && (
          <div className="flex items-center space-x-1.5 text-xs font-mono">
            {[1, 2, 3, 4].map((stepNum) => (
              <span
                key={stepNum}
                className={`h-6 w-6 rounded-full flex items-center justify-center font-bold ${
                  step === stepNum
                    ? "bg-black text-white"
                    : step > stepNum
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {stepNum}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* STEP 1: COURSE SEARCH */}
      {step === 1 && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Step 1: Course Offering Selection</h3>
            <p className="text-sm text-gray-500 mt-1">
              Search and add the course codes you wish to study this trimester (e.g. CSE111, CSE220, MAT120).
            </p>
          </div>

          {/* Autocomplete Search Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search className="h-5 w-5" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onFocus={() => setSearchFocused(true)}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Course Code or Course Title (e.g., CSE111, Calculus)"
              className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-shadow bg-white"
            />

            {/* Suggestions Overlay */}
            {searchFocused && (searchTerm.length >= 0 || suggestions.length > 0) && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto divide-y divide-gray-50 animate-fade-in">
                {suggestions.length === 0 ? (
                  <div className="p-4 text-xs font-mono text-gray-400 text-center">No available courses matched</div>
                ) : (
                  suggestions.map((course) => (
                    <div
                      key={course.id}
                      onClick={() => handleSelectCourse(course)}
                      className="p-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <span className="font-mono font-bold text-xs bg-gray-100 px-1.5 py-0.5 rounded border border-gray-150 text-black">
                          {course.code}
                        </span>
                        <span className="text-xs text-gray-700 ml-3 font-medium">{course.name}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono">Summer 26 Offer</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Conflict Warning Banner */}
          {conflictWarnings.length > 0 && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1.5">
              <p className="font-bold flex items-center space-x-1.5">
                <Info className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Schedule Conflict Detected</span>
              </p>
              <p className="text-amber-700">These course pairs have <b>no clash-free section combination</b> — routine generation will return no results for them:</p>
              <ul className="list-disc list-inside space-y-0.5 pl-1">
                {conflictWarnings.map(w => <li key={w} className="font-mono font-bold">{w}</li>)}
              </ul>
            </div>
          )}

          {/* Selected courses rendering */}
          {selectedCourses.length === 0 ? (
            <div className="py-12 border border-dashed border-gray-150 bg-gray-50/20 rounded-xl text-center">
              <Book className="h-8 w-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 font-medium">No courses selected yet</p>
              <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                Begin typing in the search bar above to look up offered trimesters course portfolios.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {selectedCourses.map((course) => {
                const courseSections = allSections.filter(s => s.courseId === course.id);
                const totalStudents = courseSections.reduce((acc, s) => acc + (sectionPopularity[s.id] || 0), 0);
                const hasConflict = conflictWarnings.some(w => w.includes(course.code));
                return (
                  <div
                    key={course.id}
                    className={`p-4 bg-white border rounded-xl shadow-xs hover:shadow-sm transition-all flex justify-between items-start ${hasConflict ? "border-amber-300 bg-amber-50/30" : "border-gray-150"}`}
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono font-bold text-xs bg-black text-white px-2 py-0.5 rounded">
                          {course.code}
                        </span>
                        {totalStudents > 0 && (
                          <span className="text-[9px] font-mono bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded-full font-bold">
                            👥 {totalStudents} enrolled
                          </span>
                        )}
                        {hasConflict && (
                          <span className="text-[9px] font-mono bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full font-bold">
                            ⚠ Conflict
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-gray-900 pt-1.5">{course.name}</h4>
                      <p className="text-[10px] text-gray-400 font-mono">{courseSections.length} sections available</p>
                    </div>
                    <button
                      onClick={() => handleRemoveCourse(course.id)}
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer"
                      title="Remove Course Allocation"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Controls Footer */}
          <div className="pt-6 border-t border-gray-100 flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={selectedCourses.length === 0}
              className="flex items-center space-x-2 px-6 py-3 bg-black hover:bg-gray-800 disabled:bg-gray-300 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
            >
              <span>Next: Set Faculty Priorities</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: FACULTY PRIORITY */}
      {step === 2 && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Step 2: Faculty Priorities Allocation</h3>
            <p className="text-sm text-gray-500 mt-1">
              Rate your preferred teachers for each selected course. Higher rated teachers will increase routine eligibility.
            </p>
          </div>

          <div className="space-y-6">
            {selectedCourses.map((course) => {
              const teachers = getCourseTeachers(course.code);

              return (
                <div key={course.id} className="bg-white border border-gray-150 rounded-xl p-5 space-y-4 shadow-xs">
                  <div className="flex items-center space-x-3 border-b border-gray-50 pb-3">
                    <span className="font-mono text-xs font-bold bg-black text-white px-2 py-0.5 rounded">
                      {course.code}
                    </span>
                    <h4 className="text-sm font-bold text-gray-950">{course.name}</h4>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-mono uppercase tracking-wider text-gray-400">
                      Offered Professors / ratings Priority
                    </p>
                    {teachers.map((t) => {
                      const priority = teacherPriorities[course.code]?.[t.code] ?? 3; // default is 3 star

                      return (
                        <div
                          key={t.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50/60 rounded-xl border border-slate-150/60 gap-4"
                        >
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <p className="text-sm sm:text-base font-bold text-slate-950">{t.name}</p>
                            <div className="flex items-center space-x-2 text-xs text-slate-500">
                              <span className="font-mono text-sm text-amber-500 font-extrabold flex items-center gap-0.5">
                                &#9733; {t.averageRating}
                              </span>
                              <span>•</span>
                              <span className="font-medium">{t.ratingCount} Reviews</span>
                            </div>
                            
                            {/* Available Sections, Days, and Times */}
                            <div className="pt-1.5">
                              <p className="text-[10.5px] sm:text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-1">Available slots & sections:</p>
                              <div className="flex flex-wrap gap-2">
                                {getFacultySessions(course.code, t.id).map((sess, sIdx) => (
                                  <div key={sIdx} className="text-xs text-slate-700 bg-white shadow-2xs border border-slate-200 rounded-md px-3 py-1.5 flex items-center gap-1.5 mt-0.5">
                                    <span className="font-extrabold text-indigo-650 shrink-0">Sec {sess.sectionCode}</span>
                                    <span className="text-slate-300">|</span>
                                    <span className="font-mono text-slate-600 text-xs font-semibold">{sess.schedule}</span>
                                  </div>
                                ))}
                                {getFacultySessions(course.code, t.id).length === 0 && (
                                  <p className="text-xs text-slate-400 italic">No schedules listed</p>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5 self-start sm:self-auto">
                            {[1, 2, 3, 4, 5].map((starNum) => (
                              <button
                                key={starNum}
                                type="button"
                                onClick={() => handleSetPriority(course.code, t.code, starNum)}
                                className="p-1 focus:outline-none cursor-pointer group"
                              >
                                <Star
                                  className={`h-5 w-5 transition-transform group-hover:scale-110 ${
                                    starNum <= priority
                                      ? "text-yellow-400 fill-yellow-400"
                                      : "text-gray-300"
                                  }`}
                                />
                              </button>
                            ))}
                            <span className="text-xs font-mono font-semibold text-gray-500 ml-1">
                              ({priority} Stars)
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Controls Footer */}
          <div className="pt-6 border-t border-gray-100 flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="flex items-center space-x-2 px-5 py-2.5 border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-medium transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex items-center space-x-2 px-6 py-3 bg-black hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
            >
              <span>Next: Day Preferences</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: DAY PREFERENCE */}
      {step === 3 && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Step 3: Day Preferences Settings</h3>
            <p className="text-sm text-gray-500 mt-1">
              Select days you prefer having classes vs days you would like to keep free. These directly alter optimal scores.
            </p>
          </div>

          <div className="space-y-4">
            {["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"].map((day) => {
              const isPreferred = daysPreference.prefer.includes(day);
              const isAvoided = daysPreference.avoid.includes(day);
              const state = isPreferred ? "prefer" : isAvoided ? "avoid" : "neutral";

              return (
                <div
                  key={day}
                  className={`p-4 border rounded-xl flex items-center justify-between transition-colors ${
                    isPreferred
                      ? "border-green-350 bg-green-50/10"
                      : isAvoided
                      ? "border-red-350 bg-red-50/10"
                      : "border-gray-150 bg-white"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-bold text-gray-950">{day}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {isPreferred ? "Increases rating of this weekday" : isAvoided ? "Penalizes classes on this day" : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex bg-gray-50/50 p-1 rounded-lg border border-gray-150/50 space-x-1">
                    <button
                      type="button"
                      onClick={() => toggleDayPreference(day, "prefer")}
                      className={`px-3 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                        state === "prefer"
                          ? "bg-green-600 text-white"
                          : "text-gray-500 hover:text-black hover:bg-gray-100"
                      }`}
                    >
                      Prefer
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleDayPreference(day, "neutral")}
                      className={`px-3 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                        state === "neutral"
                          ? "bg-gray-900 text-white"
                          : "text-gray-500 hover:text-black hover:bg-gray-100"
                      }`}
                    >
                      Neutral
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleDayPreference(day, "avoid")}
                      className={`px-3 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                        state === "avoid"
                          ? "bg-red-600 text-white"
                          : "text-gray-500 hover:text-black hover:bg-gray-100"
                      }`}
                    >
                      Avoid
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Controls Footer */}
          <div className="pt-6 border-t border-gray-100 flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="flex items-center space-x-2 px-5 py-2.5 border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-medium transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            <button
              onClick={() => setStep(4)}
              className="flex items-center space-x-2 px-6 py-3 bg-black hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
            >
              <span>Next: Time Slot Preference</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: TIME SLOT PREFERENCE */}
      {step === 4 && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Step 4: Academic Time Slot Preference</h3>
            <p className="text-sm text-gray-500 mt-1">
              Configure preferred or avoided hours extracted dynamically from schedule records database.
            </p>
          </div>

          <div className="space-y-4">
            {allSlots.length === 0 ? (
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start space-x-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                   No distinct schedules have been loaded yet. Please contact administrative staff to upload offering lists first, or use our basic default schedule grids (8:00 AM, 10:00 AM, 1:00 PM, 3:00 PM).
                </span>
              </div>
            ) : null}

            {(allSlots.length > 0 ? allSlots : ["08:00 AM - 09:30 AM", "10:00 AM - 11:30 AM", "01:00 PM - 02:30 PM", "03:00 PM - 04:30 PM"]).map((slot) => {
              const isPreferred = slotsPreference.prefer.includes(slot);
              const isAvoided = slotsPreference.avoid.includes(slot);
              const state = isPreferred ? "prefer" : isAvoided ? "avoid" : "neutral";

              return (
                <div
                  key={slot}
                  className={`p-4 border rounded-xl flex items-center justify-between transition-colors ${
                    isPreferred
                      ? "border-green-350 bg-green-50/10"
                      : isAvoided
                      ? "border-red-350 bg-red-50/10"
                      : "border-gray-150 bg-white"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-bold text-gray-900 font-mono">{slot}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {isPreferred ? "Prefer scheduling in this interval" : isAvoided ? "Prefer to avoid lectures in this window" : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex bg-gray-50/50 p-1 rounded-lg border border-gray-150/50 space-x-1">
                    <button
                      type="button"
                      onClick={() => toggleSlotPreference(slot, "prefer")}
                      className={`px-3 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                        state === "prefer"
                          ? "bg-green-600 text-white"
                          : "text-gray-500 hover:text-black hover:bg-gray-100"
                      }`}
                    >
                      Prefer
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSlotPreference(slot, "neutral")}
                      className={`px-3 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                        state === "neutral"
                          ? "bg-gray-900 text-white"
                          : "text-gray-500 hover:text-black hover:bg-gray-100"
                      }`}
                    >
                      Neutral
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSlotPreference(slot, "avoid")}
                      className={`px-3 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                        state === "avoid"
                          ? "bg-red-600 text-white"
                          : "text-gray-500 hover:text-black hover:bg-gray-100"
                      }`}
                    >
                      Avoid
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Controls Footer */}
          <div className="pt-6 border-t border-gray-100 flex justify-between">
            <button
              onClick={() => setStep(3)}
              className="flex items-center space-x-2 px-5 py-2.5 border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-medium transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            <button
              onClick={handleOptimiseRoutine}
              disabled={loading}
              className="flex items-center space-x-2 px-7 py-3.5 bg-black hover:bg-gray-800 disabled:bg-gray-300 text-white rounded-xl text-sm font-bold transition-transform cursor-pointer shadow-md transform hover:scale-102"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Generating routines (OR-Tools)...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4.5 w-4.5" />
                  <span>Build My Routine Portfolios</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: OPTIMIZER RESULTS VIEW */}
      {step === 5 && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-50 pb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <span>Optimized Routine Options Generated (Top {generatedRoutines.length})</span>
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Based on your ratings priorities, preferred times, and class gap penalties.
              </p>
            </div>
            <button
              onClick={() => setStep(4)}
              className="px-3.5 py-1.5 border border-gray-200 text-xs font-semibold rounded hover:bg-gray-50 transition-colors self-start sm:self-auto cursor-pointer"
            >
              Adjust Inputs
            </button>
          </div>

          {generatedRoutines.length === 0 ? (
            <div className="p-8 text-center bg-red-50 border border-red-100 text-red-900 rounded-xl space-y-4">
              <Info className="h-8 w-8 text-red-500 mx-auto" />
              <h4 className="text-md font-bold">Unsatisfiable Routine Constraints (No Clash Clashes!)</h4>
              <p className="text-xs max-w-lg mx-auto text-red-700">
                The courses, sections, and schedules selected have absolute physical timeline overlap conflicts, or no available combination is clash-free.
              </p>
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 bg-red-650 hover:bg-red-700 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Reselect Courses (Step 1)
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              {/* Option Selector List */}
              <div className="space-y-3 md:col-span-1 max-h-[500px] overflow-y-auto pr-2">
                {generatedRoutines.map((rot, idx) => {
                  const isActive = activeRoutineIdx === idx;
                  const isTop3 = idx < 3;

                  return (
                    <div
                      key={rot.id}
                      onClick={() => setActiveRoutineIdx(idx)}
                      className={`p-3.5 border rounded-xl cursor-pointer transition-all ${
                        isActive
                          ? "border-black bg-gray-50"
                          : "border-gray-150 bg-white hover:border-gray-200"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono font-bold text-gray-400">OPTION {idx + 1}</span>
                        {isTop3 && (
                          <span className="bg-amber-100 text-amber-900 border border-amber-200 text-[8px] font-mono uppercase font-black px-1 rounded">
                            Top 3 Choice
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 mt-2">
                        <span className="text-xl font-bold font-mono tracking-tighter shrink-0">{rot.matchPercentage}%</span>
                        <div className="truncate">
                          <p className="text-xs font-medium text-gray-400 truncate">Match Score</p>
                        </div>
                      </div>

                      <p className="text-[10px] text-gray-500 font-mono mt-2 truncate">
                        {rot.selectedCourses.join(" • ")}
                      </p>

                      <div className="flex items-center space-x-1.5 mt-2.5 text-[9px] text-gray-400 font-mono">
                        <span>{rot.freeDays.length} Free Days</span>
                        <span>•</span>
                        <span>{rot.gapsCount} gaps</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Active Option Detail Card */}
              {generatedRoutines[activeRoutineIdx] && (
                <div className="md:col-span-2 bg-white rounded-xl border border-gray-150 shadow-sm p-5 space-y-6">
                  {/* Summary analytics metrics details */}
                  <div className="flex items-start justify-between border-b border-gray-50 pb-4">
                    <div>
                      <h4 className="text-md font-bold text-gray-950 flex items-center space-x-2">
                        <span>Schedule Portfolio Detail</span>
                        <span className="px-2 py-0.5 bg-black text-white text-[9px] font-mono rounded">
                          Option {activeRoutineIdx + 1}
                        </span>
                      </h4>
                      <p className="text-xs mt-1 text-gray-400">Evaluated score context breakdown</p>
                    </div>

                    <button
                      onClick={() => handleSaveRoutine(generatedRoutines[activeRoutineIdx])}
                      disabled={savingResultId === generatedRoutines[activeRoutineIdx].id}
                      className="flex items-center space-x-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 font-bold text-white text-xs rounded transition-colors cursor-pointer"
                    >
                      {savingResultId === generatedRoutines[activeRoutineIdx].id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      <span>Save Routine Portfolio</span>
                    </button>
                  </div>

                  {/* Rating parameters bar charts */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="bg-gray-50/50 p-2 border border-gray-100 rounded-lg text-center">
                      <span className="block text-[8px] font-mono text-gray-400 uppercase">Faculty Match</span>
                      <span className="text-sm font-extrabold text-gray-900">{generatedRoutines[activeRoutineIdx].details.teacherScore}%</span>
                    </div>
                    <div className="bg-gray-50/50 p-2 border border-gray-100 rounded-lg text-center">
                      <span className="block text-[8px] font-mono text-gray-400 uppercase">Day Match</span>
                      <span className="text-sm font-extrabold text-gray-900">{generatedRoutines[activeRoutineIdx].details.dayScore}%</span>
                    </div>
                    <div className="bg-gray-50/50 p-2 border border-gray-100 rounded-lg text-center">
                      <span className="block text-[8px] font-mono text-gray-400 uppercase">slots Match</span>
                      <span className="text-sm font-extrabold text-gray-900">{generatedRoutines[activeRoutineIdx].details.timeScore}%</span>
                    </div>
                    <div className="bg-gray-50/50 p-2 border border-gray-100 rounded-lg text-center">
                      <span className="block text-[8px] font-mono text-gray-400 uppercase">Free Day Bonus</span>
                      <span className="text-sm font-extrabold text-green-600">{generatedRoutines[activeRoutineIdx].details.freeDayBonus}%</span>
                    </div>
                    <div className="bg-gray-50/50 p-2 border border-gray-100 rounded-lg text-center">
                      <span className="block text-[8px] font-mono text-gray-400 uppercase">Gap Score</span>
                      <span className="text-sm font-extrabold text-gray-900">{generatedRoutines[activeRoutineIdx].details.gapScore}%</span>
                    </div>
                  </div>

                  {/* Bullet points of optimization analyses */}
                  <div className="bg-gray-50/30 p-4 border border-gray-100 rounded-xl space-y-2 text-xs text-gray-700">
                    <p className="font-bold font-mono uppercase tracking-wider text-[10px] text-gray-400 pb-1 border-b border-gray-100/50">
                      Routine Analysis Logs
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <p className="flex justify-between">
                          <span className="text-gray-400">Total Classes Gap count:</span>
                          <span className="font-bold">{generatedRoutines[activeRoutineIdx].gapsCount} gaps</span>
                        </p>
                        <p className="flex justify-between">
                          <span className="text-gray-400">Average Interval Time:</span>
                          <span className="font-bold">
                            {generatedRoutines[activeRoutineIdx].averageGapMinutes > 0
                              ? `${generatedRoutines[activeRoutineIdx].averageGapMinutes} mins`
                              : "0 Mins (Perfect Back-to-Back!)"}
                          </span>
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p className="flex justify-between">
                          <span className="text-gray-400">Scheduled Days:</span>
                          <span className="font-bold">
                            {6 - generatedRoutines[activeRoutineIdx].freeDays.length} Days
                          </span>
                        </p>
                        <p className="flex justify-between">
                          <span className="text-gray-400">Free weekdays:</span>
                          <span className="font-bold text-green-600">
                            {generatedRoutines[activeRoutineIdx].freeDays.length > 0
                              ? generatedRoutines[activeRoutineIdx].freeDays.join(", ")
                              : "None"}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Calendar schedule view */}
                  {renderCalendarView(generatedRoutines[activeRoutineIdx])}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

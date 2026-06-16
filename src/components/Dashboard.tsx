/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import {
  Calendar,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Award,
  Clock,
  Trash2,
  CalendarDays,
  Sparkles,
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
  Share2,
  Megaphone,
  AlertCircle
} from "lucide-react";
import { Course, GeneratedRoutine, Announcement, ExamSchedule } from "../types";

interface DashboardProps {
  token: string;
  user: any;
  onNavigateToBuilder: () => void;
  onNavigateToRankings: () => void;
}

export default function Dashboard({ token, user, onNavigateToBuilder, onNavigateToRankings }: DashboardProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [savedRoutines, setSavedRoutines] = useState<GeneratedRoutine[]>([]);
  const [activeExpandedRoutineId, setActiveExpandedRoutineId] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [exams, setExams] = useState<ExamSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadDashboardData = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      // 1. Fetch offered academic courses
      const cRes = await fetch("/api/student/courses");
      const cData = await cRes.json();
      if (cRes.ok) setCourses(cData);

      // 2. Fetch saved routine portfolios
      const sRes = await fetch("/api/student/saved-routines", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const sData = await sRes.json();
      if (sRes.ok) {
        setSavedRoutines(sData);
        if (sData.length > 0) {
          setActiveExpandedRoutineId(sData[0].id);
        }
      }

      // 3. Fetch announcements
      const aRes = await fetch("/api/announcements");
      const aData = await aRes.json();
      if (aRes.ok) setAnnouncements(aData);

      // 4. Fetch exams
      const eRes = await fetch("/api/exams");
      const eData = await eRes.json();
      if (eRes.ok) setExams(eData);
    } catch (err) {
      setErrorMessage("Could not load dashboard data from database.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [token]);

  const handleDeleteRoutine = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this saved routine option?")) return;

    try {
      const res = await fetch(`/api/student/saved-routines/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSavedRoutines(prev => prev.filter(r => r.id !== id));
        if (activeExpandedRoutineId === id) {
          setActiveExpandedRoutineId(null);
        }
      }
    } catch (err) {
      alert("Failed to delete the routine check.");
    }
  };

  const handleShareRoutine = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch("/api/routine/share", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ routineId: id })
      });
      const data = await res.json();
      if (res.ok) {
        const link = `${window.location.origin}/share/${data.shareId}`;
        await navigator.clipboard.writeText(link);
        alert("Share link copied to clipboard!");
      }
    } catch(err) {
      alert("Failed to generate share link.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Dynamic Welcome Heading */}
      <div className="glass-panel-dark text-white rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center md:justify-between space-y-6 md:space-y-0 mb-8">
        <div>
          <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono font-bold bg-white/10 text-indigo-200 mb-4 border border-white/10 tracking-wider uppercase">
            <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
            <span>Target Trimester: Summer 2026</span>
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display">
            Assalamu Alaikum, {user?.name}!
          </h2>
          <p className="text-slate-300 text-sm sm:text-base mt-2 max-w-xl font-sans leading-relaxed">
            Ready to arrange your trimester schedules? Upload your trimester details, select preferences, and generate non-clashing visual routines in seconds.
          </p>
        </div>
        <div>
          <button
            onClick={onNavigateToBuilder}
            className="flex items-center space-x-2.5 w-full md:w-auto px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all cursor-pointer shadow-md shadow-indigo-950/20 group font-sans"
          >
            <span>PDF to Routine Nao</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          <span className="text-xs font-mono text-slate-400 mt-4">Retrieving university dashboard...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Left Columns: Saved schedules & Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* SAVED ROUTINE MANAGER */}
            <div className="glass-panel rounded-2xl p-6">
              <div className="flex items-center justify-between border-b border-white/40 pb-4 mb-6">
                <div>
                  <h3 className="text-md font-bold text-slate-800 flex items-center space-x-2 font-display">
                    <CalendarDays className="h-5 w-5 text-indigo-650" />
                    <span>My Saved Routines</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-1">
                    Your personal optimized trimester routines checklist
                  </p>
                </div>
                <span className="px-3 py-1 text-xs font-mono font-bold bg-white/60 border border-white/50 text-indigo-600 rounded-full shadow-xs">
                  {savedRoutines.length} Saved
                </span>
              </div>

              {savedRoutines.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl bg-white/30">
                  <Calendar className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-650 font-semibold font-display">No routine configurations saved yet</p>
                  <p className="text-xs text-none text-slate-400 mt-1.5 max-w-xs mx-auto mb-6 leading-relaxed">
                    Run the SectionBhai optimization tool to generate conflict-free choices
                  </p>
                  <button
                    onClick={onNavigateToBuilder}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer shadow-sm"
                  >
                    Build First Routine
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {savedRoutines.map((routine) => {
                    const isExpanded = activeExpandedRoutineId === routine.id;

                    return (
                      <div
                        key={routine.id}
                        className={`transition-all rounded-xl border overflow-hidden ${
                          isExpanded
                            ? "border-indigo-200 bg-white/70 shadow-xs"
                            : "border-white/50 bg-white/30 hover:bg-white/50"
                        }`}
                      >
                        {/* Header Header Summary */}
                        <div
                          onClick={() => setActiveExpandedRoutineId(isExpanded ? null : routine.id)}
                          className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                        >
                          <div className="flex items-start space-x-3">
                            <div className="h-10 w-10 rounded-lg bg-black/5 flex flex-col items-center justify-center border border-black/5">
                              <span className="text-xs font-mono font-bold leading-none text-black">
                                {routine.matchPercentage}%
                              </span>
                              <span className="text-[8px] font-mono uppercase text-gray-400 mt-1">Match</span>
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-gray-900">{routine.name}</h4>
                              <p className="text-xs text-gray-500 font-mono mt-1">
                                {routine.selectedCourses.join(" • ")}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3 self-end sm:self-auto">
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-green-50 text-green-700 border border-green-100">
                              <Award className="h-3 w-3" />
                              <span>{routine.freeDays.length} Free Days</span>
                            </span>

                            <button
                              onClick={(e) => handleShareRoutine(routine.id, e)}
                              className="p-1 px-2 border border-blue-100 text-blue-500 hover:text-white hover:bg-blue-500 hover:border-blue-500 rounded transition-all cursor-pointer"
                              title="Share routine link"
                            >
                              <Share2 className="h-3.5 w-3.5" />
                            </button>

                            <button
                              onClick={(e) => handleDeleteRoutine(routine.id, e)}
                              className="p-1 px-2 border border-red-100 text-red-500 hover:text-white hover:bg-red-500 hover:border-red-500 rounded transition-all cursor-pointer"
                              title="Delete routine"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>

                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                        </div>

                        {/* Expandable Schedule Body & Calendar */}
                        {isExpanded && (
                          <div className="p-4 sm:p-6 border-t border-gray-50 bg-white animate-fade-in space-y-6">
                            {/* Analytics Summary */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-gray-50">
                              <div className="p-2 border border-dotted border-gray-100 rounded-lg">
                                <span className="block text-[10px] font-mono text-gray-400 uppercase">Match Score</span>
                                <span className="text-md font-bold text-gray-900">{routine.score} pts</span>
                              </div>
                              <div className="p-2 border border-dotted border-gray-100 rounded-lg">
                                <span className="block text-[10px] font-mono text-gray-400 uppercase">Gaps count</span>
                                <span className="text-md font-bold text-gray-900">{routine.gapsCount} gaps</span>
                              </div>
                              <div className="p-2 border border-dotted border-gray-100 rounded-lg">
                                <span className="block text-[10px] font-mono text-gray-400 uppercase">Total Credits</span>
                                <span className="text-md font-bold text-gray-900">
                                  {routine.sections.reduce((acc, sec) => {
                                    const c = courses.find(c => c.code === sec.courseCode);
                                    return acc + (c?.credits || 3);
                                  }, 0)}
                                </span>
                              </div>
                              <div className="p-2 border border-dotted border-gray-100 rounded-lg">
                                <span className="block text-[10px] font-mono text-gray-400 uppercase">Class Gap</span>
                                <span className="text-md font-bold text-gray-900">
                                  {routine.averageGapMinutes > 0 ? `${routine.averageGapMinutes} mins` : "None"}
                                </span>
                              </div>
                              <div className="p-2 border border-dotted border-gray-100 rounded-lg">
                                <span className="block text-[10px] font-mono text-gray-400 uppercase">Free days</span>
                                <span className="text-md font-bold text-green-600 truncate">
                                  {routine.freeDays.length > 0 ? routine.freeDays.join(", ") : "None"}
                                </span>
                              </div>
                            </div>

                            {/* Professional Time-Proportional Schedule Grid */}
                            {(() => {
                              const days = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];

                              const timeToMin = (timeStr: string): number => {
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

                              const minToTime = (mins: number): string => {
                                let hours = Math.floor(mins / 60);
                                const minutes = mins % 60;
                                const ampm = hours >= 12 ? "PM" : "AM";
                                if (hours > 12) hours -= 12;
                                if (hours === 0) hours = 12;
                                return `${hours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
                              };

                              const colorPalette = [
                                { bg: "rgba(59, 130, 246, 0.1)", border: "#3b82f6", text: "#1e3a5f", accent: "#dbeafe" },
                                { bg: "rgba(16, 185, 129, 0.1)", border: "#10b981", text: "#064e3b", accent: "#d1fae5" },
                                { bg: "rgba(245, 158, 11, 0.1)", border: "#f59e0b", text: "#78350f", accent: "#fef3c7" },
                                { bg: "rgba(139, 92, 246, 0.1)", border: "#8b5cf6", text: "#4c1d95", accent: "#ede9fe" },
                                { bg: "rgba(244, 63, 94, 0.1)", border: "#f43f5e", text: "#881337", accent: "#ffe4e6" },
                                { bg: "rgba(6, 182, 212, 0.1)", border: "#06b6d4", text: "#164e63", accent: "#cffafe" },
                              ];

                              // Build time boundaries
                              const allTimes: number[] = [];
                              routine.sections.forEach(sec => {
                                sec.schedules.forEach(sch => {
                                  allTimes.push(timeToMin(sch.startTime));
                                  allTimes.push(timeToMin(sch.endTime));
                                });
                              });
                              if (allTimes.length === 0) {
                                allTimes.push(480, 570, 600, 690, 780, 870, 900, 990);
                              }

                              const gridStart = Math.min(...allTimes);
                              const gridEnd = Math.max(...allTimes);

                              const startHourMin = Math.max(0, Math.floor(gridStart / 60) * 60);
                              const endHourMin = Math.ceil(gridEnd / 60) * 60;
                              const totalMinutes = endHourMin - startHourMin;

                              const hours: number[] = [];
                              for (let m = startHourMin; m <= endHourMin; m += 60) {
                                hours.push(m);
                              }

                              const timelineMinWidth = "1000px";

                              return (
                                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm border-t-4 border-t-indigo-600">
                                  <div className="bg-slate-50/70 p-3 flex items-center justify-between border-b border-slate-100">
                                    <h4 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5 font-display">
                                      <CalendarDays className="h-4 w-4 text-indigo-600" />
                                      <span>Weekly Schedule</span>
                                    </h4>
                                    <span className="text-[9px] font-mono bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100 font-bold uppercase tracking-wider">
                                      Absolute Timeline
                                    </span>
                                  </div>

                                  <div className="overflow-x-auto bg-slate-50/30">
                                    <div style={{ minWidth: timelineMinWidth }} className="flex flex-col">
                                      {/* Time Header */}
                                      <div className="flex border-b border-slate-200 bg-slate-50/50" style={{ height: "36px" }}>
                                        <div className="w-[70px] shrink-0 p-1.5 text-[10px] uppercase font-mono font-bold tracking-wider text-slate-500 text-center border-r border-slate-200/60 bg-slate-50/75 flex items-center justify-center">
                                          Day
                                        </div>
                                        <div className="relative flex-1">
                                          {hours.map((h) => (
                                            <div
                                              key={h}
                                              className="absolute top-0 bottom-0 border-l border-slate-300 pl-1 pt-1"
                                              style={{ left: `${((h - startHourMin) / totalMinutes) * 100}%` }}
                                            >
                                              <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                                                {minToTime(h)}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Day Rows */}
                                      {days.map((day, dIdx) => {
                                        const dayClasses: { section: typeof routine.sections[0]; schedule: typeof routine.sections[0]["schedules"][0]; startMin: number; endMin: number }[] = [];
                                        routine.sections.forEach(sec => {
                                          sec.schedules.forEach(sch => {
                                            if (sch.day === day) {
                                              dayClasses.push({ section: sec, schedule: sch, startMin: timeToMin(sch.startTime), endMin: timeToMin(sch.endTime) });
                                            }
                                          });
                                        });
                                        dayClasses.sort((a, b) => a.startMin - b.startMin);

                                        return (
                                          <div
                                            key={dIdx}
                                            className="flex border-b border-slate-200 hover:bg-slate-50/80 transition-colors bg-white relative group"
                                            style={{ minHeight: "115px" }}
                                          >
                                            <div className="w-[70px] shrink-0 p-2 font-bold font-mono text-slate-700 bg-slate-50/40 border-r border-slate-200 text-[9px] text-center uppercase tracking-wide flex items-center justify-center">
                                              {day.substring(0, 3)}
                                            </div>
                                            <div className="relative flex-1">
                                              {hours.map((h) => (
                                                <div
                                                  key={h}
                                                  className="absolute top-0 bottom-0 border-l border-slate-100 pointer-events-none"
                                                  style={{ left: `${((h - startHourMin) / totalMinutes) * 100}%` }}
                                                />
                                              ))}

                                              {dayClasses.map((dc, i) => {
                                                const courseIdx = routine.sections.indexOf(dc.section);
                                                const colorSet = colorPalette[courseIdx % colorPalette.length];
                                                const durationMinutes = dc.endMin - dc.startMin;
                                                const isLab = durationMinutes >= 120;

                                                return (
                                                  <div
                                                    key={i}
                                                    className="absolute top-1 bottom-1 p-0.5 transition-transform hover:z-10 hover:scale-[1.02]"
                                                    style={{
                                                      left: `${((dc.startMin - startHourMin) / totalMinutes) * 100}%`,
                                                      width: `${(durationMinutes / totalMinutes) * 100}%`
                                                    }}
                                                  >
                                                    <div
                                                      style={{
                                                        background: colorSet.bg,
                                                        borderLeft: `3px solid ${colorSet.border}`,
                                                        borderTop: `1px solid ${colorSet.accent}`,
                                                        borderRight: `1px solid ${colorSet.accent}`,
                                                        borderBottom: `1px solid ${colorSet.accent}`,
                                                        color: colorSet.text
                                                      }}
                                                      className="h-full rounded-lg p-2 shadow-sm hover:shadow-md relative overflow-hidden flex flex-col justify-center"
                                                    >
                                                      {isLab && (
                                                        <span style={{ background: colorSet.border }} className="absolute top-1 right-1 text-white text-[6px] font-mono font-black px-1 py-0.5 rounded uppercase tracking-wider">LAB</span>
                                                      )}
                                                      <div className="flex items-center gap-1 mb-0.5">
                                                        <span className="font-extrabold text-[10px] tracking-tight truncate">{dc.section.courseCode}</span>
                                                        <span className="font-mono text-[7px] font-bold px-1 py-0.5 rounded shrink-0" style={{ background: "rgba(0,0,0,0.05)" }}>
                                                          {dc.section.sectionCode}
                                                        </span>
                                                      </div>
                                                      <div className="flex items-center gap-1 text-[7px] font-mono opacity-80 mt-0.5">
                                                        <Clock className="h-2 w-2 shrink-0" />
                                                        <span className="truncate">{dc.schedule.startTime} – {dc.schedule.endTime}</span>
                                                      </div>
                                                      <div className="flex items-center justify-between gap-1 mt-1 border-t pt-1" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
                                                        <span className="text-[7px] font-mono font-semibold truncate" style={{ opacity: 0.8 }}>{dc.schedule.room || "TBA"}</span>
                                                        <span className="text-[7px] font-mono font-bold shrink-0" style={{ background: "rgba(0,0,0,0.05)", padding: "1px 3px", borderRadius: "2px" }} title={dc.section.teacherName}>
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
                            })()}

                            {/* Dashboard Print Controls */}
                            <div className="flex justify-end space-x-2 pt-2 border-t border-gray-50">
                              <button
                                onClick={() => window.print()}
                                className="inline-flex items-center space-x-1.5 px-3 py-1.5 border border-gray-200 text-xs font-medium rounded hover:bg-gray-50 transition-colors cursor-pointer"
                              >
                                <Printer className="h-3.5 w-3.5" />
                                <span>Print Schedule</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar Elements: available courses tracker, systems stats */}
          <div className="space-y-8">
            {/* Quick Stats Panel */}
            <div className="glass-panel rounded-2xl p-6">
              <h3 className="text-sm font-bold text-slate-800 border-b border-white/40 pb-3 mb-4 flex items-center space-x-2 font-display">
                <TrendingUp className="h-4.5 w-4.5 text-indigo-600" />
                <span>Trimester Snapshot</span>
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/40 p-3 rounded-xl border border-white/50 shadow-2xs">
                  <span className="block text-2xl font-black text-slate-800 font-display">{courses.length}</span>
                  <span className="text-[10px] font-mono text-slate-500 mt-1 block uppercase tracking-wider">Courses Offered</span>
                </div>
                <div className="bg-white/40 p-3 rounded-xl border border-white/50 shadow-2xs">
                  <span className="block text-2xl font-black text-slate-800 font-display">100%</span>
                  <span className="text-[10px] font-mono text-slate-500 mt-1 block uppercase tracking-wider">No-Clash Solved</span>
                </div>
              </div>

              {/* Tips for scheduling */}
              <div className="mt-4 p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-100/50 text-xs text-indigo-950 leading-relaxed">
                <p className="font-bold text-indigo-900 font-display">Optimize like a Pro:</p>
                <p className="mt-1 text-slate-650">
                  Set teacher reviews first! SectionBhai favors highly-rated teachers and groups classes back-to-back to maximize free weekdays.
                </p>
                <button
                  onClick={onNavigateToRankings}
                  className="text-[10px] font-extrabold uppercase mt-2.5 inline-flex items-center text-indigo-650 hover:text-indigo-800 cursor-pointer hover:underline transition-all"
                >
                  Rate Teachers Now &rarr;
                </button>
              </div>
            </div>

            {/* offered course directory lists */}
            <div className="glass-panel rounded-2xl p-6 overflow-hidden">
              <h3 className="text-sm font-bold text-slate-800 border-b border-white/40 pb-3 mb-4 flex items-center space-x-2 font-display">
                <BookOpen className="h-4.5 w-4.5 text-indigo-600" />
                <span>Active Trimester Offering</span>
              </h3>

              <div className="max-h-72 overflow-y-auto divide-y divide-white/30 pr-2">
                {courses.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4">No offered courses found.</p>
                ) : (
                  courses.map((course) => (
                    <div key={course.id} className="py-2.5 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-indigo-700 bg-white/60 px-1.5 py-0.5 rounded border border-white/60">
                          {course.code}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Summer 26</span>
                      </div>
                      <p className="text-xs text-slate-705 mt-1 font-semibold truncate font-sans">{course.name}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

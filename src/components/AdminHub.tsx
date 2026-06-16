/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  HardDrive,
  Users,
  GraduationCap,
  Sparkles,
  Upload,
  BookOpen,
  Calendar,
  Activity,
  PlusCircle,
  FileText,
  Clock,
  Loader2,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import { StatsResponse, Trimester } from "../types";

interface AdminHubProps {
  token: string;
}

export default function AdminHub({ token }: AdminHubProps) {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ingestion" | "manual" | "trimesters" | "announcements" | "exams">("ingestion");

  // Announcement states
  const [annTitle, setAnnTitle] = useState("");
  const [annMessage, setAnnMessage] = useState("");
  const [annStatus, setAnnStatus] = useState("");

  // Exam states
  const [examCourse, setExamCourse] = useState("");
  const [examType, setExamType] = useState<"Midterm" | "Final">("Midterm");
  const [examDate, setExamDate] = useState("");
  const [examTime, setExamTime] = useState("");
  const [examStatus, setExamStatus] = useState("");

  // Ingestion File Uploader state
  const [routineFile, setRoutineFile] = useState<File | null>(null);
  const [textDump, setTextDump] = useState("");
  const [ingesting, setIngesting] = useState(false);
  const [ingestionResult, setIngestionResult] = useState<any | null>(null);

  // Manual Creation states
  const [mCourseCode, setMCourseCode] = useState("");
  const [mCourseName, setMCourseName] = useState("");
  const [mTeacherCode, setMTeacherCode] = useState("");
  const [mTeacherName, setMTeacherName] = useState("");
  const [manualMessage, setManualMessage] = useState("");

  // Trimester Setup states
  const [trimesterName, setTrimesterName] = useState("");
  const [trimesterMakeCurrent, setTrimesterMakeCurrent] = useState(true);
  const [trimesterMessage, setTrimesterMessage] = useState("");

  const loadStats = async () => {
    try {
      const res = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setStats(data);
    } catch (err) {
      console.error("Failed to load systems stats.", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [token]);

  // Handle Routine PDF/XLSX Ingestion
  const handleIngestOffering = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routineFile && !textDump.trim()) {
      alert("Please upload an offering file (PDF/XLSX) or paste raw schedule text.");
      return;
    }

    setIngesting(true);
    setIngestionResult(null);

    const formData = new FormData();
    if (routineFile) {
      formData.append("file", routineFile);
    }
    if (textDump) {
      formData.append("textDump", textDump);
    }

    try {
      const res = await fetch("/api/admin/upload-schedule", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        setIngestionResult({ success: true, summary: data.summary, message: data.message });
        setTextDump("");
        setRoutineFile(null);
        await loadStats(); // Reload charts
      } else {
        setIngestionResult({ success: false, error: data.error || "Ingestion parsing failed." });
      }
    } catch (err: any) {
      setIngestionResult({ success: false, error: err.message || "Failed to contact ingestion route." });
    } finally {
      setIngesting(false);
    }
  };

  const handleManualCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualMessage("");
    try {
      const res = await fetch("/api/admin/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ code: mCourseCode, name: mCourseName })
      });
      if (res.ok) {
        setManualMessage("Course added successfully into Summer 26 offering.");
        setMCourseCode("");
        setMCourseName("");
        await loadStats();
      }
    } catch (err) {
      setManualMessage("Addition failed.");
    }
  };

  const handleManualTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualMessage("");
    try {
      const res = await fetch("/api/admin/teachers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ code: mTeacherCode, name: mTeacherName })
      });
      if (res.ok) {
        setManualMessage("Faculty member created and ranked.");
        setMTeacherCode("");
        setMTeacherName("");
        await loadStats();
      }
    } catch (err) {
      setManualMessage("Addition failed.");
    }
  };

  const handleCreateTrimester = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrimesterMessage("");

    try {
      const res = await fetch("/api/admin/trimester", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: trimesterName, makeCurrent: trimesterMakeCurrent })
      });

      const data = await res.json();
      if (res.ok) {
        setTrimesterMessage(`Successfully initialized trimester ${data.trimester.name}!`);
        setTrimesterName("");
      } else {
        setTrimesterMessage(data.error || "Creation failed.");
      }
    } catch (err) {
      setTrimesterMessage("Failed to execute.");
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnnStatus("");
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: annTitle, message: annMessage })
      });
      if (res.ok) {
        setAnnStatus("Announcement published to all students.");
        setAnnTitle("");
        setAnnMessage("");
      } else {
        setAnnStatus("Failed to publish.");
      }
    } catch (err) {
      setAnnStatus("Error connecting to server.");
    }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setExamStatus("");
    try {
      const res = await fetch("/api/admin/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ courseCode: examCourse, examType, date: examDate, time: examTime })
      });
      if (res.ok) {
        setExamStatus("Exam schedule added successfully.");
        setExamCourse("");
        setExamDate("");
        setExamTime("");
      } else {
        setExamStatus("Failed to add exam.");
      }
    } catch (err) {
      setExamStatus("Error connecting to server.");
    }
  };


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans">
      {/* Admin Safety Alert Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start space-x-3 text-amber-900 text-xs">
        <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold uppercase tracking-wider text-[10px]">Administrative Access Level Approved</p>
          <p className="mt-1">
             You are logged in as an Administrator. This pane supports bulk-upload routine ingestion utilizing Gemini AI parsing. Proceed with standard schedule alignment values.
          </p>
        </div>
      </div>

      {/* Systems telemetry analytics grids */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
          <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-xs">
            <div className="flex justify-between items-center text-gray-400">
              <span className="text-xs font-mono uppercase tracking-wider">Active Students</span>
              <Users className="h-4.5 w-4.5" />
            </div>
            <p className="text-3xl font-black text-gray-900 mt-2">{stats.totalStudents}</p>
            <p className="text-[10px] text-gray-400 font-mono mt-2">Registered student accounts</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-xs">
            <div className="flex justify-between items-center text-gray-400">
              <span className="text-xs font-mono uppercase tracking-wider">Academic Faculty</span>
              <GraduationCap className="h-4.5 w-4.5" />
            </div>
            <p className="text-3xl font-black text-gray-900 mt-2">{stats.totalTeachers}</p>
            <p className="text-[10px] text-gray-400 font-mono mt-2">Unique initials tracked</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-xs">
            <div className="flex justify-between items-center text-gray-400">
              <span className="text-xs font-mono uppercase tracking-wider">Offered Courses</span>
              <BookOpen className="h-4.5 w-4.5" />
            </div>
            <p className="text-3xl font-black text-gray-900 mt-2">{stats.totalCourses}</p>
            <p className="text-[10px] text-gray-400 font-mono mt-2">Sum of unique catalog codes</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-xs">
            <div className="flex justify-between items-center text-gray-400">
              <span className="text-xs font-mono uppercase tracking-wider">Allocated Sections</span>
              <Clock className="h-4.5 w-4.5" />
            </div>
            <p className="text-3xl font-black text-gray-900 mt-2">{stats.totalSections}</p>
            <p className="text-[10px] text-gray-400 font-mono mt-2">Active slots schedules mapped</p>
          </div>
        </div>
      ) : null}

      {/* Main Admin Workspaces grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Workspace Operations Tabs Side Column */}
        <div className="space-y-3 lg:col-span-1">
          <button
            onClick={() => setActiveTab("ingestion")}
            className={`w-full text-left p-4 rounded-xl border transition-all flex items-center space-x-3 cursor-pointer ${
              activeTab === "ingestion"
                ? "bg-black border-black text-white shadow-sm"
                : "bg-white border-gray-150 text-gray-700 hover:border-gray-250"
            }`}
          >
            <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-mono uppercase tracking-wide opacity-50">Bulk Actions</p>
              <p className="text-sm font-bold mt-0.5">AI Schedule Ingestion</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("manual")}
            className={`w-full text-left p-4 rounded-xl border transition-all flex items-center space-x-3 cursor-pointer ${
              activeTab === "manual"
                ? "bg-black border-black text-white shadow-sm"
                : "bg-white border-gray-150 text-gray-700 hover:border-gray-250"
            }`}
          >
            <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
              <PlusCircle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-mono uppercase tracking-wide opacity-50">Edit Inventory</p>
              <p className="text-sm font-bold mt-0.5">Manual Entry adjustments</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("trimesters")}
            className={`w-full text-left p-4 rounded-xl border transition-all flex items-center space-x-3 cursor-pointer ${
              activeTab === "trimesters"
                ? "bg-black border-black text-white shadow-sm"
                : "bg-white border-gray-150 text-gray-700 hover:border-gray-250"
            }`}
          >
            <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-mono uppercase tracking-wide opacity-50">Time Frame</p>
              <p className="text-sm font-bold mt-0.5">Trimester Management</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("announcements")}
            className={`w-full text-left p-4 rounded-xl border transition-all flex items-center space-x-3 cursor-pointer ${
              activeTab === "announcements"
                ? "bg-black border-black text-white shadow-sm"
                : "bg-white border-gray-150 text-gray-700 hover:border-gray-250"
            }`}
          >
            <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-mono uppercase tracking-wide opacity-50">Communication</p>
              <p className="text-sm font-bold mt-0.5">Announcements</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("exams")}
            className={`w-full text-left p-4 rounded-xl border transition-all flex items-center space-x-3 cursor-pointer ${
              activeTab === "exams"
                ? "bg-black border-black text-white shadow-sm"
                : "bg-white border-gray-150 text-gray-700 hover:border-gray-250"
            }`}
          >
            <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-mono uppercase tracking-wide opacity-50">Academic</p>
              <p className="text-sm font-bold mt-0.5">Exam Schedules</p>
            </div>
          </button>
        </div>

        {/* Workspace Display Core Panel */}
        <div className="lg:col-span-2">
          {/* TAB 1: AI INGESTION OFFERING FILE PARSER */}
          {activeTab === "ingestion" && (
            <div className="bg-white rounded-xl border border-gray-150 p-6 space-y-6 shadow-xs animate-fade-in">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-md font-bold text-gray-950">Gemini AI Offering Ingestor</h3>
                <p className="text-xs text-gray-400 font-mono mt-1">
                  Upload PDF/spreadsheets schedules or paste copyable routine lists.
                </p>
              </div>

              {ingestionResult && (
                <div
                  className={`p-4 rounded-lg flex items-start space-x-3 text-sm ${
                    ingestionResult.success
                      ? "bg-green-50 text-green-800 border border-green-150"
                      : "bg-red-50 text-red-800 border border-red-150"
                  }`}
                >
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">{ingestionResult.success ? "Ingestion Successful!" : "Failure Log"}</span>
                    {ingestionResult.success && ingestionResult.summary && (
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-green-700 bg-white/40 p-2.5 rounded border border-green-200">
                        <div>Courses: <b>+{ingestionResult.summary.addedCourses}</b></div>
                        <div>Teachers: <b>+{ingestionResult.summary.addedTeachers}</b></div>
                        <div>Sections: <b>+{ingestionResult.summary.addedSections}</b></div>
                      </div>
                    )}
                    <p className="mt-1.5 text-xs opacity-90">{ingestionResult.message || ingestionResult.error}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleIngestOffering} className="space-y-5">
                {/* File Dropzone */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-400 mb-1.5">
                    Offering List File (PDF / XLSX Spreadsheet)
                  </label>
                  <div className="border-2 border-dashed border-gray-200 hover:border-gray-400 rounded-xl p-6 text-center transition-colors bg-gray-50/20 relative cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf,.xlsx,.xls"
                      onChange={(e) => setRoutineFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    {routineFile ? (
                      <p className="text-xs font-bold text-gray-800">{routineFile.name}</p>
                    ) : (
                      <>
                        <p className="text-xs text-gray-500 font-medium">Click or Drag &amp; Drop to upload</p>
                        <p className="text-[10px] text-gray-400 mt-1">Accepts Section Offering PDF or Excel grids</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Raw Text Fallback */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-mono uppercase tracking-wider text-gray-400">
                      Standard Raw text schedule listings
                    </label>
                    <span className="text-[10px] font-mono text-gray-400">Fallback/direct copy option</span>
                  </div>
                  <textarea
                    rows={4}
                    value={textDump}
                    onChange={(e) => setTextDump(e.target.value)}
                    placeholder="e.g. CSE111 Section A, Sun 8:00 AM-9:30 AM Room 402 NH..."
                    className="block w-full p-3 border border-gray-250 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-black bg-white"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={ingesting}
                    className="flex items-center space-x-2 px-6 py-2.5 bg-black hover:bg-gray-800 disabled:bg-gray-400 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                  >
                    {ingesting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>AI Document Parsing with Gemini...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 text-yellow-400" />
                        <span>Extract &amp; Import with Gemini</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: MANUAL COURSE / TEACHER CREATORS */}
          {activeTab === "manual" && (
            <div className="bg-white rounded-xl border border-gray-150 p-6 space-y-6 shadow-xs animate-fade-in">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-md font-bold text-gray-950">Manual Academic adjustment Pane</h3>
                <p className="text-xs text-gray-400 font-mono mt-1">
                  Adjust, refine, and append database details on the absolute granular level.
                </p>
              </div>

              {manualMessage && (
                <div className="p-3 bg-amber-50 rounded text-xs text-amber-800 font-medium">
                  {manualMessage}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Manual Course Card */}
                <form onSubmit={handleManualCourse} className="space-y-4 border border-gray-100 p-4 rounded-xl">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-gray-400 border-b border-gray-50 pb-1 flex items-center space-x-1.5">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>Create Catalog Course</span>
                  </h4>

                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Course Code</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CSE111"
                      value={mCourseCode}
                      onChange={(e) => setMCourseCode(e.target.value)}
                      className="block w-full p-2 border border-gray-200 rounded text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Course Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Computer Programming"
                      value={mCourseName}
                      onChange={(e) => setMCourseName(e.target.value)}
                      className="block w-full p-2 border border-gray-200 rounded text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-1.5 bg-black text-white rounded text-xs font-medium cursor-pointer"
                  >
                    Insert Course Record
                  </button>
                </form>

                {/* Manual Teacher Card */}
                <form onSubmit={handleManualTeacher} className="space-y-4 border border-gray-100 p-4 rounded-xl">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-gray-400 border-b border-gray-50 pb-1 flex items-center space-x-1.5">
                    <GraduationCap className="h-3.5 w-3.5" />
                    <span>Create Faculty Record</span>
                  </h4>

                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Faculty Initials</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. NH"
                      value={mTeacherCode}
                      onChange={(e) => setMTeacherCode(e.target.value)}
                      className="block w-full p-2 border border-gray-200 rounded text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Nazmul Hasan"
                      value={mTeacherName}
                      onChange={(e) => setMTeacherName(e.target.value)}
                      className="block w-full p-2 border border-gray-200 rounded text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-1.5 bg-black text-white rounded text-xs font-medium cursor-pointer"
                  >
                    Insert Faculty Record
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: TRIMESTER INITIALIZER */}
          {activeTab === "trimesters" && (
            <div className="bg-white rounded-xl border border-gray-150 p-6 space-y-6 shadow-xs animate-fade-in">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-md font-bold text-gray-950">Initialize Trimester Frame</h3>
                <p className="text-xs text-gray-400 font-mono mt-1">
                  Create new active academic terms. Adding schedules automatically assigns courses to the designated term.
                </p>
              </div>

              {trimesterMessage && (
                <div className="p-3 bg-indigo-50 border border-indigo-150 rounded text-xs text-indigo-800 font-semibold">
                  {trimesterMessage}
                </div>
              )}

              <form onSubmit={handleCreateTrimester} className="space-y-4">
                <div>
                  <label className="block text-xs font-sans text-gray-500 mb-1">Trimester Label Name</label>
                  <input
                    type="text"
                    required
                    value={trimesterName}
                    onChange={(e) => setTrimesterName(e.target.value)}
                    placeholder="e.g. Fall 2026, Summer 2026"
                    className="block w-full p-2.5 border border-gray-250 rounded-lg text-sm bg-white"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="makeCurrent"
                    checked={trimesterMakeCurrent}
                    onChange={(e) => setTrimesterMakeCurrent(e.target.checked)}
                    className="h-4 w-4 bg-white border border-gray-250 accent-black text-black"
                  />
                  <label htmlFor="makeCurrent" className="text-xs text-gray-600 font-medium">
                    Set this as the absolute current active trimester immediately
                  </label>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-black text-white hover:bg-gray-800 text-xs font-extrabold rounded-lg cursor-pointer"
                  >
                    Initialize Trimester
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: ANNOUNCEMENTS */}
          {activeTab === "announcements" && (
            <div className="bg-white rounded-xl border border-gray-150 p-6 space-y-6 shadow-xs animate-fade-in">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-md font-bold text-gray-950">Broadcast Announcements</h3>
                <p className="text-xs text-gray-400 font-mono mt-1">
                  Publish notices that will appear on every student's dashboard.
                </p>
              </div>

              {annStatus && (
                <div className="p-3 bg-blue-50 border border-blue-150 rounded text-xs text-blue-800 font-semibold">
                  {annStatus}
                </div>
              )}

              <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                <div>
                  <label className="block text-xs font-sans text-gray-500 mb-1">Announcement Title</label>
                  <input
                    type="text"
                    required
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    placeholder="e.g. Registration Opens Tomorrow"
                    className="block w-full p-2.5 border border-gray-250 rounded-lg text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-sans text-gray-500 mb-1">Message Content</label>
                  <textarea
                    required
                    rows={4}
                    value={annMessage}
                    onChange={(e) => setAnnMessage(e.target.value)}
                    placeholder="Provide the details..."
                    className="block w-full p-2.5 border border-gray-250 rounded-lg text-sm bg-white"
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <button type="submit" className="px-5 py-2.5 bg-black text-white hover:bg-gray-800 text-xs font-extrabold rounded-lg cursor-pointer">
                    Publish Announcement
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 5: EXAM SCHEDULES */}
          {activeTab === "exams" && (
            <div className="bg-white rounded-xl border border-gray-150 p-6 space-y-6 shadow-xs animate-fade-in">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-md font-bold text-gray-950">Exam Schedules Setup</h3>
                <p className="text-xs text-gray-400 font-mono mt-1">
                  Set Midterm and Final exam dates for specific courses so students can auto-generate their exam calendars.
                </p>
              </div>

              {examStatus && (
                <div className="p-3 bg-emerald-50 border border-emerald-150 rounded text-xs text-emerald-800 font-semibold">
                  {examStatus}
                </div>
              )}

              <form onSubmit={handleCreateExam} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-sans text-gray-500 mb-1">Course Code</label>
                    <input
                      type="text"
                      required
                      value={examCourse}
                      onChange={(e) => setExamCourse(e.target.value)}
                      placeholder="e.g. CSE3313"
                      className="block w-full p-2.5 border border-gray-250 rounded-lg text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-sans text-gray-500 mb-1">Exam Type</label>
                    <select
                      value={examType}
                      onChange={(e) => setExamType(e.target.value as any)}
                      className="block w-full p-2.5 border border-gray-250 rounded-lg text-sm bg-white"
                    >
                      <option value="Midterm">Midterm</option>
                      <option value="Final">Final</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-sans text-gray-500 mb-1">Date</label>
                    <input
                      type="date"
                      required
                      value={examDate}
                      onChange={(e) => setExamDate(e.target.value)}
                      className="block w-full p-2.5 border border-gray-250 rounded-lg text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-sans text-gray-500 mb-1">Time</label>
                    <input
                      type="text"
                      required
                      value={examTime}
                      onChange={(e) => setExamTime(e.target.value)}
                      placeholder="e.g. 10:00 AM - 12:00 PM"
                      className="block w-full p-2.5 border border-gray-250 rounded-lg text-sm bg-white"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button type="submit" className="px-5 py-2.5 bg-black text-white hover:bg-gray-800 text-xs font-extrabold rounded-lg cursor-pointer">
                    Save Exam Schedule
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

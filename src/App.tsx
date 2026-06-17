/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  CalendarDays,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  GraduationCap,
  Calendar,
  Lock,
  Mail,
  UserCheck,
  Check,
  Loader2,
  Bookmark,
  Award
} from "lucide-react";

// Local component imports
import Navbar from "./components/Navbar";
import Dashboard from "./components/Dashboard";
import RoutineBuilder from "./components/RoutineBuilder";
import FacultyRankings from "./components/FacultyRankings";
import AdminHub from "./components/AdminHub";
import UserProfile from "./components/UserProfile";

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("sectionbhai_token"));
  const [user, setUser] = useState<any | null>(null);
  const [currentTab, setCurrentTab] = useState<string>("dashboard");

  // Auth form states
  const [authView, setAuthView] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authStudentId, setAuthStudentId] = useState("");
  const [authDept, setAuthDept] = useState("Computer Science & Engineering (CSE)");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // Validate active sessions
  const checkSession = async (activeToken: string) => {
    try {
      const res = await fetch("/api/auth/profile", {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        // Map user profile variables
        setUser({
          id: data.id,
          email: data.email,
          role: data.role,
          name: data.role === "student" ? data.studentProfile?.name : data.name,
          studentId: data.role === "student" ? data.studentProfile?.studentId : undefined,
          department: data.role === "student" ? data.studentProfile?.department : undefined,
          currentTrimesterId: data.role === "student" ? data.studentProfile?.currentTrimesterId : undefined
        });
      } else {
        // If token expired, clear it
        handleLogout();
      }
    } catch (err) {
      handleLogout();
    }
  };

  useEffect(() => {
    if (token) {
      checkSession(token);
    }
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem("sectionbhai_token");
    setToken(null);
    setUser(null);
    setCurrentTab("dashboard");
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    const isLogin = authView === "login";
    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
    const payload = isLogin
      ? { email: authEmail, password: authPassword }
      : { email: authEmail, password: authPassword, name: authName, studentId: authStudentId, department: authDept };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed. Please verify credentials.");
      }

      // Store credentials
      localStorage.setItem("sectionbhai_token", data.token);
      setToken(data.token);
      setUser(data.user);

      // Reset forms
      setAuthEmail("");
      setAuthPassword("");
      setAuthName("");
      setAuthStudentId("");
    } catch (err: any) {
      setAuthError(err.message || "Something went wrong.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Callback to sync modified student profile details back to head levels
  const handleProfileSync = (updatedUser: any) => {
    setUser(updatedUser);
  };

  const handleSavedRoutineSuccess = () => {
    // Navigation back to home, reloads stats automatically
    setCurrentTab("dashboard");
  };

  return (
    <div className="min-h-screen text-slate-900 font-sans antialiased selection:bg-indigo-500 selection:text-white pb-12">
      {token && user ? (
        // ==========================================
        // AUTHENTICATED APP SHELL
        // ==========================================
        <div className="space-y-4">
          <Navbar
            currentTab={currentTab}
            setCurrentTab={setCurrentTab}
            user={user}
            onLogout={handleLogout}
          />
          <main className="animate-fade-in">
            {currentTab === "dashboard" && (
              <Dashboard
                token={token}
                user={user}
                onNavigateToBuilder={() => setCurrentTab("builder")}
                onNavigateToRankings={() => setCurrentTab("rankings")}
              />
            )}
            {currentTab === "builder" && (
              <RoutineBuilder token={token} onSavedSuccess={handleSavedRoutineSuccess} />
            )}
            {currentTab === "rankings" && <FacultyRankings token={token} user={user} />}
            {currentTab === "profile" && (
              <UserProfile token={token} user={user} onProfileUpdated={handleProfileSync} />
            )}
            {currentTab === "admin" && <AdminHub token={token} />}
          </main>
        </div>
      ) : (
        // ==========================================
        // UNAUTHENTICATED GUEST / LANDING / LOGIN
        // ==========================================
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20 lg:min-h-[85vh] flex items-center">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full">
            {/* Landing Hero Column (Left) */}
            <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
              <div className="inline-flex items-center space-x-2 px-3 py-1.5 bg-slate-900 text-white rounded-full font-mono text-[11px] font-semibold leading-none shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
                <span>SectionBhai Routine Optimization Platform</span>
              </div>

              <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 leading-[1.15] tracking-tight font-display">
                PDF Dao,<br className="hidden sm:inline" /> Routine Nao.
              </h1>

              <p className="text-slate-600 text-lg max-w-xl mx-auto lg:mx-0 font-sans leading-relaxed">
                The ultimate university schedule optimization system. Upload offering lists, assign priority stars for faculty, choose desired slots, and let the CSP engine generate clash-free options in less than 2 milliseconds.
              </p>

              {/* Functional benefits points checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold uppercase font-mono text-slate-600 max-w-md mx-auto lg:mx-0 pt-4">
                <div className="flex items-center space-x-2.5 justify-center lg:justify-start">
                  <Check className="h-4.5 w-4.5 text-indigo-600 bg-white shadow-xs rounded-full p-0.5 shrink-0" />
                  <span>No Time- clashed Slots</span>
                </div>
                <div className="flex items-center space-x-2.5 justify-center lg:justify-start">
                  <Check className="h-4.5 w-4.5 text-indigo-600 bg-white shadow-xs rounded-full p-0.5 shrink-0" />
                  <span>Faculty Preference Weighted</span>
                </div>
                <div className="flex items-center space-x-2.5 justify-center lg:justify-start">
                  <Check className="h-4.5 w-4.5 text-indigo-600 bg-white shadow-xs rounded-full p-0.5 shrink-0" />
                  <span>Interactive Weekly Grids</span>
                </div>
                <div className="flex items-center space-x-2.5 justify-center lg:justify-start">
                  <Check className="h-4.5 w-4.5 text-indigo-600 bg-white shadow-xs rounded-full p-0.5 shrink-0" />
                  <span>Class Gap Penalty Optimized</span>
                </div>
              </div>
            </div>

            {/* Login & Sign-up Widgets Column (Right) */}
            <div className="lg:col-span-5 glass-panel rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="flex justify-between items-center border-b border-white/40 pb-4">
                <h3 className="text-lg font-bold text-slate-900 capitalize font-display">
                  {authView === "login" ? "Sign In to SectionBhai" : "Create Student Account"}
                </h3>

                <span className="text-[10px] uppercase font-mono bg-white/60 px-2 py-0.5 rounded border border-white/50 font-bold text-indigo-600">
                  Target Term: Summer 26
                </span>
              </div>

              {authError && (
                <div className="p-3.5 bg-rose-50/80 backdrop-blur-sm border border-rose-150 rounded-xl text-xs text-rose-800 flex items-start space-x-2.5">
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="font-semibold">{authError}</span>
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {authView === "register" && (
                  <>
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 mb-1.5 font-bold">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        placeholder="e.g. Nymur Reza"
                        className="block w-full p-2.5 glass-input rounded-lg text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 mb-1.5 font-bold">
                          Student ID
                        </label>
                        <input
                          type="text"
                          required
                          value={authStudentId}
                          onChange={(e) => setAuthStudentId(e.target.value)}
                          placeholder="e.g. 011211029"
                          className="block w-full p-2.5 glass-input rounded-lg text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 mb-1.5 font-bold">
                          Department
                        </label>
                        <input
                          type="text"
                          required
                          value={authDept}
                          onChange={(e) => setAuthDept(e.target.value)}
                          placeholder="e.g. CSE"
                          className="block w-full p-2.5 glass-input rounded-lg text-sm"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 mb-1.5 font-bold">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="student@sectionbhai.edu"
                      className="block w-full pl-10 pr-3 py-2.5 glass-input rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 mb-1.5 font-bold">
                    Secret Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="block w-full pl-10 pr-3 py-2.5 glass-input rounded-lg text-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full flex items-center justify-center space-x-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-350 text-white font-extrabold text-sm rounded-xl cursor-pointer shadow-md shadow-indigo-600/15 transition-all duration-200 mt-4"
                >
                  {authLoading && <Loader2 className="h-4 w-4 animate-spin text-white" />}
                  <span>{authView === "login" ? "Login to Portal" : "Assemble Account"}</span>
                </button>
              </form>

              {/* Toggle auth view indicators */}
              <div className="pt-4 border-t border-white/40 text-center text-xs space-y-3">
                {authView === "login" ? (
                  <p className="text-slate-500">
                    New to SectionBhai?{" "}
                    <button
                      onClick={() => {
                        setAuthView("register");
                        setAuthError("");
                      }}
                      className="font-bold underline text-indigo-650 hover:text-indigo-800 cursor-pointer"
                    >
                      Create student account
                    </button>
                  </p>
                ) : (
                  <p className="text-slate-500">
                    Already registered?{" "}
                    <button
                      onClick={() => {
                        setAuthView("login");
                        setAuthError("");
                      }}
                      className="font-bold underline text-indigo-650 hover:text-indigo-800 cursor-pointer"
                    >
                      Sign in back
                    </button>
                  </p>
                )}

                {/* <div className="bg-white/45 p-3 rounded-xl border border-white/50 text-left text-[10px] text-slate-500 font-mono space-y-1.5 shadow-xs">
                  <p className="font-bold uppercase text-[9px] text-indigo-650 tracking-wider">Default Demo Credentials:</p>
                  <p>• Student: <code className="bg-white/60 px-1 py-0.5 rounded">student@sectionbhai.edu</code> / <code className="bg-white/60 px-1 py-0.5 rounded">studentpassword123</code></p>
                  <p>• Admin: <code className="bg-white/60 px-1 py-0.5 rounded">admin@sectionbhai.edu</code> / <code className="bg-white/60 px-1 py-0.5 rounded">adminpassword123</code></p>
                </div> */}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

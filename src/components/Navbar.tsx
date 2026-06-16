/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { LogOut, Calendar, Star, Shield, User, GraduationCap } from "lucide-react";

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  user: any;
  onLogout: () => void;
}

export default function Navbar({ currentTab, setCurrentTab, user, onLogout }: NavbarProps) {
  if (!user) return null;

  const isAdmin = user.role === "admin";

  return (
    <header className="border-b border-white/40 bg-white/45 backdrop-blur-md sticky top-0 z-50 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo Brand Segment */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentTab("dashboard")}>
            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-indigo-650 text-white font-display font-bold tracking-tight text-sm shadow-sm transition-transform hover:scale-105 duration-200">
              SB
            </div>
            <div>
              <h1 className="text-md font-extrabold tracking-tight text-slate-800 leading-none font-display">
                SECTIONBHAI
              </h1>
              <span className="text-[10px] font-mono text-indigo-600 font-semibold mt-1 block">
                &ldquo;PDF Dao, Routine Nao&rdquo;
              </span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="hidden md:flex space-x-1">
            <button
              onClick={() => setCurrentTab("dashboard")}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                currentTab === "dashboard"
                  ? "bg-indigo-600/10 text-indigo-750 font-bold shadow-xs border border-indigo-200/50"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <Calendar className="h-4 w-4" />
              <span>Schedules</span>
            </button>

            <button
              onClick={() => setCurrentTab("builder")}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                currentTab === "builder"
                  ? "bg-indigo-600/10 text-indigo-750 font-bold shadow-xs border border-indigo-200/50"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <GraduationCap className="h-4 w-4" />
              <span>Routine Builder</span>
            </button>

            <button
              onClick={() => setCurrentTab("rankings")}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                currentTab === "rankings"
                  ? "bg-indigo-600/10 text-indigo-750 font-bold shadow-xs border border-indigo-200/50"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <Star className="h-4 w-4" />
              <span>Faculty Ratings</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => setCurrentTab("admin")}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                  currentTab === "admin"
                    ? "bg-amber-500/10 text-amber-900 font-bold shadow-xs border border-amber-200/50"
                    : "text-amber-700 hover:text-amber-955 hover:bg-white/50"
                }`}
              >
                <Shield className="h-4 w-4" />
                <span>Admin Hub</span>
              </button>
            )}
          </nav>

          {/* User Profile info and actions */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setCurrentTab("profile")}
              className="flex items-center space-x-2 text-left cursor-pointer group"
            >
              <div className="h-8 w-8 rounded-full border border-white/60 bg-white/50 flex items-center justify-center text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                <User className="h-4 w-4" />
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-slate-800 group-hover:text-indigo-650 leading-none">
                  {user.name}
                </p>
                <p className="text-[10px] font-mono text-slate-500 mt-0.5 leading-none capitalize">
                  {user.role} {user.studentId ? `• ID ${user.studentId}` : ""}
                </p>
              </div>
            </button>

            <button
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
              title="Logout from Account"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

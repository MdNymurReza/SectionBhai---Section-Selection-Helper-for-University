/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { LogOut, Calendar, Star, Shield, User, GraduationCap, Menu, X } from "lucide-react";

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  user: any;
  onLogout: () => void;
}

export default function Navbar({ currentTab, setCurrentTab, user, onLogout }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  const isAdmin = user.role === "admin";

  const navItems = [
    { id: "dashboard", label: "Schedules", Icon: Calendar },
    { id: "builder", label: "Routine Builder", Icon: GraduationCap },
    { id: "rankings", label: "Faculty Ratings", Icon: Star },
    ...(isAdmin ? [{ id: "admin", label: "Admin Hub", Icon: Shield }] : []),
  ];

  const handleNav = (tab: string) => {
    setCurrentTab(tab);
    setMobileOpen(false);
  };

  return (
    <header className="border-b border-white/40 bg-white/45 backdrop-blur-md sticky top-0 z-50 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo Brand Segment */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => handleNav("dashboard")}>
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

          {/* Desktop Navigation Items */}
          <nav className="hidden md:flex space-x-1">
            {navItems.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => handleNav(id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                  currentTab === id
                    ? id === "admin"
                      ? "bg-amber-500/10 text-amber-900 font-bold shadow-xs border border-amber-200/50"
                      : "bg-indigo-600/10 text-indigo-750 font-bold shadow-xs border border-indigo-200/50"
                    : id === "admin"
                    ? "text-amber-700 hover:text-amber-955 hover:bg-white/50"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          {/* Right side: user info + hamburger */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={() => handleNav("profile")}
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
              className="hidden sm:flex p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
              title="Logout from Account"
            >
              <LogOut className="h-4 w-4" />
            </button>

            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMobileOpen(prev => !prev)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-white/50 rounded-lg transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/40 bg-white/80 backdrop-blur-md animate-fade-in">
          <div className="px-4 py-3 space-y-1">
            {navItems.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => handleNav(id)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 cursor-pointer ${
                  currentTab === id
                    ? id === "admin"
                      ? "bg-amber-50 text-amber-900 border border-amber-200"
                      : "bg-indigo-50 text-indigo-800 border border-indigo-200"
                    : id === "admin"
                    ? "text-amber-700 hover:bg-amber-50"
                    : "text-slate-700 hover:bg-white/70"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}

            <div className="pt-2 border-t border-white/40 mt-2">
              <button
                onClick={() => { onLogout(); setMobileOpen(false); }}
                className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

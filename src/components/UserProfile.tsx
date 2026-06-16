/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User, Mail, GraduationCap, School, ShieldAlert, Check, Loader2 } from "lucide-react";

interface UserProfileProps {
  user: any;
  token: string;
  onProfileUpdated: (updatedUser: any) => void;
}

export default function UserProfile({ user, token, onProfileUpdated }: UserProfileProps) {
  const [name, setName] = useState(user.name || "");
  const [studentId, setStudentId] = useState(user.studentId || "");
  const [department, setDepartment] = useState(user.department || "");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/profile/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, studentId, department })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile.");
      }

      setMessage({ type: "success", text: "Profile updated successfully!" });
      onProfileUpdated({
        ...user,
        name: data.profile.name,
        studentId: data.profile.studentId,
        department: data.profile.department
      });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Something went wrong." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in">
        <div className="px-6 py-8 border-b border-gray-50 bg-gray-50/50">
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 rounded-full bg-black text-white flex items-center justify-center font-mono font-bold text-2xl">
              {name ? name.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{name || "User Profile"}</h2>
              <p className="text-sm font-mono text-gray-500 mt-1">{user.email}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {message && (
            <div
              className={`p-4 rounded-lg flex items-start space-x-3 text-sm ${
                message.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-100"
                  : "bg-red-50 text-red-800 border border-red-100"
              }`}
            >
              {message.type === "success" ? (
                <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-gray-400 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-shadow"
                  placeholder="Enter full name"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-gray-400 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  disabled
                  value={user.email}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-100 bg-gray-50 text-gray-400 rounded-lg text-sm cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-gray-400 mb-1.5">
                Student ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  disabled={user.role === "admin"}
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-shadow"
                  placeholder="e.g. 011211029"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-gray-400 mb-1.5">
                Department
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <School className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  disabled={user.role === "admin"}
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-shadow"
                  placeholder="e.g. Computer Science (CSE)"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-50">
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center space-x-2 px-6 py-2.5 bg-black hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Save Profile Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

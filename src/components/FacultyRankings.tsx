/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Star,
  Search,
  MessageSquare,
  Award,
  ChevronDown,
  ChevronUp,
  User,
  PlusCircle,
  ThumbsUp,
  CheckCircle,
  Loader2,
  CalendarDays
} from "lucide-react";
import { Teacher, TeacherRating, Course } from "../types";

interface FacultyRankingsProps {
  token: string;
  user: any;
}

export default function FacultyRankings({ token, user }: FacultyRankingsProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [reviews, setReviews] = useState<TeacherRating[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Search/Filters
  const [searchQuery, setSearchQuery] = useState("");

  // Review Form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [formTeacherId, setFormTeacherId] = useState("");
  const [formCourseId, setFormCourseId] = useState("");
  const [formOverallRating, setFormOverallRating] = useState(5);
  const [formTQ, setFormTQ] = useState(5);
  const [formGF, setFormGF] = useState(5);
  const [formAS, setFormAS] = useState(3);
  const [formBH, setFormBH] = useState(5);
  const [formRC, setFormRC] = useState(5);
  const [formComment, setFormComment] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSuccessMessage, setFormSuccessMessage] = useState("");
  const [formIsAnonymous, setFormIsAnonymous] = useState(false);
  const [formError, setFormError] = useState("");

  // UI state
  const [expandedTeacherId, setExpandedTeacherId] = useState<string | null>(null);

  const fetchRankingsData = async () => {
    setLoading(true);
    try {
      const tRes = await fetch("/api/student/teachers");
      const tData = await tRes.json();
      if (tRes.ok) setTeachers(tData);

      const rRes = await fetch("/api/student/ratings");
      const rData = await rRes.json();
      if (rRes.ok) setReviews(rData);

      const cRes = await fetch("/api/student/courses");
      const cData = await cRes.json();
      if (cRes.ok) setCourses(cData);
    } catch (err) {
      console.error("Failed to load rankings metrics files.", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRankingsData();
  }, [token]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTeacherId || !formCourseId) {
      alert("Please select both a Faculty Member and a Course Context.");
      return;
    }
    setFormSubmitting(true);
    setFormSuccessMessage("");
    setFormError("");

    try {
      const res = await fetch("/api/student/ratings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          teacherId: formTeacherId,
          courseId: formCourseId,
          rating: formOverallRating,
          comment: formComment,
          isAnonymous: formIsAnonymous,
          metrics: {
            teachingQuality: formTQ,
            gradingFairness: formGF,
            attendanceStrictness: formAS,
            behavior: formBH,
            recommendation: formRC
          }
        })
      });

      const data = await res.json();
      if (res.ok) {
        setFormSuccessMessage("Review posted and rankings re-averaged dynamically!");
        setFormComment("");
        setFormIsAnonymous(false);
        // Refresh local listings to integrate reviews
        await fetchRankingsData();
        setTimeout(() => {
          setShowReviewForm(false);
          setFormSuccessMessage("");
        }, 1500);
      } else {
        setFormError(data.error || "Failed to post review.");
      }
    } catch (err) {
      setFormError("Network error. Please try again.");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Filtered teachers list based on initials/names
  const filteredTeachers = teachers.filter(
    t =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sorted teachers list descending based on average ratings
  const rankedTeachers = [...filteredTeachers].sort((a, b) => b.averageRating - a.averageRating);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 font-sans space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
            <Award className="h-5.5 w-5.5 text-gray-700" />
            <span>Faculty Rankings Directory</span>
          </h2>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            Transparent student evaluation metrics database
          </p>
        </div>

        <button
          onClick={() => {
            if (courses.length > 0 && teachers.length > 0) {
              setFormTeacherId(teachers[0].id);
              setFormCourseId(courses[0].id);
            }
            setShowReviewForm(!showReviewForm);
          }}
          className="flex items-center space-x-1.5 px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Submit Faculty Review</span>
        </button>
      </div>

      {/* Review Submission Form overlay */}
      {showReviewForm && (
        <form onSubmit={handleSubmitReview} className="bg-white border border-gray-150 rounded-xl p-6 shadow-sm space-y-6 max-w-2xl mx-auto animate-fade-in">
          <div className="border-b border-gray-50 pb-3">
            <h4 className="text-sm font-bold text-gray-900">Evaluation Form</h4>
            <p className="text-xs text-gray-400 mt-1 font-mono">
              Fields support dynamic aggregate metric re-averaging on write
            </p>
          </div>

          {formSuccessMessage && (
            <div className="p-3 bg-green-50 border border-green-150 rounded text-xs text-green-800 font-medium flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>{formSuccessMessage}</span>
            </div>
          )}

          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800 font-medium">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-gray-400 mb-1.5">
                Faculty Member
              </label>
              <select
                value={formTeacherId}
                onChange={(e) => setFormTeacherId(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-black bg-white"
              >
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-gray-400 mb-1.5">
                Target Course Context
              </label>
              <select
                value={formCourseId}
                onChange={(e) => setFormCourseId(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-black bg-white"
              >
                {courses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Multidimensional sliders */}
          <div className="space-y-4">
            <h5 className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
              Evaluation rating criteria
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-gray-700">
                  <span>Overall Rating</span>
                  <span className="font-mono text-amber-500 font-bold">&#9733; {formOverallRating}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formOverallRating}
                  onChange={(e) => setFormOverallRating(Number(e.target.value))}
                  className="w-full accent-black h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-gray-700">
                  <span>Teaching Quality</span>
                  <span className="font-mono text-amber-500 font-bold">&#9733; {formTQ}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formTQ}
                  onChange={(e) => setFormTQ(Number(e.target.value))}
                  className="w-full accent-black h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-gray-700">
                  <span>Grading Fairness</span>
                  <span className="font-mono text-amber-500 font-bold">&#9733; {formGF}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formGF}
                  onChange={(e) => setFormGF(Number(e.target.value))}
                  className="w-full accent-black h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-gray-700">
                  <span>Attendance Strictness (1 = lenient, 5 = strict)</span>
                  <span className="font-mono text-amber-500 font-bold">&#9733; {formAS}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formAS}
                  onChange={(e) => setFormAS(Number(e.target.value))}
                  className="w-full accent-black h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-gray-700">
                  <span>Behavior & Helpfulness</span>
                  <span className="font-mono text-amber-500 font-bold">&#9733; {formBH}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formBH}
                  onChange={(e) => setFormBH(Number(e.target.value))}
                  className="w-full accent-black h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-gray-700">
                  <span>Would Recommend</span>
                  <span className="font-mono text-amber-500 font-bold">&#9733; {formRC}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formRC}
                  onChange={(e) => setFormRC(Number(e.target.value))}
                  className="w-full accent-black h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-gray-400 mb-1.5">
              Review Comments
            </label>
            <textarea
              required
              rows={3}
              value={formComment}
              onChange={(e) => setFormComment(e.target.value)}
              className="block w-full p-3 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-black bg-white"
              placeholder="Tell other students about the course structure, lecture style, exams difficulty, or lab segments..."
            />
          </div>

          <div className="flex items-center space-x-2.5 p-3 bg-slate-50 rounded-lg border border-slate-150">
            <input
              type="checkbox"
              id="anonymousToggle"
              checked={formIsAnonymous}
              onChange={e => setFormIsAnonymous(e.target.checked)}
              className="h-4 w-4 accent-black rounded"
            />
            <label htmlFor="anonymousToggle" className="text-xs text-slate-700 cursor-pointer select-none">
              <span className="font-semibold">Post anonymously</span>
              <span className="text-slate-400 ml-1">— your name will show as "Anonymous Student"</span>
            </label>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-50 space-x-2">
            <button
              type="button"
              onClick={() => setShowReviewForm(false)}
              className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-xs font-semibold rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="flex items-center space-x-1 px-5 py-2 bg-black hover:bg-gray-800 disabled:bg-gray-400 text-white text-xs font-semibold rounded-lg cursor-pointer shadow-sm"
            >
              {formSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Submit Evaluation Review</span>
            </button>
          </div>
        </form>
      )}

      {/* Directory Searches */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
          <Search className="h-5 w-5" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search Faculty Member by Full Name or initials (e.g. NH, Dr. Rahman)..."
          className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-black bg-white"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {rankedTeachers.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center py-12">No faculty records found.</p>
          ) : (
            rankedTeachers.map((tc, index) => {
              const isExpanded = expandedTeacherId === tc.id;
              const teacherReviews = reviews.filter(r => r.teacherId === tc.id);

              return (
                <div
                  key={tc.id}
                  className={`bg-white border rounded-xl shadow-xs transition-colors overflow-hidden ${
                    isExpanded ? "border-black" : "border-gray-150 hover:border-gray-200"
                  }`}
                >
                  {/* Summary row summary */}
                  <div
                    onClick={() => setExpandedTeacherId(isExpanded ? null : tc.id)}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className="h-10 w-10 flex items-center justify-center font-mono font-bold text-xs bg-black text-white rounded-lg">
                        #{index + 1}
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-extrabold text-gray-950">{tc.name}</h4>
                          <span className="px-1.5 py-0.5 bg-gray-50 border border-gray-100 rounded text-[9px] font-mono text-gray-500 font-bold">
                            {tc.code}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 font-mono">
                          Based on {tc.ratingCount} Student Evaluations
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 self-end sm:self-auto">
                      <div className="text-right">
                        <div className="flex items-center space-x-1.5 justify-end">
                          <Star className="h-4.5 w-4.5 text-yellow-500 fill-yellow-500" />
                          <span className="text-sm font-black text-gray-900 font-mono">
                            {tc.averageRating}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mt-0.5 block">
                          Avg Score
                        </span>
                      </div>

                      {isExpanded ? (
                        <ChevronUp className="h-4.5 w-4.5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4.5 w-4.5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Expansion area: Multidimensional details & comments */}
                  {isExpanded && (
                    <div className="p-5 bg-gray-50/20 border-t border-gray-100 space-y-6">
                      {/* Metric scores */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div className="bg-white p-2.5 border border-gray-100 rounded-lg text-center">
                          <span className="block text-[8px] font-mono uppercase text-gray-400 leading-none">Teaching Quality</span>
                          <span className="text-xs font-black text-gray-900 mt-1 block font-mono">
                            &#9733; {tc.metricsAverage.teachingQuality}
                          </span>
                        </div>
                        <div className="bg-white p-2.5 border border-gray-100 rounded-lg text-center">
                          <span className="block text-[8px] font-mono uppercase text-gray-400 leading-none">Grading Fairness</span>
                          <span className="text-xs font-black text-gray-900 mt-1 block font-mono">
                            &#9733; {tc.metricsAverage.gradingFairness}
                          </span>
                        </div>
                        <div className="bg-white p-2.5 border border-gray-100 rounded-lg text-center">
                          <span className="block text-[8px] font-mono uppercase text-gray-400 leading-none">Attendance Strictness</span>
                          <span className="text-xs font-black text-gray-900 mt-1 block font-mono">
                            &#9733; {tc.metricsAverage.attendanceStrictness}
                          </span>
                        </div>
                        <div className="bg-white p-2.5 border border-gray-100 rounded-lg text-center">
                          <span className="block text-[8px] font-mono uppercase text-gray-400 leading-none">Behavior</span>
                          <span className="text-xs font-black text-gray-900 mt-1 block font-mono">
                            &#9733; {tc.metricsAverage.behavior}
                          </span>
                        </div>
                        <div className="bg-white p-2.5 border border-gray-100 rounded-lg text-center">
                          <span className="block text-[8px] font-mono uppercase text-gray-400 leading-none">Recommendation</span>
                          <span className="text-xs font-black text-gray-900 mt-1 block font-mono">
                            &#9733; {tc.metricsAverage.recommendation}
                          </span>
                        </div>
                      </div>

                      {/* Comments section */}
                      <div className="space-y-3">
                        <h5 className="text-[10px] font-mono uppercase text-gray-400 tracking-wider flex items-center space-x-1">
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>Student Feedback Comments ({teacherReviews.length})</span>
                        </h5>

                        {teacherReviews.length === 0 ? (
                          <p className="text-xs text-gray-400 italic font-mono pl-1">No written comment logs recorded</p>
                        ) : (
                          <div className="space-y-3">
                            {teacherReviews.map((rev) => (
                              <div
                                key={rev.id}
                                className="bg-white p-3.5 border border-gray-100 rounded-lg space-y-1.5"
                              >
                                <div className="flex justify-between text-xs font-medium text-gray-800">
                                  <span className="font-bold flex items-center space-x-1.5">
                                    <User className="h-3.5 w-3.5 text-gray-400" />
                                    <span>{rev.studentName}</span>
                                    {rev.isAnonymous && (
                                      <span className="text-[9px] font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full border border-gray-200">
                                        anonymous
                                      </span>
                                    )}
                                  </span>
                                  <span className="font-mono text-amber-500 font-bold shrink-0">
                                    &#9733; {rev.rating} Overall
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 font-sans leading-relaxed">
                                  {rev.comment}
                                </p>
                                <div className="flex justify-between items-center text-[9px] font-mono text-gray-400 pt-1">
                                  <span>Course context: {courses.find(c => c.id === rev.courseId)?.code || "Trimester Course"}</span>
                                  <span>{new Date(rev.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

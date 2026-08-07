"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import Sidebar from "@/app/components/dashboard/Sidebar";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Halaqa {
  id: string;
  name: string;
  mosque_id: string;
}

interface Student {
  id: string;
  full_name: string;
  parent_id: string;
  halaqa_id: string;
}

interface AttendanceState {
  [studentId: string]: {
    status: "حاضر" | "متأخر" | "غائب" | "غائب مبرر";
    behaviorRating: number;
    memorizationRating: number;
  };
}

const STATUS_OPTIONS = ["حاضر", "متأخر", "غائب"] as const;
const RATING_STARS = [1, 2, 3, 4, 5];

export default function AttendancePage() {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [halaqat, setHalaqat] = useState<Halaqa[]>([]);
  const [selectedHalaqa, setSelectedHalaqa] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceState>({});
  const [teacherId, setTeacherId] = useState<string | null>(null);

  useEffect(() => {
    async function getTeacherData() {
      try {
        setLoading(true);
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) throw new Error("لم يتم العثور على جلسة معلم نشطة");

        setTeacherId(user.id);

        const { data: halaqatData, error: halaqatError } = await supabase
          .from("halaqat")
          .select("id, name, mosque_id")
          .eq("teacher_id", user.id);

        if (halaqatError) throw halaqatError;
        setHalaqat(halaqatData || []);
      } catch (error) {
        console.error("Error fetching initial data:", error);
      } finally {
        setLoading(false);
      }
    }
    getTeacherData();
  }, []);

  useEffect(() => {
    async function fetchStudents() {
      if (!selectedHalaqa) {
        setStudents([]);
        return;
      }
      try {
        setLoading(true);
        const { data: studentsData, error: studentsError } = await supabase
          .from("students")
          .select("id, full_name, parent_id, halaqa_id")
          .eq("halaqa_id", selectedHalaqa);

        if (studentsError) throw studentsError;

        setStudents(studentsData || []);

        const initialAttendance: AttendanceState = {};
        studentsData?.forEach((student) => {
          initialAttendance[student.id] = {
            status: "حاضر",
            behaviorRating: 5,
            memorizationRating: 5,
          };
        });
        setAttendance(initialAttendance);
      } catch (error) {
        console.error("Error fetching students:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStudents();
  }, [selectedHalaqa]);

  const updateStudentState = (
    studentId: string,
    field: "status" | "behaviorRating" | "memorizationRating",
    value: any
  ) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
      },
    }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedHalaqa || students.length === 0 || !teacherId) return;

    try {
      setSaving(true);

      const attendanceRecords = students.map((student) => ({
        student_id: student.id,
        halaqa_id: selectedHalaqa,
        teacher_id: teacherId,
        status: attendance[student.id]?.status || "حاضر",
        behavior_rating: attendance[student.id]?.behaviorRating || 5,
        memorization_rating: attendance[student.id]?.memorizationRating || 5,
        date: new Date().toISOString().split("T")[0],
      }));

      const { error: attendanceError } = await supabase
        .from("attendance")
        .insert(attendanceRecords);

      if (attendanceError) throw attendanceError;

      const absentStudents = students.filter(
        (student) => attendance[student.id]?.status === "غائب"
      );

      if (absentStudents.length > 0) {
        const notificationRecords = absentStudents.map((student) => ({
          user_id: student.parent_id,
          title: "تنبيه غياب يومي",
          message: `نفيدكم علماً بغياب ابنكم ${student.full_name} عن حلقة التحفيظ اليوم.`,
          is_read: false,
          is_sent: false,
        }));

        const { error: notificationError } = await supabase
          .from("notifications")
          .insert(notificationRecords);

        if (notificationError) throw notificationError;
      }

      alert("تم تسجيل الحضور بنجاح وضخ تنبيهات الغياب لنظام الأتمتة n8n!");
    } catch (error) {
      console.error("Error saving attendance:", error);
      alert("حدث خطأ أثناء حفظ البيانات، يرجى مراجعة الـ Console.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FCFBF7] text-slate-800 flex" dir="rtl">
      
      {/* هنا يتم تمرير الـ props بشكل صحيح للمكون بعد تعديل تعريفه بالأسفل */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto">
        <header className="bg-white border-b border-slate-200 p-4 flex items-center justify-between md:justify-end shrink-0">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-2 bg-emerald-800 text-[#FCFBF7] rounded-lg shadow-md focus:outline-none md:hidden"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="text-sm font-semibold text-emerald-800 hidden md:block">
            نظام إدارة الحضور الذكي
          </div>
        </header>

        <main className="p-4 md:p-6 flex-1">
          <div className="max-w-6xl mx-auto">
            <div className="bg-emerald-800 p-6 rounded-xl text-[#FCFBF7] shadow-md mb-6 border-b-4 border-amber-500">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🕌</span>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold tracking-wide">بوابة رصد الحضور والغياب اليومي</h1>
                  <p className="text-emerald-100 text-xs md:text-sm mt-1">
                    اختر الفوج الذي تريد تسجيل حضوره
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 mb-6">
              <label className="block text-sm font-semibold text-emerald-900 mb-2">اختر الحلقة / الفوج الدراسي:</label>
              <div className="relative w-full md:w-72">
                <select
                  className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 outline-none transition appearance-none text-sm font-medium"
                  value={selectedHalaqa}
                  onChange={(e) => setSelectedHalaqa(e.target.value)}
                >
                  <option value="">-- اختر الحلقة --</option>
                  {halaqat.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-3 text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {selectedHalaqa && students.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-emerald-900 text-sm border-b border-slate-100">
                        <th className="p-4 font-bold">اسم الطالب</th>
                        <th className="p-4 font-bold">رصد حالة الحضور</th>
                        <th className="p-4 font-bold">تقييم الحفظ</th>
                        <th className="p-4 font-bold">تقييم السلوك</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-slate-700">
                      {students.map((student) => {
                        const currentState = attendance[student.id] || {
                          status: "حاضر",
                          behaviorRating: 5,
                          memorizationRating: 5,
                        };

                        return (
                          <tr key={student.id} className="hover:bg-slate-50/80 transition">
                            <td className="p-4 font-medium text-slate-900">{student.full_name}</td>
                            <td className="p-4">
                              <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit border border-slate-200">
                                {STATUS_OPTIONS.map((statusType) => {
                                  const isActive = currentState.status === statusType;
                                  let activeClass = "";
                                  if (isActive) {
                                    activeClass = statusType === "حاضر" 
                                      ? "bg-emerald-700 text-white shadow-sm" 
                                      : statusType === "متأخر" 
                                      ? "bg-amber-500 text-white shadow-sm" 
                                      : "bg-rose-600 text-white shadow-sm";
                                  }
                                  return (
                                    <button
                                      key={statusType}
                                      type="button"
                                      onClick={() => updateStudentState(student.id, "status", statusType)}
                                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                                        isActive ? activeClass : "text-slate-600 hover:text-slate-900"
                                      }`}
                                    >
                                      {statusType}
                                    </button>
                                  );
                                })}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex gap-1">
                                {RATING_STARS.map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => updateStudentState(student.id, "memorizationRating", star)}
                                    className={`text-xl transition-transform active:scale-125 ${
                                      star <= currentState.memorizationRating ? "text-amber-400" : "text-slate-200"
                                    }`}
                                  >
                                    ★
                                  </button>
                                ))}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex gap-1">
                                {RATING_STARS.map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => updateStudentState(student.id, "behaviorRating", star)}
                                    className={`text-xl transition-transform active:scale-125 ${
                                      star <= currentState.behaviorRating ? "text-amber-400" : "text-slate-200"
                                    }`}
                                  >
                                    ★
                                  </button>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="block md:hidden p-4 space-y-4">
                  {students.map((student) => {
                    const currentState = attendance[student.id] || {
                      status: "حاضر",
                      behaviorRating: 5,
                      memorizationRating: 5,
                    };

                    return (
                      <div key={student.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm">
                        <div className="font-bold text-slate-900 mb-3 text-base">{student.full_name}</div>
                        <div className="space-y-3 text-sm">
                          <div>
                            <span className="block text-xs font-semibold text-slate-500 mb-1.5">حالة الحضور:</span>
                            <div className="flex gap-1.5 bg-slate-200/60 p-1 rounded-xl border border-slate-200">
                              {STATUS_OPTIONS.map((statusType) => {
                                const isActive = currentState.status === statusType;
                                let activeClass = "";
                                if (isActive) {
                                  activeClass = statusType === "حاضر" 
                                    ? "bg-emerald-700 text-white" 
                                    : statusType === "متأخر" 
                                    ? "bg-amber-500 text-white" 
                                    : "bg-rose-600 text-white";
                                }
                                return (
                                  <button
                                    key={statusType}
                                    type="button"
                                    onClick={() => updateStudentState(student.id, "status", statusType)}
                                    className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold transition-all ${
                                      isActive ? activeClass : "text-slate-600"
                                    }`}
                                  >
                                    {statusType}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <div>
                              <span className="block text-xs font-semibold text-slate-500 mb-1">تقييم الحفظ:</span>
                              <div className="flex gap-1">
                                {RATING_STARS.map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => updateStudentState(student.id, "memorizationRating", star)}
                                    className={`text-lg ${star <= currentState.memorizationRating ? "text-amber-400" : "text-slate-200"}`}
                                  >
                                    ★
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <span className="block text-xs font-semibold text-slate-500 mb-1">تقييم السلوك:</span>
                              <div className="flex gap-1">
                                {RATING_STARS.map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => updateStudentState(student.id, "behaviorRating", star)}
                                    className={`text-lg ${star <= currentState.behaviorRating ? "text-amber-400" : "text-slate-200"}`}
                                  >
                                    ★
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveAttendance}
                    disabled={saving}
                    className="w-full md:w-auto bg-emerald-800 hover:bg-emerald-900 text-[#FCFBF7] font-bold px-6 py-3 rounded-lg text-sm shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2 border-2 border-amber-500 active:scale-95"
                  >
                    {saving ? "جاري حفظ وإرسال البيانات..." : "💾 إرسال التقرير اليومي وحفظ البيانات"}
                  </button>
                </div>
              </div>
            )}

            {selectedHalaqa && students.length === 0 && !loading && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-xl text-center font-medium">
                لا يوجد طلاب مسجلين في هذه الحلقة حالياً.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
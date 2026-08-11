"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/app/components/dashboard/Sidebar";
import { supabase } from "@/lib/supabase";

interface AbsenceRequest {
  id: string;
  parent_id: string;
  student_id: string;
  student_name?: string;
  teacher_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  created_at: string;
}

export default function AbsentNotificationsPage() {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [requests, setRequests] = useState<AbsenceRequest[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // جلب التنبيهات وطلبات الغياب الموجهة للمعلم الحالي من Supabase مع مراعاة mosque_id
  useEffect(() => {
    async function fetchAbsenceRequests() {
      try {
        setLoading(true);

        // 1️⃣ جلب بيانات المعلم الحالي
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error("لم يتم العثور على جلسة مستخدم نشطة");

        // 2️⃣ جلب mosque_id الخاص بالمعلم
        const { data: profile } = await supabase
          .from("profiles")
          .select("mosque_id")
          .eq("id", user.id)
          .single();

        if (!profile?.mosque_id) {
          setLoading(false);
          return;
        }

        // 3️⃣ جلب طلبات الغياب المخصصة للمعلم في نفس المسجد
        const { data, error } = await supabase
          .from("absence_requests")
          .select("id, parent_id, student_id, teacher_id, start_date, end_date, reason, status, created_at")
          .eq("teacher_id", user.id)
          .eq("mosque_id", profile.mosque_id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          // جلب أسماء الطلاب المرتبطين بالطلبات
          const studentIds = Array.from(new Set(data.map((r) => r.student_id)));
          const { data: studentsData } = await supabase
            .from("students")
            .select("id, full_name")
            .in("id", studentIds);

          const studentsMap: Record<string, string> = {};
          studentsData?.forEach((s) => {
            studentsMap[s.id] = s.full_name;
          });

          const enrichedRequests = data.map((req) => ({
            ...req,
            student_name: studentsMap[req.student_id] || "طالب غير معروف",
          }));

          setRequests(enrichedRequests);
        } else {
          setRequests([]);
        }
      } catch (error) {
        console.error("Error fetching absence requests:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAbsenceRequests();
  }, []);

  // معالجة اتخاذ القرار (قبول أو رفض الطلب) وتحديث قاعدة البيانات فورياً
  const handleStatusUpdate = async (id: string, newStatus: "approved" | "rejected") => {
    try {
      setActionLoadingId(id);

      const { error } = await supabase
        .from("absence_requests")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      setRequests((prev) =>
        prev.map((req) => (req.id === id ? { ...req, status: newStatus } : req))
      );
    } catch (error) {
      console.error(`Error updating status to ${newStatus}:`, error);
      alert("حدث خطأ أثناء تحديث حالة الطلب.");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F8] text-slate-800 flex relative overflow-x-hidden" dir="rtl">
      {/* الشريط الجانبي */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* المحتوى الرئيسي للمنصة */}
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto">
        {/* الهيدر العلوي */}
        <header className="bg-white border-b border-slate-200 p-4 flex items-center justify-between shrink-0 sticky top-0 z-30">
          <div className="text-sm font-bold text-[#007A53]">
            إدارة وتأسيس الحلقات القرآنية والتعليمية
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 bg-[#007A53] text-white rounded-lg shadow-md md:hidden focus:outline-none"
            aria-label="Toggle Sidebar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>

        {/* محتوى الصفحة الداخلي */}
        <main className="p-4 md:p-8 flex-1 bg-[#FCFBF7]">
          <div className="max-w-5xl mx-auto space-y-6">
            
            {/* البانر العلوي */}
            <div className="bg-[#007A53] p-8 rounded-xl text-white shadow-lg relative border-b-8 border-[#E2A014] overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl md:text-3xl font-bold tracking-wide">إشعارات وتصريحات الغياب للطلاب</h1>
                  <p className="text-emerald-100 text-xs md:text-sm mt-2 font-light">
                    تابع وراجع طلبات الغياب والمستندات المرسلة ديناميكياً ضمن النظام المركزي لمنصة نور
                  </p>
                </div>
                <span className="text-4xl hidden sm:block opacity-80">🔔</span>
              </div>
            </div>

            {/* بطاقات الجداول والطلبات */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <h2 className="text-base font-bold text-[#0B1528] p-5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                <span>📋</span> كشف ومراجعة الطلبات الحالية
              </h2>

              {loading ? (
                <div className="p-12 text-center text-sm text-slate-500 font-medium">جاري جلب إشعارات الغياب من قاعدة البيانات...</div>
              ) : requests.length === 0 ? (
                <div className="p-12 text-center text-sm text-slate-400 font-medium">لا توجد طلبات أو إشعارات غياب مسجلة باسمك حالياً.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {requests.map((req) => (
                    <div key={req.id} className="p-6 hover:bg-slate-50/50 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                      
                      <div className="space-y-3 max-w-2xl w-full">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-bold text-slate-950 text-base">
                            الابن/الطالب: {req.student_name}
                          </span>
                          <span className="text-xs text-slate-400">
                            بتاريخ: {new Date(req.created_at).toLocaleDateString("ar-DZ")}
                          </span>
                          
                          {req.status === "pending" && (
                            <span className="px-3 py-0.5 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded-full">قيد الانتظار</span>
                          )}
                          {req.status === "approved" && (
                            <span className="px-3 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">تم قبول العذر</span>
                          )}
                          {req.status === "rejected" && (
                            <span className="px-3 py-0.5 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 rounded-full">مرفوض</span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <div><span className="font-semibold text-[#007A53]">تاريخ البدء:</span> {req.start_date}</div>
                          <div><span className="font-semibold text-[#007A53]">تاريخ الانتهاء:</span> {req.end_date}</div>
                        </div>

                        <p className="text-sm text-slate-700 bg-[#FCFBF7] p-3 rounded-lg border-r-4 border-[#007A53] font-medium shadow-sm">
                          <span className="block text-xs font-semibold text-slate-400 mb-1">سبب الغياب المصرح به:</span>
                          {req.reason}
                        </p>
                      </div>

                      {req.status === "pending" && (
                        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                          <button
                            type="button"
                            disabled={actionLoadingId !== null}
                            onClick={() => handleStatusUpdate(req.id, "approved")}
                            className="bg-[#007A53] hover:bg-[#005c3e] text-white text-xs font-bold px-4 py-2.5 rounded-lg transition shadow-sm disabled:opacity-50"
                          >
                            {actionLoadingId === req.id ? "جاري التحديث..." : "✔️ قبول وتبرير"}
                          </button>
                          <button
                            type="button"
                            disabled={actionLoadingId !== null}
                            onClick={() => handleStatusUpdate(req.id, "rejected")}
                            className="bg-white hover:bg-rose-600 hover:text-white text-rose-600 border border-rose-200 text-xs font-bold px-4 py-2.5 rounded-lg transition disabled:opacity-50"
                          >
                            ❌ رفض الطلب
                          </button>
                        </div>
                      )}

                      {req.status !== "pending" && (
                        <div className="text-xs text-slate-400 italic font-medium self-end md:self-center">
                          تمت معالجة هذا الطلب.
                        </div>
                      )}

                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
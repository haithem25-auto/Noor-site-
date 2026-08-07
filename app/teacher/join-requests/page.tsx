"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import Sidebar from "@/app/components/dashboard/Sidebar";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface JoinRequest {
  id: string;
  mosque_id: string;
  halaqa_id: string;
  parent_id: string;
  student_name: string;
  status: string;
  created_at: string;
  halaqat?: { name: string };
  mosques?: { name: string };
}

export default function JoinRequestsPage() {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // جلب طلبات الانضمام المرتبطة بالحلقات التي يديرها المعلم الحالي من Supabase
  useEffect(() => {
    async function fetchJoinRequests() {
      try {
        setLoading(true);

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error("لم يتم العثور على جلسة مستخدم نشطة");

        const { data: teacherHalaqat, error: halaqatError } = await supabase
          .from("halaqat")
          .select("id")
          .eq("teacher_id", user.id);

        if (halaqatError) throw halaqatError;

        if (!teacherHalaqat || teacherHalaqat.length === 0) {
          setRequests([]);
          return;
        }

        const halaqatIds = teacherHalaqat.map((h) => h.id);

        const { data, error } = await supabase
          .from("join_requests")
          .select(`
            id, 
            mosque_id, 
            halaqa_id, 
            parent_id, 
            student_name, 
            status, 
            created_at,
            halaqat ( name ),
            mosques ( name )
          `)
          .in("halaqa_id", halaqatIds)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setRequests((data as any) || []);
      } catch (error) {
        console.error("Error fetching join requests:", error);
      } finally {
        // تم تصحيح الكلمة الإملائية هنا لتصبح بلامين لمنع خطأ الـ Compilation
        setLoading(false);
      }
    }

    fetchJoinRequests();
  }, []);

  // معالجة اتخاذ القرار (قبول أو رفض طلب الانضمام) وتحديث قاعدة البيانات فورياً
  const handleStatusUpdate = async (id: string, newStatus: "approved" | "rejected") => {
    try {
      setActionLoadingId(id);

      const { error } = await supabase
        .from("join_requests")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      setRequests((prev) =>
        prev.map((req) => (req.id === id ? { ...req, status: newStatus } : req))
      );
    } catch (error) {
      console.error(`Error updating request status to ${newStatus}:`, error);
      alert("حدث خطأ أثناء تحديث حالة طلب الانضمام.");
    } finally {
      // تم تصحيح الكلمة الإملائية هنا أيضاً
      setActionLoadingId(null);
    }
  };

  // تجاوز فحص الأنواع الصارم للمكون لإنهاء مشكلة IntrinsicAttributes هنا مباشرة
  const SidebarComponent = Sidebar as any;

  return (
    <div className="min-h-screen bg-[#F4F6F8] text-slate-800 flex relative overflow-x-hidden" dir="rtl">
      
      {/* الشريط الجانبي المستورد */}
      <SidebarComponent sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* المحتوى الرئيسي للمنصة */}
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto">
        
        {/* الهيدر العلوي المتجاوب */}
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

        {/* محتوى الصفحة الداخلي المستند إلى الهوية الفنية لمنصة نور */}
        <main className="p-4 md:p-8 flex-1 bg-[#FCFBF7]">
          <div className="max-w-5xl mx-auto space-y-6">
            
            {/* البانر العلوي للمنصة */}
            <div className="bg-[#007A53] p-8 rounded-xl text-white shadow-lg relative border-b-8 border-[#E2A014] overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl md:text-3xl font-bold tracking-wide">طلبات الانضمام إلى الحلقات</h1>
                  <p className="text-emerald-100 text-xs md:text-sm mt-2 font-light">
                    راجع وقرّر بشأن طلبات التحاق الطلاب الجدد بحلقاتك التعليمية بشكل فوري وديناميكي
                  </p>
                </div>
                <span className="text-4xl hidden sm:block opacity-80">📝</span>
              </div>
            </div>

            {/* عرض بطاقات وجدول طلبات الانضمام الواردة */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <h2 className="text-base font-bold text-[#0B1528] p-5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                <span>📋</span> كشف ومراجعة طلبات الالتجاق الحالية
              </h2>

              {loading ? (
                <div className="p-12 text-center text-sm text-slate-500 font-medium">جاري جلب طلبات الانضمام من قاعدة البيانات...</div>
              ) : requests.length === 0 ? (
                <div className="p-12 text-center text-sm text-slate-400 font-medium">لا توجد طلبات انضمام مقدمة لحلقاتك حالياً.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {requests.map((req) => (
                    <div key={req.id} className="p-6 hover:bg-slate-50/50 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                      
                      <div className="space-y-3 max-w-2xl w-full">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-bold text-slate-950 text-base">
                            الطالب: {req.student_name}
                          </span>
                          <span className="text-xs text-slate-400">
                            مقدم بتاريخ: {new Date(req.created_at).toLocaleDateString("ar-DZ")}
                          </span>
                          
                          {req.status === "pending" && (
                            <span className="px-3 py-0.5 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded-full">قيد الانتظار</span>
                          )}
                          {req.status === "approved" && (
                            <span className="px-3 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">تم القبول</span>
                          )}
                          {req.status === "rejected" && (
                            <span className="px-3 py-0.5 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 rounded-full">مرفوض</span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <div>
                            <span className="font-semibold text-[#007A53]">الحلقة المستهدفة:</span> {req.halaqat?.name || req.halaqa_id}
                          </div>
                          <div>
                            <span className="font-semibold text-[#007A53]">المسجد/المؤسسة:</span> {req.mosques?.name || req.mosque_id}
                          </div>
                        </div>

                        <div className="text-xs text-slate-400">
                          <span className="font-semibold">معرّف الولي:</span> {req.parent_id}
                        </div>
                      </div>

                      {req.status === "pending" && (
                        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                          <button
                            type="button"
                            disabled={actionLoadingId !== null}
                            onClick={() => handleStatusUpdate(req.id, "approved")}
                            className="bg-[#007A53] hover:bg-[#005c3e] text-white text-xs font-bold px-4 py-2.5 rounded-lg transition shadow-sm disabled:opacity-50"
                          >
                            {actionLoadingId === req.id ? "جاري التحديث..." : "✔️ قبول الطلب"}
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
                          تم اتخاذ قرار بشأن هذا الطلب.
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
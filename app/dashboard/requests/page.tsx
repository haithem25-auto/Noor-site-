"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import QRCodeCard from "@/app/components/QRCodeCard"; 

export default function ImamRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState({ text: "", type: "" });
  
  const [mosqueSlug, setMosqueSlug] = useState<string | null>(null);

  // 1️⃣ دالة جلب الطلبات والـ slug الآمنة
  async function loadRequests() {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // تغيير .single() إلى .maybeSingle() لمنع انهيار الطلب بـ 400 في حال عدم تعيين البيانات بدقة
      const { data: mosque, error: mosqueErr } = await supabase
        .from("mosques")
        .select("id, slug") 
        .eq("imam_id", user.id)
        .maybeSingle();

      if (mosqueErr || !mosque) {
        setRequests([]);
        setMosqueSlug(null);
        return;
      }

      setMosqueSlug(mosque.slug); 

      // جلب طلبات الانضمام بطريقة GET مستقرة
      const { data, error } = await supabase
        .from("join_requests")
        .select(`
          *,
          halaqat ( name )
        `)
        .eq("mosque_id", mosque.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setRequests(data);
      }
    } catch (err) {
      console.error("Error loading requests:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  // 2️⃣ معالجة عملية القبول 
  const handleApprove = async (request: any) => {
    try {
      setActionLoadingId(request.id);
      setMessage({ text: "", type: "" });

      const { error: updateErr } = await supabase
        .from("join_requests")
        .update({ status: "approved" })
        .eq("id", request.id);

      if (updateErr) throw updateErr;

      const { error: studentErr } = await supabase
        .from("students")
        .insert({
          name: request.student_name,
          mosque_id: request.mosque_id,
          halaqa_id: request.halaqa_id,
          parent_id: request.parent_id, 
        });

      if (studentErr) throw studentErr;

      setMessage({ text: `تم قبول الطالب "${request.student_name}" وإنشاء ملفه وتسكينه بالحلقة بنجاح! ✅`, type: "success" });
      
      setRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: "approved" } : r));

    } catch (err: any) {
      console.error("Approval error:", err);
      setMessage({ text: "حدث خطأ أثناء معالجة القبول، يرجى المحاولة لاحقاً.", type: "error" });
    } finally {
      setActionLoadingId(null);
    }
  };

  // 3️⃣ معالجة عملية الرفض
  const handleReject = async (requestId: string) => {
    try {
      setActionLoadingId(requestId);
      setMessage({ text: "", type: "" });

      const { error } = await supabase
        .from("join_requests")
        .update({ status: "rejected" })
        .eq("id", requestId);

      if (error) throw error;

      setMessage({ text: "تم رفض طلب الانضمام وتحديث الحالة. ❌", type: "success" });
      
      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: "rejected" } : r));

    } catch (err) {
      console.error("Rejection error:", err);
      setMessage({ text: "حدث خطأ أثناء معالجة الرفض.", type: "error" });
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-10 flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium">جاري جلب البيانات وتوليد الرموز الحية...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto" dir="rtl">
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center mb-8 pb-6 border-b border-gray-100">
        <div className="md:col-span-2">
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">طلبات الانضمام للحلقات</h1>
          <p className="text-gray-500 mt-2">راجع طلبات أولياء الأمور لتسجيل أبنائهم واقبلها بضغطة زر واحدة ⚡</p>
        </div>
        
        <div className="flex justify-center md:justify-end">
          {mosqueSlug ? (
            <QRCodeCard slug={mosqueSlug} />
          ) : (
            <div className="text-xs text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-200">
              ⚠️ لم يتم العثور على معرف مسجلك لتوليد الـ QR Code.
            </div>
          )}
        </div>
      </div>

      {message.text && (
        <div className={`p-4 rounded-2xl text-sm font-semibold mb-6 text-center ${
          message.type === "success" ? "bg-green-50 text-green-800 border border-green-100" : "bg-red-50 text-red-800 border border-red-100"
        }`}>
          {message.text}
        </div>
      )}

      {requests.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-3xl border border-gray-100 shadow-sm text-gray-400 font-medium">
          📭 لا توجد أي طلبات انضمام مقدمة لهذا المسجد حالياً.
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-800/50 text-gray-500 dark:text-gray-400 text-xs font-bold uppercase border-b border-gray-100 dark:border-slate-800">
                  <th className="p-5">اسم الطالب</th>
                  <th className="p-5">الحلقة المطلوبة</th>
                  <th className="p-5">تاريخ تقديم الطلب</th>
                  <th className="p-5 text-center">الحالة</th>
                  <th className="p-5 text-center">الإجراءات والقرارات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800/60">
                <AnimatePresence>
                  {requests.map((req) => (
                    <motion.tr 
                      key={req.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="p-5 font-bold text-gray-900 dark:text-white">
                        {req.student_name}
                      </td>

                      <td className="p-5 font-medium text-emerald-700 dark:text-emerald-400">
                        {req.halaqat?.name || "لم تحدد (متروك للإمام)"}
                      </td>

                      <td className="p-5 text-sm text-gray-400 font-medium">
                        {new Date(req.created_at).toLocaleDateString("ar-DZ", {
                          year: "numeric",
                          month: "long",
                          day: "numeric"
                        })}
                      </td>

                      <td className="p-5 text-center">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                          req.status === "pending" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                          req.status === "approved" ? "bg-green-50 text-green-700 border border-green-100" :
                          "bg-red-50 text-red-700 border border-red-100"
                        }`}>
                          {req.status === "pending" && "⏳ معلق"}
                          {req.status === "approved" && "✅ مقبول"}
                          {req.status === "rejected" && "❌ مرفوض"}
                        </span>
                      </td>

                      <td className="p-5 flex items-center justify-center gap-3">
                        {req.status === "pending" ? (
                          <>
                            <button
                              onClick={() => handleApprove(req)}
                              disabled={actionLoadingId !== null}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm active:scale-95 disabled:opacity-50"
                            >
                              {actionLoadingId === req.id ? "جاري..." : "👍 قبول وتسكين"}
                            </button>
                            <button
                              onClick={() => handleReject(req.id)}
                              disabled={actionLoadingId !== null}
                              className="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold px-4 py-2 rounded-xl transition active:scale-95 disabled:opacity-50"
                            >
                              {actionLoadingId === req.id ? "جاري..." : "👎 رفض"}
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400 font-medium">تم اتخاذ القرار</span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
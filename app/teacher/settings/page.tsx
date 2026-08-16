"use client";

import { useState, useEffect, FormEvent } from "react";
import { createClient } from "@supabase/supabase-js";
import Sidebar from "@/app/components/dashboard/Sidebar";

// إنشاء العميل مع تفادي إعادة الإنشاء في بيئة التطوير
const getSupabaseClient = () => {
  const globalVar = globalThis as any;
  if (!globalVar.supabaseInstance) {
    globalVar.supabaseInstance = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return globalVar.supabaseInstance;
};

const supabase = getSupabaseClient();

interface Halaqa {
  id: string;
  name: string;
  schedule: string;
  mosque_id: string;
  teacher_id: string;
}

interface Student {
  id: string;
  full_name: string;
  halaqa_id: string;
}

export default function TeacherSettingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // البيانات
  const [myHalaqat, setMyHalaqat] = useState<Halaqa[]>([]);
  const [allMosqueHalaqat, setAllMosqueHalaqat] = useState<Halaqa[]>([]);
  const [transferStudents, setTransferStudents] = useState<Student[]>([]);

  // حالات التحميل للأزرار
  const [btnLoading, setBtnLoading] = useState<string | null>(null);

  // 1. تغيير توقيت الحلقة
  const [selectedHalaqaTimeId, setSelectedHalaqaTimeId] = useState<string>("");
  const [newTiming, setNewTiming] = useState<string>("");

  // 2. نقل طالب
  const [sourceHalaqaId, setSourceHalaqaId] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [targetHalaqaId, setTargetHalaqaId] = useState<string>("");

  // 3. إشعار الغياب
  const [selectedAbsenceHalaqaId, setSelectedAbsenceHalaqaId] = useState<string>("");
  const [absenceReason, setAbsenceReason] = useState<string>("");

  // جلب البيانات الأولية عند تحميل الصفحة
  useEffect(() => {
    async function fetchInitialData() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // جلب حلقات هذا المعلم
        const { data: halaqatData } = await supabase
          .from("halaqat")
          .select("id, name, schedule, mosque_id, teacher_id")
          .eq("teacher_id", user.id);

        setMyHalaqat(halaqatData || []);

        // جلب جميع حلقات المسجد التابع له المعلم لنقل الطلاب بينها
        if (halaqatData && halaqatData.length > 0) {
          const mosqueId = halaqatData[0].mosque_id;
          const { data: mosqueHalaqat } = await supabase
            .from("halaqat")
            .select("id, name, schedule, mosque_id, teacher_id")
            .eq("mosque_id", mosqueId);

          setAllMosqueHalaqat(mosqueHalaqat || []);
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchInitialData();
  }, []);

  // جلب طلاب الحلقة المصدر المختارة في قسم نقل الطلاب
  useEffect(() => {
    async function fetchStudentsForHalaqa() {
      if (!sourceHalaqaId) {
        setTransferStudents([]);
        return;
      }
      try {
        const { data } = await supabase
          .from("students")
          .select("id, full_name, halaqa_id")
          .eq("halaqa_id", sourceHalaqaId);

        setTransferStudents(data || []);
      } catch (error) {
        console.error("Error fetching students:", error);
      }
    }
    fetchStudentsForHalaqa();
  }, [sourceHalaqaId]);

  // 1. معالجة تحديث توقيت الحلقة
  const handleUpdateTiming = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedHalaqaTimeId || !newTiming.trim()) return;

    try {
      setBtnLoading("timing");
      const { error } = await supabase
        .from("halaqat")
        .update({ schedule: newTiming.trim() })
        .eq("id", selectedHalaqaTimeId);

      if (error) throw error;
      alert("تم تحديث توقيت الحلقة بنجاح.");
      
      // تحديث الحالة المحلية
      setMyHalaqat((prev) =>
        prev.map((h) => (h.id === selectedHalaqaTimeId ? { ...h, schedule: newTiming.trim() } : h))
      );
      setNewTiming("");
    } catch (error) {
      console.error("Error updating timing:", error);
      alert("حدث خطأ أثناء تحديث التوقيت.");
    } finally {
      setBtnLoading(null);
    }
  };

  // 2. معالجة نقل الطالب
  const handleTransferStudent = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !targetHalaqaId) return;

    try {
      setBtnLoading("transfer");

      // التحقق مما إذا كانت الحلقة المستهدفة خاصة بنفس المعلم أم أستاذ آخر
      const targetHalaqa = allMosqueHalaqat.find((h) => h.id === targetHalaqaId);
      const { data: { user } } = await supabase.auth.getUser();

      if (targetHalaqa && targetHalaqa.teacher_id === user?.id) {
        // إذا كانت الحلقة لنفس المعلم: يتم النقل والموافقة المباشرة
        const { error } = await supabase
          .from("students")
          .update({ halaqa_id: targetHalaqaId })
          .eq("id", selectedStudentId);

        if (error) throw error;
        alert("تم نقل الطالب وقبوله مباشرة داخل حلقاتك بنجاح.");
      } else {
        // إذا كانت الحلقة لأستاذ آخر: يتم إرسال طلب نقل (Join Request) برسم المعالجة
        const currentStudent = transferStudents.find((s) => s.id === selectedStudentId);

        const { error } = await supabase
          .from("join_requests")
          .insert({
            mosque_id: targetHalaqa?.mosque_id,
            halaqa_id: targetHalaqaId,
            student_name: currentStudent?.full_name,
            status: "pending"
          });

        if (error) throw error;
        alert("تم إرسال طلب نقل الطالب وهو الآن في انتظار موافقة أستاذ الحلقة المنقول إليها.");
      }

      // تفريغ المدخلات بعد النجاح
      setSelectedStudentId("");
      setTargetHalaqaId("");
    } catch (error) {
      console.error("Error transferring student:", error);
      alert("حدث خطأ أثناء تنفيذ عملية نقل الطالب.");
    } finally {
      setBtnLoading(null);
    }
  };

  // 3. معالجة التنبيه بالغياب الاستباقي
  const handleNotifyAbsence = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedAbsenceHalaqaId || !absenceReason.trim()) return;

    try {
      setBtnLoading("absence");
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("teacher_absences")
        .insert({
          teacher_id: user?.id,
          halaqa_id: selectedAbsenceHalaqaId,
          reason: absenceReason.trim(),
          status: "pending"
        });

      if (error) throw error;
      alert("تم تسجيل الإشعار بالغياب بنجاح، وجاري تفعيل الـ Workflow لإرسال التنبيهات لأولياء الأمور.");
      setSelectedAbsenceHalaqaId("");
      setAbsenceReason("");
    } catch (error) {
      console.error("Error notifying absence:", error);
      alert("حدث خطأ أثناء تسجيل الإشعار بالغياب.");
    } finally {
      setBtnLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F8] text-slate-800 flex relative overflow-x-hidden" dir="rtl">
      
      {/* القائمة الجانبية */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

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
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>

        {/* محتوى الصفحة الرئيسي */}
        <main className="p-4 md:p-8 flex-1 bg-[#FCFBF7]">
          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* بطاقة الترحيب بأسلوب مخصص */}
            <div className="bg-[#007A53] p-8 rounded-xl text-white shadow-lg relative border-b-8 border-[#E2A014] overflow-hidden">
              <h1 className="text-xl md:text-3xl font-bold tracking-wide">إعدادات وعمليات المعلم</h1>
              <p className="text-emerald-100 text-xs md:text-sm mt-2 font-light">
                قم بإدارة أوقات الحلقات، نقل الطلاب التبديلي، وإرسال إشعارات الغياب الاستباقية مباشرة
              </p>
            </div>

            {loading ? (
              <div className="bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-500 font-medium">
                جاري تهيئة الإعدادات وجلب البيانات والروابط الفنية الحالية...
              </div>
            ) : (
              <div className="space-y-8">
                
                {/* 1. لوحة تغيير توقيت الحلقة */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h2 className="text-base font-bold text-[#0B1528] mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                    <span>🕒</span> تغيير توقيت حلقة تعليمية
                  </h2>
                  <form onSubmit={handleUpdateTiming} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-2">اختر الحلقة</label>
                      <select
                        value={selectedHalaqaTimeId}
                        onChange={(e) => setSelectedHalaqaTimeId(e.target.value)}
                        className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:outline-none focus:border-[#007A53]"
                        required
                      >
                        <option value="">-- حدد حلقة --</option>
                        {myHalaqat.map((h) => (
                          <option key={h.id} value={h.id}>{h.name} (الحالي: {h.schedule || "غير محدد"})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-2">التوقيت الجديد</label>
                      <input
                        type="text"
                        value={newTiming}
                        onChange={(e) => setNewTiming(e.target.value)}
                        placeholder="مثال: السبت والاثنين بعد العصر"
                        className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:outline-none focus:border-[#007A53]"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={btnLoading !== null || !selectedHalaqaTimeId || !newTiming.trim()}
                      className="bg-[#007A53] hover:bg-[#005c3e] text-white text-xs font-bold p-3 rounded-lg transition shadow-sm disabled:opacity-50"
                    >
                      {btnLoading === "timing" ? "جاري التحديث..." : "حفظ التوقيت الجديد"}
                    </button>
                  </form>
                </section>

                {/* 2. لوحة نقل طالب بين الحلقات */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h2 className="text-base font-bold text-[#0B1528] mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                    <span>🔄</span> نقل وإلحاق طالب بحلقة أخرى
                  </h2>
                  <form onSubmit={handleTransferStudent} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-2">الخانة الأولى: الحلقة الحالية</label>
                        <select
                          value={sourceHalaqaId}
                          onChange={(e) => {
                            setSourceHalaqaId(e.target.value);
                            setSelectedStudentId("");
                          }}
                          className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:outline-none focus:border-[#007A53]"
                          required
                        >
                          <option value="">-- حدد الحلقة المصدر --</option>
                          {myHalaqat.map((h) => (
                            <option key={h.id} value={h.id}>{h.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-2">الخانة الثانية: اختر الطالب</label>
                        <select
                          value={selectedStudentId}
                          onChange={(e) => setSelectedStudentId(e.target.value)}
                          className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:outline-none focus:border-[#007A53]"
                          disabled={!sourceHalaqaId}
                          required
                        >
                          <option value="">-- حدد الطالب من الحلقة --</option>
                          {transferStudents.map((s) => (
                            <option key={s.id} value={s.id}>{s.full_name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-2">الخانة الثالثة: الحلقة المستهدفة بالنقل</label>
                        <select
                          value={targetHalaqaId}
                          onChange={(e) => setTargetHalaqaId(e.target.value)}
                          className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:outline-none focus:border-[#007A53]"
                          required
                        >
                          <option value="">-- حدد الحلقة المستهدفة --</option>
                          {allMosqueHalaqat
                            .filter((h) => h.id !== sourceHalaqaId)
                            .map((h) => (
                              <option key={h.id} value={h.id}>
                                {h.name} {myHalaqat.some((mh) => mh.id === h.id) ? "(حلقة تابعة لك 🔒)" : "(حلقة أستاذ آخر 👥)"}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={btnLoading !== null || !selectedStudentId || !targetHalaqaId}
                        className="bg-[#007A53] hover:bg-[#005c3e] text-white text-xs font-bold px-6 py-3 rounded-lg transition shadow-sm disabled:opacity-50"
                      >
                        {btnLoading === "transfer" ? "جاري معالجة النقل..." : "تأكيد وإجراء عملية النقل"}
                      </button>
                    </div>
                  </form>
                </section>

                {/* 3. لوحة إشعار مسبق بالغياب */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h2 className="text-base font-bold text-[#0B1528] mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                    <span>📢</span> إرسال إشعار مسبق بالغياب لأولياء الأمور
                  </h2>
                  <form onSubmit={handleNotifyAbsence} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-2">اختر الحلقة المستهدفة بالتنبيه</label>
                        <select
                          value={selectedAbsenceHalaqaId}
                          onChange={(e) => setSelectedAbsenceHalaqaId(e.target.value)}
                          className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:outline-none focus:border-[#007A53]"
                          required
                        >
                          <option value="">-- حدد الحلقة المستهدفة بالإشعار --</option>
                          {myHalaqat.map((h) => (
                            <option key={h.id} value={h.id}>{h.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-2">ملاحظة/سبب الغياب (تصل لأولياء الأمور)</label>
                        <input
                          type="text"
                          value={absenceReason}
                          onChange={(e) => setAbsenceReason(e.target.value)}
                          placeholder="مثال: لظرف طارئ مستعجل، تستأنف الحلقة الحصة القادمة إن شاء الله"
                          className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:outline-none focus:border-[#007A53]"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={btnLoading !== null || !selectedAbsenceHalaqaId || !absenceReason.trim()}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-6 py-3 rounded-lg transition shadow-sm disabled:opacity-50"
                      >
                        {btnLoading === "absence" ? "جاري تسجيل التنبيه..." : "🚀 بث وإرسال التنبيه الاستباقي للأولياء"}
                      </button>
                    </div>
                  </form>
                </section>

              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
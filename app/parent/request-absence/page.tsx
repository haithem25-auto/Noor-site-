"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/lib/supabase";

export default function RequestAbsencePage() {
  const router = useRouter();
  const { role, loading: roleLoading } = useUserRole();

  // states الحقول
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  // البيانات المجلوبة
  const [students, setStudents] = useState<any[]>([]);
  const [parentId, setParentId] = useState<string | null>(null);

  // حالات التحميل والرسائل
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (roleLoading || role !== "parent") return;

    async function fetchParentStudents() {
      try {
        setLoadingStudents(true);

        // 1️⃣ جلب بيانات المستخدم الحالي
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          router.push("/");
          return;
        }

        setParentId(user.id);

        // 2️⃣ جلب أبناء الولي المسجلين والمقبولين
        const { data: studentsData, error: studentsError } = await supabase
          .from("students")
          .select("id, full_name, teacher_id, level")
          .eq("parent_id", user.id);

        if (studentsError) {
          console.error("Error fetching students:", studentsError);
        } else if (studentsData) {
          setStudents(studentsData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingStudents(false);
      }
    }

    fetchParentStudents();
  }, [role, roleLoading, router]);

  // 📝 معالجة تقديم الطلب
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!selectedStudentId || !startDate || !endDate || !reason) {
      setMessage({ type: "error", text: "يرجى ملء جميع الحقول المطلوبة." });
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setMessage({ type: "error", text: "تاريخ بداية الغياب يجب أن يكون قبل أو يساوي تاريخ النهاية." });
      return;
    }

    // استخراج teacher_id الخاص بالابن المختار
    const selectedStudent = students.find((s) => s.id === selectedStudentId);

    if (!selectedStudent || !selectedStudent.teacher_id) {
      setMessage({
        type: "error",
        text: "تعذر العثور على الأستاذ المسؤول عن هذا الطالب. يرجى التواصل مع الإدارة."
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // إدراج طلب الغياب داخل جدول absence_requests
      const { error: insertError } = await supabase.from("absence_requests").insert([
        {
          parent_id: parentId,
          student_id: selectedStudentId,
          teacher_id: selectedStudent.teacher_id, // ربطه بالأستاذ المسؤول تلقائياً
          start_date: startDate,
          end_date: endDate,
          reason: reason,
          status: "pending" // حالة الطلب المبدئية
        }
      ]);

      if (insertError) {
        throw insertError;
      }

      setMessage({
        type: "success",
        text: "تم إرسال إخطار الغياب بنجاح للأستاذ المسؤول."
      });

      // إعادة ضبط الحقول
      setSelectedStudentId("");
      setStartDate("");
      setEndDate("");
      setReason("");
    } catch (error: any) {
      console.error("Error submitting absence request:", error);
      setMessage({
        type: "error",
        text: error.message || "حدث خطأ أثناء إرسال الإخطار. يرجى المحاولة لاحقاً."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (roleLoading || (role !== "parent" && !roleLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]" dir="rtl">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#047857] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 font-medium">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#f8fafc] flex text-right font-sans relative">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden transition-opacity" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* الـ Sidebar الجانبي */}
      <aside className={`w-64 bg-[#064e3b] text-white p-6 flex flex-col justify-between fixed h-screen right-0 top-0 z-30 shadow-xl transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="space-y-8">
          <div className="flex items-center justify-between border-b border-white/10 pb-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🕌</span>
              <div>
                <h2 className="text-xl font-black tracking-wide">نور NOOR</h2>
                <p className="text-[10px] text-emerald-300">منصة إدارة المساجد والمدارس</p>
              </div>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-gray-300 hover:text-white text-xl p-1">✕</button>
          </div>

          <nav className="space-y-1">
            <a href="/parent" className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl text-gray-200 font-medium text-sm transition">
              <span>🏠</span> الرئيسية
            </a>
            <a href="/parent/register-child" className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl text-gray-200 font-medium text-sm transition">
              <span>➕</span> تسجيل ابن جديد
            </a>
            <a href="/parent/request-absence" className="flex items-center gap-3 px-4 py-3 bg-[#047857] rounded-xl font-bold text-sm shadow-sm">
              <span>📅</span> إخطار بصلب غياب
            </a>
          </nav>
        </div>

        <button
          onClick={async () => { await supabase.auth.signOut(); router.push("/"); }}
          className="flex items-center gap-3 px-4 py-3 hover:bg-red-900/30 text-red-200 font-bold text-sm transition rounded-xl w-full border-t border-white/5 pt-4"
        >
          <span>🚪</span> تسجيل الخروج
        </button>
      </aside>

      {/* المحتوى الرئيسي */}
      <main className="flex-1 lg:mr-64 p-4 md:p-8 overflow-y-auto min-h-screen w-full">
        {/* Header */}
        <header className="bg-white rounded-2xl p-4 mb-6 border border-gray-100 shadow-sm flex items-center justify-between">
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-700">☰</button>
          <h1 className="text-lg md:text-xl font-black text-gray-800 flex items-center gap-2">
            <span>📅</span> إرسال إخطار غياب طالب
          </h1>
          <button
            onClick={() => router.push("/parent")}
            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-xl font-bold transition"
          >
            رجوع للوحة التحكم →
          </button>
        </header>

        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm">
            <div className="mb-6 pb-4 border-b border-gray-100">
              <h2 className="text-xl font-black text-gray-800">إستمارة مبرر الغياب</h2>
              <p className="text-gray-500 text-xs mt-1">
                إعلام معلم الحلقة مسبقاً بفترة غياب الابن مع إرفاق سبب الغياب ليتم توثيقه لدى الأستاذ.
              </p>
            </div>

            {/* تنبيهات النجاح أو الخطأ */}
            {message && (
              <div
                className={`p-4 rounded-2xl mb-6 text-xs font-bold border ${
                  message.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-red-50 text-red-800 border-red-200"
                }`}
              >
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 1️⃣ اختيار الابن */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  اختر الابن المعني بالغياب <span className="text-red-500">*</span>
                </label>

                {loadingStudents ? (
                  <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-400 animate-pulse">
                    جاري جلب قائمة الأبناء...
                  </div>
                ) : students.length === 0 ? (
                  <div className="p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-medium">
                    لا يوجد أبناء مسجلون ومقبولون حالياً لإرسال طلب غياب لهم.
                  </div>
                ) : (
                  <select
                    required
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full bg-gray-50 text-sm text-gray-800 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:bg-white focus:border-[#047857] focus:ring-1 focus:ring-[#047857] transition cursor-pointer"
                  >
                    <option value="">-- اضغط لاختيار الطالب --</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.full_name} {student.level ? `(${student.level})` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* 2️⃣ تواريخ الغياب (بداية ونهاية) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">
                    بداية الغياب (من) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-gray-50 text-sm text-gray-800 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:bg-white focus:border-[#047857] focus:ring-1 focus:ring-[#047857] transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">
                    نهاية الغياب (إلى) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-gray-50 text-sm text-gray-800 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:bg-white focus:border-[#047857] focus:ring-1 focus:ring-[#047857] transition"
                  />
                </div>
              </div>

              {/* 3️⃣ سبب الغياب */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  سبب الغياب <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="مثال: ظروف صحية / سفر عائلي / ارتباطات امتحانات مدروسة..."
                  className="w-full bg-gray-50 text-sm text-gray-800 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:bg-white focus:border-[#047857] focus:ring-1 focus:ring-[#047857] transition resize-none"
                />
              </div>

              {/* زر الإرسال */}
              <button
                type="submit"
                disabled={isSubmitting || loadingStudents || students.length === 0}
                className="w-full mt-4 bg-[#047857] hover:bg-[#064e3b] text-white font-bold py-3.5 px-6 rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>جاري إرسال الإخطار...</span>
                  </>
                ) : (
                  <>
                    <span>📨</span> إرسال الإخطار للمعلم
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
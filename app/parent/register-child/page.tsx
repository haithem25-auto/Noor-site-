"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/lib/supabase";

export default function RegisterChildPage() {
  const router = useRouter();
  const { role, loading: roleLoading } = useUserRole();

  // states الخاصة بالاستمارة
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [level, setLevel] = useState("");
  const [selectedHalaqaId, setSelectedHalaqaId] = useState("");

  // states البيانات المجلوبة من السيرفر
  const [halaqat, setHalaqat] = useState<any[]>([]);
  const [parentMosqueId, setParentMosqueId] = useState<string | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);

  // حالات التحميل والرسائل
  const [loadingData, setLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (roleLoading || role !== "parent") return;

    async function fetchParentInfoAndHalaqat() {
      try {
        setLoadingData(true);

        // 1️⃣ جلب بيانات المستخدم الحالية
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          router.push("/");
          return;
        }

        setParentId(user.id);

        // 2️⃣ جلب mosque_id الخاص بولي الأمر من جدول profiles
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("mosque_id")
          .eq("id", user.id)
          .single();

        if (profileError || !profileData?.mosque_id) {
          setMessage({
            type: "error",
            text: "لم يتم العثور على المسجد المرتبط بحسابك. يرجى التواصل مع الإدارة."
          });
          return;
        }

        const mosqueId = profileData.mosque_id;
        setParentMosqueId(mosqueId);

        // 3️⃣ جلب الحلقات التابعة لشهور/مسجد هذا الولي مع معرف المعلم المسؤول
        const { data: halaqatData, error: halaqatError } = await supabase
          .from("halaqat")
          .select("id, name, teacher_id, level")
          .eq("mosque_id", mosqueId);

        if (halaqatError) {
          console.error("Error fetching halaqat:", halaqatError);
        } else if (halaqatData) {
          setHalaqat(halaqatData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingData(false);
      }
    }

    fetchParentInfoAndHalaqat();
  }, [role, roleLoading, router]);

  // 📝 معالجة إرسال الاستمارة
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!fullName || !birthDate || !level || !selectedHalaqaId) {
      setMessage({ type: "error", text: "يرجى ملء جميع الحقول المطلوبة." });
      return;
    }

    // البحث عن الحلقة المختارة لاستخراج teacher_id
    const selectedHalaqa = halaqat.find((h) => h.id === selectedHalaqaId);

    if (!selectedHalaqa) {
      setMessage({ type: "error", text: "الحلقة المختارة غير صالحة." });
      return;
    }

    try {
      setIsSubmitting(true);

      // إدراج البيانات مباشرة داخل جدول students
      const { error: insertError } = await supabase.from("students").insert([
        {
          full_name: fullName,
          birth_date: birthDate,
          level: level,
          mosque_id: parentMosqueId,
          teacher_id: selectedHalaqa.teacher_id, // ربطه تلقائياً بالأستاذ المسؤول عن الحلقة
          parent_id: parentId,
          status: "pending", // يرسل الطلب بحالة "قيد الانتظار" ليعتمده الأستاذ
          halaqa_id: selectedHalaqaId
        }
      ]);

      if (insertError) {
        throw insertError;
      }

      setMessage({
        type: "success",
        text: "تم إرسال طلب تسجيل الابن بنجاح! سينتظر الطلب موافقة الأستاذ المسؤول."
      });

      // تفريغ الحقول بعد النجاح
      setFullName("");
      setBirthDate("");
      setLevel("");
      setSelectedHalaqaId("");
    } catch (error: any) {
      console.error("Error registering student:", error);
      setMessage({
        type: "error",
        text: error.message || "حدث خطأ أثناء إرسال الطلب. يرجى المحاولة لاحقاً."
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
            <a href="/parent/register-child" className="flex items-center gap-3 px-4 py-3 bg-[#047857] rounded-xl font-bold text-sm shadow-sm">
              <span>➕</span> تسجيل ابن جديد
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
            <span>📝</span> طلب تسجيل ابن في حلقة قرأنية
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
              <h2 className="text-xl font-black text-gray-800">استمارة التسجيل</h2>
              <p className="text-gray-500 text-xs mt-1">
                قم بتعبئة بيانات الابن واختيار الحلقة المناسبة في مسجدك ليتم إرسال الطلب مباشرة للأستاذ المسؤول.
              </p>
            </div>

            {/* عرض التنبيهات */}
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
              {/* 1️⃣ الاسم الكامل */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  الاسم الكامل للابن <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="مثال: محمد عبد الرحمن"
                  className="w-full bg-gray-50 text-sm text-gray-800 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:bg-white focus:border-[#047857] focus:ring-1 focus:ring-[#047857] transition"
                />
              </div>

              {/* 2️⃣ تاريخ الميلاد */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  تاريخ الميلاد <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full bg-gray-50 text-sm text-gray-800 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:bg-white focus:border-[#047857] focus:ring-1 focus:ring-[#047857] transition"
                />
              </div>

              {/* 3️⃣ المستوى الحالي */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  المستوى الحالي (مقدار الحفظ) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  placeholder="مثال: 12 حزب / 5 أجزاء / المبتدئين"
                  className="w-full bg-gray-50 text-sm text-gray-800 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:bg-white focus:border-[#047857] focus:ring-1 focus:ring-[#047857] transition"
                />
              </div>

              {/* 4️⃣ اختيار الحلقة */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  اختر الحلقة القرأنية المتوفرة في المسجد <span className="text-red-500">*</span>
                </label>

                {loadingData ? (
                  <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-400 animate-pulse">
                    جاري جلب الحلقات المتوفرة من المسجد...
                  </div>
                ) : halaqat.length === 0 ? (
                  <div className="p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-medium">
                    لا توجد حلقات مسجلة حالياً في هذا المسجد.
                  </div>
                ) : (
                  <select
                    required
                    value={selectedHalaqaId}
                    onChange={(e) => setSelectedHalaqaId(e.target.value)}
                    className="w-full bg-gray-50 text-sm text-gray-800 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:bg-white focus:border-[#047857] focus:ring-1 focus:ring-[#047857] transition cursor-pointer"
                  >
                    <option value="">-- اضغط لاختيار الحلقة --</option>
                    {halaqat.map((halaqa) => (
                      <option key={halaqa.id} value={halaqa.id}>
                        {halaqa.name} {halaqa.level ? `(${halaqa.level})` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* زر الإرسال */}
              <button
                type="submit"
                disabled={isSubmitting || loadingData || halaqat.length === 0}
                className="w-full mt-4 bg-[#047857] hover:bg-[#064e3b] text-white font-bold py-3.5 px-6 rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>جاري إرسال الطلب...</span>
                  </>
                ) : (
                  <>
                    <span>✉️</span> إرسال طلب التسجيل للأستاذ
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
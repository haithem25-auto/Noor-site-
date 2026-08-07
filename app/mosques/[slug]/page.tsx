"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link"; 
import { supabase } from "@/lib/supabase";

interface JoinPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default function JoinRequestPage({ params }: JoinPageProps) {
  const router = useRouter();
  const { slug } = use(params);

  // التبويبات الثلاثة: parent = طلب ولي أمر، teacher = طلب معلم، goer = رائد مسجد
  const [activeTab, setActiveTab] = useState<"parent" | "teacher" | "goer">("parent");

  // States الأساسية
  const [mosque, setMosque] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  // 1. خاص باستمارة إنشاء حساب ولي الأمر
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPassword, setParentPassword] = useState("");

  // 2. خاص باستمارة إنشاء حساب المعلم
  const [teacherName, setTeacherName] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");

  // 3. خاص باستمارة رائد المسجد
  const [goerName, setGoerName] = useState("");
  const [goerEmail, setGoerEmail] = useState("");

  useEffect(() => {
    async function fetchMosqueData() {
      try {
        setLoading(true);
        const { data: mosqueData, error: mosqueErr } = await supabase
          .from("mosques")
          .select("id, name")
          .eq("slug", slug)
          .maybeSingle(); // استخدام maybeSingle لمنع انهيار الصفحة إذا لم يجد السجل

        if (mosqueErr || !mosqueData) {
          setMosque(null);
          return;
        }
        setMosque(mosqueData);
      } catch (err) {
        console.error("Error loading mosque:", err);
      } finally {
        setLoading(false);
      }
    }
    if (slug) fetchMosqueData();
  }, [slug]);

  // دالة مشتركة لتسجيل الحسابات
  const handleAuthRegister = async (
    e: React.FormEvent, 
    fullName: string, 
    email: string, 
    password: string, 
    targetRole: "parent" | "teacher"
  ) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });

    if (!fullName.trim() || !email.trim() || !password) {
      setMessage({ text: "يرجى ملء جميع الحقول المطلوبة.", type: "error" });
      return;
    }

    try {
      setSubmitting(true);

      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            full_name: fullName.trim(),
            role: targetRole,
          }
        }
      });

      if (authErr) throw authErr;
      if (!authData.user) throw new Error("فشل إنشاء الحساب.");

      const { error: profileErr } = await supabase
        .from("profiles")
        .insert({
          id: authData.user.id,
          full_name: fullName.trim(),
          email: email.trim(),
          role: targetRole,
          status: "pending", 
          mosque_id: mosque.id, 
          mosque_name: mosque.name
        });

      if (profileErr) throw profileErr;

      const successRoleText = targetRole === "parent" ? "ولي أمر" : "معلم معتمد";
      setMessage({ 
        text: `🎉 تم تقديم طلب تسجيلك كـ ${successRoleText} بنظام نور بنجاح! طلبك الآن قيد المراجعة والتدقيق من قِبل إمام المسجد، وسيتم تفعيل لوحتك الخاصة فور قبوله.`, 
        type: "success" 
      });

      if (targetRole === "parent") { setParentName(""); setParentEmail(""); setParentPassword(""); }
      if (targetRole === "teacher") { setTeacherName(""); setTeacherEmail(""); setTeacherPassword(""); }

    } catch (err: any) {
      console.error("Registration Error:", err);
      setMessage({ text: `فشل إرسال طلب التسجيل: ${err.message || "حدث خطأ غير متوقع"}`, type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  // دالة الاشتراك السريع لرواد المسجد
 const handleGoerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });

    if (!goerName.trim() || !goerEmail.trim()) {
      setMessage({ text: "يرجى ملء جميع الحقول المطلوبة للاشتراك.", type: "error" });
      return;
    }

    try {
      setSubmitting(true);
      const { error: insertErr } = await supabase
        .from("masjid_goers") // تم التغيير إلى الجدول الجديد
        .insert({
          full_name: goerName.trim(),
          email: goerEmail.trim(),
          mosque_id: mosque.id,
          mosque_name: mosque.name, 
        });

      if (insertErr) throw insertErr;

      setMessage({ text: "🔔 تم اشتراكك بنجاح! ستصلك إشعارات التبرعات والنشاطات من الإمام مباشرة على بريدك الإلكتروني.", type: "success" });
      setGoerName("");
      setGoerEmail("");
    } catch (err: any) {
      console.error("Subscriber Error:", err);
      setMessage({ text: `فشل الاشتراك: ${err.message || "حدث خطأ غير متوقع"}`, type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-green-700 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 font-medium">جاري تهيئة منصة نور المصلين الحية...</p>
        </div>
      </div>
    );
  }

  // الحماية: عرض واجهة مخصصة في حال كان الـ slug غير موجود بقاعدة البيانات أو تم إدخال رابط خاطئ
  if (!mosque) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6 text-center" dir="rtl">
        <div className="bg-white rounded-3xl p-8 shadow-xl max-w-md border border-slate-100 space-y-4">
          <span className="text-4xl block">⚠️</span>
          <h1 className="text-xl font-black text-slate-900">المقر غير مسجل أو الرابط غير صحيح</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            عذراً، الرابط المستخدم لا يحتوي على المعرّف الفريد الخاص بالمسجد أو المؤسسة القرآنية المطلوبة. يرجى إعادة مسح الـ QR Code الرسمي للمسجد.
          </p>
          <Link href="/login" className="block w-full bg-green-700 text-white font-bold py-3 rounded-2xl text-sm transition-colors hover:bg-green-800">
            العودة لصفحة تسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] py-6 px-4 sm:py-12 sm:px-6 lg:px-8" dir="rtl">
      <div className="max-w-md mx-auto bg-white rounded-3xl border border-gray-100 shadow-xl p-5 sm:p-8">
        
        <div className="text-center mb-6">
          <span className="text-2xl">🕌</span>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 mt-2">منصة نور للمساجد و المدارس القرانية </h1>
          <p className="text-sm text-gray-500 mt-1">مسجد: <span className="text-green-700 font-bold">{mosque?.name}</span></p>
        </div>

        {/* أزرار التبديل الثلاثية */}
        <div className="grid grid-cols-3 gap-1 p-1.5 bg-gray-100 rounded-2xl mb-6 text-[11px] sm:text-xs">
          <button
            type="button"
            onClick={() => { setActiveTab("parent"); setMessage({ text: "", type: "" }); }}
            className={`py-2.5 font-bold rounded-xl transition-all ${activeTab === "parent" ? "bg-white text-green-700 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
          >
            👨‍👩‍👦 حساب ولي أمر
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("teacher"); setMessage({ text: "", type: "" }); }}
            className={`py-2.5 font-bold rounded-xl transition-all ${activeTab === "teacher" ? "bg-white text-green-700 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
          >
            👨‍🏫 حساب معلم
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("goer"); setMessage({ text: "", type: "" }); }}
            className={`py-2.5 font-bold rounded-xl transition-all ${activeTab === "goer" ? "bg-white text-green-700 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
          >
            🔔 إشعارات المسجد
          </button>
        </div>

        {message.text && (
          <div className={`p-4 rounded-xl text-sm font-medium mb-6 text-center ${
            message.type === "success" ? "bg-green-50 text-green-800 border border-green-100" : "bg-red-50 text-red-800 border border-red-100"
          }`}>
            {message.text}
          </div>
        )}

        {/* 1. واجهة طلب تسجيل حساب ولي الأمر */}
        {activeTab === "parent" && (
          <form onSubmit={(e) => handleAuthRegister(e, parentName, parentEmail, parentPassword, "parent")} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">الاسم الكامل لولي الأمر:</label>
              <input
                type="text"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                placeholder="اكتب اسمك الكامل ثلاثياً..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-600 text-sm text-gray-900 font-medium"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">البريد الإلكتروني الحقيقي:</label>
              <input
                type="email"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                placeholder="parent@example.com"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-600 text-left dir-ltr text-sm text-gray-900 font-medium"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">كلمة مرور الحساب:</label>
              <input
                type="password"
                value={parentPassword}
                onChange={(e) => setParentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-600 text-left dir-ltr text-sm text-gray-900 font-medium"
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3 px-6 rounded-2xl shadow-md transition-all text-sm disabled:opacity-50"
            >
              {submitting ? "جاري إرسال طلب الحساب..." : "ارسال طلب تسجيل ولي أمر"}
            </button>
          </form>
        )}

        {/* 2. واجهة طلب تسجيل حساب معلم جديد */}
        {activeTab === "teacher" && (
          <form onSubmit={(e) => handleAuthRegister(e, teacherName, teacherEmail, teacherPassword, "teacher")} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">اسم الشيخ / المعلم الكامل:</label>
              <input
                type="text"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="اكتب الاسم الكامل للمعلم..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-600 text-sm text-gray-900 font-medium"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">البريد الإلكتروني المهني:</label>
              <input
                type="email"
                value={teacherEmail}
                onChange={(e) => setTeacherEmail(e.target.value)}
                placeholder="teacher@example.com"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-600 text-left dir-ltr text-sm text-gray-900 font-medium"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">كلمة مرور الحساب:</label>
              <input
                type="password"
                value={teacherPassword}
                onChange={(e) => setTeacherPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-600 text-left dir-ltr text-sm text-gray-900 font-medium"
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3 px-6 rounded-2xl shadow-md transition-all text-sm disabled:opacity-50"
            >
              {submitting ? "جاري إرسال طلب الإعتماد..." : "ارسال طلب إعتماد كمعلم"}
            </button>
          </form>
        )}

        {/* 3. واجهة رائد المسجد */}
        {activeTab === "goer" && (
          <form onSubmit={handleGoerSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">الاسم الكامل:</label>
              <input
                type="text"
                value={goerName}
                onChange={(e) => setGoerName(e.target.value)}
                placeholder="اكتب اسمك الكريم هنا..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-600 text-sm text-gray-900 font-medium"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">البريد الإلكتروني للتوصل:</label>
              <input
                type="email"
                value={goerEmail}
                onChange={(e) => setGoerEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-600 text-left dir-ltr text-sm text-gray-900 font-medium"
                required
              />
              <p className="text-[11px] text-gray-400 mt-1">ستصلك حملات المسجد البريدية والتبرعات والنشاطات فور بثها.</p>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-2xl shadow-md transition-all text-sm disabled:opacity-50"
            >
              {submitting ? "جاري معالجة الاشتراك..." : "🔔 تفعيل الاشتراك البريدي السريع"}
            </button>
          </form>
        )}

        {/* رابط التوجيه إلى صفحة تسجيل الدخول الموحدة للمسجلين مسبقاً */}
        <div className="mt-6 pt-4 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-500">
            أملك حساباً بالفعل؟{" "}
            <Link 
              href="/login" 
              className="text-green-700 hover:text-green-800 font-bold underline transition-all"
            >
              تسجيل الدخول
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  // التسمية في الواجهة، بينما القيمة المُرسلة لقاعدة البيانات ستكون دائماً "imam"
  const [uiRole, setUiRole] = useState("إمام مسجد");
  
  // حالات تفاصيل المؤسسة
  const [mosqueName, setMosqueName] = useState("");
  const [mosqueCity, setMosqueCity] = useState(""); // الولاية
  const [mosqueMunicipality, setMosqueMunicipality] = useState(""); // البلدية
  const [mosqueAddress, setMosqueAddress] = useState(""); // العنوان التفصيلي

  // حالات نظام الخطوات
  const [currentStep, setCurrentStep] = useState(1);
  const [geoError, setGeoError] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);

  // دالة تحويل الحروف العربية إلى إنجليزية للـ Slug
  const arabicToLatin = (text: string): string => {
    const map: { [key: string]: string } = {
      أ: "a", إ: "a", آ: "a", ا: "a", ب: "b", ت: "t", ث: "th", ج: "j",
      ح: "h", خ: "kh", د: "d", ذ: "dh", ر: "r", ز: "z", س: "s", ش: "sh",
      ص: "s", ض: "d", ط: "t", ظ: "z", ع: "a", غ: "gh", f: "f", ف: "f", ق: "q",
      ك: "k", ل: "l", م: "m", ن: "n", هـ: "h", ه: "h", و: "w", ي: "y",
      ى: "a", ة: "h", ء: "a", ئ: "y", ؤ: "w", " ": "-"
    };

    return text
      .split("")
      .map((char) => map[char] || char)
      .join("");
  };

  const generateSlug = (name: string): string => {
    const latinText = arabicToLatin(name);
    const cleanSlug = latinText
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");

    const randomId = Math.random().toString(36).substring(2, 6);
    const baseName = cleanSlug || "mosque";
    return `${baseName}-${randomId}`;
  };

  const handleFirstStepSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !phone.trim() || !password) {
      alert("يرجى ملء كافة الحقول الأساسية ورقم الهاتف أولاً.");
      return;
    }
    setCurrentStep(2);
  };

  // عملية التسجيل
  async function handleRegister() {
    if (!mosqueName.trim() || !mosqueCity.trim() || !mosqueMunicipality.trim() || !mosqueAddress.trim()) {
      setGeoError("يرجى ملء كافة حقول المؤسسة (الاسم، الولاية، البلدية، العنوان التفصيلي).");
      return;
    }

    try {
      setRegisterLoading(true);
      setGeoError("");

      // 1. إنشاء حساب المستخدم في نظام المصادقة (Auth)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("فشل إنشاء حساب المستخدم في نظام المصادقة.");

      const userId = authData.user.id;
      const fullFormattedAddress = `${mosqueCity}، ${mosqueMunicipality}، ${mosqueAddress}`;

      // 2. إدخال المستخدم في جدول profiles مع تثبيت role كـ "imam" بناءً على طلبك
      const { error: profileInitialErr } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          full_name: fullName.trim(),
          role: "imam", // الثلاثة لديهم نفس الدور في قاعدة البيانات
          email: email.trim(),
          phone: phone.trim(),
          mosque_id: null,
          mosque_name: mosqueName.trim(),
          status: "pending",
        });

      if (profileInitialErr) throw profileInitialErr;

      // 3. توليد الـ slug
      const generatedSlug = generateSlug(mosqueName.trim());

      // 4. إدخال المؤسسة في جدول mosques
      const { data: mosqueData, error: mosqueInsertError } = await supabase
        .from("mosques")
        .insert({
          name: mosqueName.trim(),
          city: mosqueCity.trim(),
          address: fullFormattedAddress,
          formatted_address: fullFormattedAddress,
          slug: generatedSlug,
          imam_id: userId,
        })
        .select("id")
        .single();

      if (mosqueInsertError) {
        await supabase.from("profiles").delete().eq("id", userId);
        throw mosqueInsertError;
      }

      const newMosqueId = mosqueData.id;

      // 5. تحديث جدول profiles بربط الـ mosque_id
      const { error: profileUpdateErr } = await supabase
        .from("profiles")
        .update({ mosque_id: newMosqueId })
        .eq("id", userId);

      if (profileUpdateErr) throw profileUpdateErr;

      router.push("/dashboard");

    } catch (err: any) {
      console.error("خطأ أثناء عملية التسجيل:", err);
      setGeoError(`فشل إتمام عملية التسجيل: ${err.message || "حدث خطأ داخلي في النظام"}`);
    } finally {
      setRegisterLoading(false);
    }
  }

  const getInstitutionLabel = () => {
    if (uiRole === "شيخ زاوية") return "اسم الزاوية الرسمي:";
    if (uiRole === "مدير مدرسة قرآنية") return "اسم المدرسة القرآنية الرسمي:";
    return "اسم المسجد الرسمي:";
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6 text-slate-800" dir="rtl">
      <div className="bg-white rounded-3xl p-8 shadow-xl w-full max-w-xl border border-slate-100 transition-all duration-300">
        
        {/* الخطوة الأولى */}
        {currentStep === 1 && (
          <form onSubmit={handleFirstStepSubmit}>
            <h1 className="text-3xl font-black mb-2 text-center text-slate-900">
              إنشاء حساب جديد
            </h1>
            <p className="text-center text-sm text-slate-500 mb-8">
              انضم إلى منصة نور لإدارة وتوسيع نطاق التعليم القرآني
            </p>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="الاسم الكامل للمشرف"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full border border-slate-200 rounded-2xl px-4 h-14 bg-white text-slate-900 focus:outline-none focus:border-[#047857]"
                required
              />

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 mr-2">
                  نوع صفة الاشتراك والتسجيل:
                </label>
                <select
                  value={uiRole}
                  onChange={(e) => setUiRole(e.target.value)}
                  className="w-full border border-slate-200 rounded-2xl px-4 h-14 bg-white text-slate-900 focus:outline-none focus:border-[#047857] font-semibold"
                >
                  <option value="إمام مسجد">إمام مسجد</option>
                  <option value="شيخ زاوية">شيخ زاوية</option>
                  <option value="مدير مدرسة قرآنية">مدير مدرسة قرآنية</option>
                </select>
              </div>

              <input
                type="email"
                placeholder="البريد الإلكتروني"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-slate-200 rounded-2xl px-4 h-14 bg-white text-slate-900 focus:outline-none focus:border-[#047857]"
                required
              />

              <input
                type="tel"
                placeholder="رقم الهاتف (مثال: 0550000000)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-slate-200 rounded-2xl px-4 h-14 bg-white text-slate-900 focus:outline-none focus:border-[#047857]"
                required
              />

              <input
                type="password"
                placeholder="كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-slate-200 rounded-2xl px-4 h-14 bg-white text-slate-900 focus:outline-none focus:border-[#047857]"
                required
              />

              <button
                type="submit"
                className="w-full bg-[#047857] hover:bg-[#065f46] text-white h-14 rounded-2xl font-bold transition-colors shadow-sm mt-4 flex items-center justify-center gap-2"
              >
                التالي (إدخال تفاصيل المقر والمؤسسة) ──►
              </button>
            </div>
          </form>
        )}

        {/* الخطوة الثانية */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900">
                بيانات المؤسسة أو المقر
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                يرجى إدخال اسم المقر والبيانات الجغرافية بدقة 🏫
              </p>
            </div>

            {geoError && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-800 text-sm font-semibold text-center">
                {geoError}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">
                  {getInstitutionLabel()}
                </label>
                <input
                  type="text"
                  placeholder="مثال: مسجد الإحسان / زاوية سيدي أحمد"
                  value={mosqueName}
                  onChange={(e) => setMosqueName(e.target.value)}
                  className="w-full border border-slate-200 rounded-2xl px-4 h-14 bg-white text-slate-900 focus:outline-none focus:border-[#047857]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-700">
                    الولاية:
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: سطيف"
                    value={mosqueCity}
                    onChange={(e) => setMosqueCity(e.target.value)}
                    className="w-full border border-slate-200 rounded-2xl px-4 h-14 bg-white text-slate-900 focus:outline-none focus:border-[#047857]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-700">
                    البلدية:
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: العلمة"
                    value={mosqueMunicipality}
                    onChange={(e) => setMosqueMunicipality(e.target.value)}
                    className="w-full border border-slate-200 rounded-2xl px-4 h-14 bg-white text-slate-900 focus:outline-none focus:border-[#047857]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">
                  العنوان التفصيلي:
                </label>
                <input
                  type="text"
                  placeholder="مثال: حي 500 مسكن، بجانب السوق المركزي"
                  value={mosqueAddress}
                  onChange={(e) => setMosqueAddress(e.target.value)}
                  className="w-full border border-slate-200 rounded-2xl px-4 h-14 bg-white text-slate-900 focus:outline-none focus:border-[#047857]"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <button
                type="button"
                onClick={handleRegister}
                disabled={
                  !mosqueName.trim() ||
                  !mosqueCity.trim() ||
                  !mosqueMunicipality.trim() ||
                  !mosqueAddress.trim() ||
                  registerLoading
                }
                className="flex-1 bg-[#047857] hover:bg-[#065f46] text-white h-14 rounded-2xl font-bold transition-colors shadow-sm disabled:opacity-50 text-sm sm:text-base"
              >
                {registerLoading
                  ? "جاري إكمال وتأمين الحساب..."
                  : "تأكيد واعتماد الحساب 🔐"}
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                disabled={registerLoading}
                className="px-6 h-14 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors text-sm sm:text-base"
              >
                السابق
              </button>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
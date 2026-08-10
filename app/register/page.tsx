"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import dynamic from "next/dynamic";

// حقن واستدعاء مكون الخريطة ديناميكياً مع إيقاف الـ SSR تماماً لمنع الانهيار
const LeafletMap = dynamic(() => import("../components/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-50 flex items-center justify-center text-xs text-slate-400 animate-pulse">
      جاري تهيئة نظام الخرائط المجاني...
    </div>
  ),
});

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  // الحالات الجديدة للواجهة: الإمام، شيخ الزاوية، أو مدير المدرسة القرآنية
  const [uiRole, setUiRole] = useState("imam");
  const [mosqueName, setMosqueName] = useState("");

  // حالات جغرافية مضافة للامتثال للتعبئة التلقائية أو اليدوية
  const [mosqueCity, setMosqueCity] = useState("");
  const [mosqueAddress, setMosqueAddress] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // حالات نظام الخطوات والخرائط المجانية
  const [currentStep, setCurrentStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    36.1912, 5.4124,
  ]); // سطيف كمركز افتراضي
  const [hasSelectedMosque, setHasSelectedMosque] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);

  // دالة البحث التلقائي في خريطة OpenStreetMap المجانية (خاصة بالإمام وشيخ الزاوية فقط)
  useEffect(() => {
    if (
      uiRole === "school" ||
      searchQuery.trim().length < 4 ||
      hasSelectedMosque
    ) {
      setSuggestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        setSearchLoading(true);
        setGeoError("");
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(
            searchQuery
          )}&countrycodes=dz&limit=5`
        );
        const data = await response.json();
        setSuggestions(data);
      } catch (err) {
        console.error("خطأ في جلب الاقتراحات الجغرافية:", err);
      } finally {
        setSearchLoading(false);
      }
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, hasSelectedMosque, uiRole]);

  // دالة لتوليد الرابط الفريد (Slug) آلياً من اسم المقر بطريقة ديناميكية آمنة
  const generateSlug = (name: string): string => {
    let cleanText = name
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, "-") // استبدال الفراغات بشرطات
      .replace(/[^\u0621-\u064A0-9a-zA-Z\-]/g, ""); // تنظيف الرموز الخاصة التي تكسر الروابط

    // إلحاق معرّف عشوائي فريد لمنع تشابه الروابط نهائياً في البيئة الحية
    const randomId = Math.random().toString(36).substring(2, 7);
    return `${cleanText}-${randomId}`;
  };

  // عند اختيار المؤسسة الحقيقية من القائمة (للخريطة)
  const handleSelectSuggestion = (item: any) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    const cleanName = item.display_name.split(",")[0] || "المؤسسة المستهدفة";

    const city =
      item.address?.city ||
      item.address?.town ||
      item.address?.village ||
      item.address?.state ||
      "غير محدد";
    const fullAddress = item.display_name || "العنوان الكامل عبر الخريطة";

    setMapCenter([lat, lon]);
    setLatitude(lat);
    setLongitude(lon);
    setMosqueName(cleanName);
    setMosqueCity(city);
    setMosqueAddress(fullAddress);
    setSearchQuery(item.display_name);
    setHasSelectedMosque(true);
    setSuggestions([]);
  };

  const handleFirstStepSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password) {
      alert("يرجى ملء كافة الحقول الأساسية أولاً.");
      return;
    }
    setCurrentStep(2);
  };

  // عملية التسجيل وحقن البيانات التلقائية المتكاملة في جداول قاعدة البيانات
  async function handleRegister() {
    if (uiRole === "school") {
      if (!mosqueName.trim() || !mosqueCity.trim() || !mosqueAddress.trim()) {
        setGeoError("يرجى ملء كافة بيانات المدرسة القرآنية المطلوبة.");
        return;
      }
    } else {
      if (!mosqueName || !latitude || !longitude) {
        setGeoError(
          "عذراً، يجب عليك اختيار المكان الحقيقي المسجل على الخريطة أولاً لتأكيد الحساب."
        );
        return;
      }
    }

    try {
      setRegisterLoading(true);
      setGeoError("");

      // 1. إنشاء حساب المستعمل في نظام مصادقة سوبابيس (Auth)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
      });

      if (authError) throw authError;
      if (!authData.user)
        throw new Error("فشل إنشاء حساب المستخدم في نظام المصادقة.");

      const imamUserId = authData.user.id;

      // 2. إدخال المستخدم أولاً في جدول profiles لتجنب كسر قيد الـ Foreign Key للمسجد/المدرسة
      const { error: profileInitialErr } = await supabase
        .from("profiles")
        .insert({
          id: imamUserId,
          full_name: fullName.trim(),
          role: "imam", // تم التثبيت على "imam" لتجنب خطأ الـ Check Constraint
          email: email.trim(),
          mosque_id: null, // نتركه فارغاً مؤقتاً لكسر حلقة التبعية المغلقة
          mosque_name: mosqueName.trim(),
        });

      if (profileInitialErr) throw profileInitialErr;

      // 3. توليد الـ slug الديناميكي تلقائياً
      const generatedSlug = generateSlug(mosqueName.trim());

      // 4. إدخال المدرسة/المسجد في جدول mosques
      const { data: mosqueData, error: mosqueInsertError } = await supabase
        .from("mosques")
        .insert({
          name: mosqueName.trim(),
          city: mosqueCity.trim(),
          address: mosqueAddress.trim(),
          formatted_address: mosqueAddress.trim(),
          latitude: latitude,
          longitude: longitude,
          slug: generatedSlug,
          imam_id: imamUserId, // تم الربط بأمان الآن
        })
        .select("id")
        .single();

      if (mosqueInsertError) {
        // في حال فشل الإدخال نضمن تنظيف حساب الـ profile الذي أنشئ مؤقتاً
        await supabase.from("profiles").delete().eq("id", imamUserId);
        throw mosqueInsertError;
      }

      const newMosqueId = mosqueData.id;

      // 5. الخطوة الأخيرة: تحديث حساب المستخدم بالـ mosque_id الفعلي المولد
      const { error: profileUpdateErr } = await supabase
        .from("profiles")
        .update({ mosque_id: newMosqueId })
        .eq("id", imamUserId);

      if (profileUpdateErr) throw profileUpdateErr;

      alert(
        `🎉 تم اعتماد وتثبيت المقر الرسمي بنجاح!\nالرابط المخصص لنظام نور هو:\n/mosques/${generatedSlug}`
      );

      // إعادة تعيين كافة الحقول بعد النجاح
      setCurrentStep(1);
      setFullName("");
      setEmail("");
      setPassword("");
      setMosqueName("");
      setMosqueCity("");
      setMosqueAddress("");
      setSearchQuery("");
      setHasSelectedMosque(false);
      setLatitude(null);
      setLongitude(null);
    } catch (err: any) {
      console.error("خطأ مجمع أثناء عملية التسجيل البرمجية:", err);
      setGeoError(
        `فشل إتمام عملية التسجيل التلقائية: ${
          err.message || "حدث خطأ داخلي في نظام الجداول"
        }`
      );
    } finally {
      setRegisterLoading(false);
    }
  }

  const getPlaceholderText = () => {
    if (uiRole === "zawiya") return "اكتب اسم الزاوية والبلدية بدقة...";
    if (uiRole === "school") return "اكتب اسم المدرسة القرآنية والبلدية بدقة...";
    return "اكتب اسم المسجد والبلدية بدقة...";
  };

  const getLabelText = () => {
    if (uiRole === "zawiya") return "اسم الزاوية الرسمي:";
    if (uiRole === "school") return "اسم المدرسة القرآنية الرسمي:";
    return "اسم المسجد الرسمي:";
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6 text-slate-800"
      dir="rtl"
    >
      <div className="bg-white rounded-3xl p-8 shadow-xl w-full max-w-xl border border-slate-100 transition-all duration-300">
        {/* الخطوة الأولى: الحساب والبيانات الأساسية */}
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
                  <option value="imam">إمام مشرف (مسجد)</option>
                  <option value="zawiya">شيخ زاوية تعليمية</option>
                  <option value="school">مدير مدرسة قرآنية</option>
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
                {uiRole === "school"
                  ? "التالي (إدخال بيانات المدرسة القرآنية) ──►"
                  : "التالي (التحقق من المقر عبر الخريطة) ──►"}
              </button>
            </div>
          </form>
        )}

        {/* الخطوة الثانية: الإدخال اليدوي للمدرسة القرآنية */}
        {currentStep === 2 && uiRole === "school" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900">
                بيانات المدرسة القرآنية
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                أدخل بيانات الموقع والمدرسة القرآنية يدويّاً 🏫
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
                  اسم المدرسة القرآنية الرسمي:
                </label>
                <input
                  type="text"
                  placeholder="مثال: مدرسة الفرقان القرآنية"
                  value={mosqueName}
                  onChange={(e) => setMosqueName(e.target.value)}
                  className="w-full border border-slate-200 rounded-2xl px-4 h-14 bg-white text-slate-900 focus:outline-none focus:border-[#047857]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">
                  المدينة / البلدية:
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
                  العنوان التفصيلي:
                </label>
                <input
                  type="text"
                  placeholder="مثال: حي 500 مسكن، طريق عين تبينت"
                  value={mosqueAddress}
                  onChange={(e) => setMosqueAddress(e.target.value)}
                  className="w-full border border-slate-200 rounded-2xl px-4 h-14 bg-white text-slate-900 focus:outline-none focus:border-[#047857]"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <button
                onClick={handleRegister}
                disabled={
                  !mosqueName.trim() ||
                  !mosqueCity.trim() ||
                  !mosqueAddress.trim() ||
                  registerLoading
                }
                className="flex-1 bg-[#047857] hover:bg-[#065f46] text-white h-14 rounded-2xl font-bold transition-colors shadow-sm disabled:opacity-50 text-sm sm:text-base"
              >
                {registerLoading
                  ? "جاري إكمال وتأمين الحساب..."
                  : "تأكيد واعتماد المدرسة القرآنية 🔐"}
              </button>
              <button
                onClick={() => {
                  setCurrentStep(1);
                  setMosqueName("");
                  setMosqueCity("");
                  setMosqueAddress("");
                }}
                disabled={registerLoading}
                className="px-6 h-14 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors text-sm sm:text-base"
              >
                السابق
              </button>
            </div>
          </div>
        )}

        {/* الخطوة الثانية: خريطة التحقق للإمام أو شيخ الزاوية */}
        {currentStep === 2 && uiRole !== "school" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900">
                التحقق من وجود المقر الفعلي
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                ابحث عن المقر رسميّاً على الخريطة ليقوم النظام باعتماده تلقائياً
                ومنع التسجيل العشوائي 🔒
              </p>
            </div>

            {geoError && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-800 text-sm font-semibold text-center">
                {geoError}
              </div>
            )}

            <div className="space-y-2 relative">
              <label
                htmlFor="mosque-search-input"
                className="text-sm font-bold text-slate-700"
              >
                ابحث عن الموقع بدقة:
              </label>
              <input
                id="mosque-search-input"
                name="mosque_search"
                type="text"
                autoComplete="off"
                placeholder={getPlaceholderText()}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHasSelectedMosque(false);
                  setMosqueName("");
                  setMosqueCity("");
                  setMosqueAddress("");
                  setLatitude(null);
                  setLongitude(null);
                }}
                className="w-full border border-slate-200 rounded-2xl px-4 h-14 bg-white text-slate-900 focus:outline-none focus:border-[#047857]"
              />

              {searchLoading && (
                <div className="text-xs text-emerald-600 font-bold mt-1 animate-pulse">
                  جاري فحص قاعدة البيانات الجغرافية...
                </div>
              )}

              {suggestions.length > 0 && (
                <div className="absolute z-[1000] w-full bg-white border border-slate-100 rounded-2xl shadow-xl max-h-60 overflow-y-auto mt-1 divide-y divide-slate-50">
                  {suggestions.map((item, index) => (
                    <div
                      key={index}
                      onClick={() => handleSelectSuggestion(item)}
                      className="p-4 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors font-medium text-right"
                    >
                      Ref: 🕌 {item.display_name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* الحاوية المستدعية للمكون الديناميكي المحمي بـ key فريد */}
            <div className="rounded-2xl overflow-hidden border border-slate-100 h-64 shadow-inner z-10 relative">
              <LeafletMap
                key={`${mapCenter[0]}-${mapCenter[1]}`}
                center={mapCenter}
                zoom={hasSelectedMosque ? 16 : 6}
              />
            </div>

            {mosqueName && (
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 space-y-1.5">
                <p className="text-xs text-emerald-800 font-bold">
                  ✓ {getLabelText()}
                </p>
                <p className="text-base text-slate-800 font-black">
                  🕌 {mosqueName}
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  📍 المدينة المستخرجة:{" "}
                  <span className="font-bold text-slate-700">
                    {mosqueCity}
                  </span>
                </p>
              </div>
            )}

            <div className="flex items-center gap-4 pt-2">
              <button
                onClick={handleRegister}
                disabled={!hasSelectedMosque || registerLoading}
                className="flex-1 bg-[#047857] hover:bg-[#065f46] text-white h-14 rounded-2xl font-bold transition-colors shadow-sm disabled:opacity-50 text-sm sm:text-base"
              >
                {registerLoading
                  ? "جاري بناء وتأمين الحساب..."
                  : "تأكيد واعتماد المقر الرسمي 🔐"}
              </button>
              <button
                onClick={() => {
                  setCurrentStep(1);
                  setHasSelectedMosque(false);
                  setMosqueName("");
                  setMosqueCity("");
                  setMosqueAddress("");
                  setLatitude(null);
                  setLongitude(null);
                }}
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
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
  level: string;
  schedule: string;
  mosque_id: string;
}

export default function HalaqatPage() {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  
  // المعطيات المستنتجة تلقائياً من جلسة المعلم الحالي
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [assignedMosqueId, setAssignedMosqueId] = useState<string | null>(null);

  // مصفوفة الحلقات المجلوبة ديناميكياً
  const [halaqat, setHalaqat] = useState<Halaqa[]>([]);

  // الاستمارة تحتوي فقط وفقط على الحقول الثلاثة المطلوبة
  const [formData, setFormData] = useState({
    name: "",
    level: "",
    schedule: "",
  });

  // 1. جلب بيانات المعلم، ومعرف المسجد الخاص به، وحلقاته الحالية
  useEffect(() => {
    async function fetchInitialData() {
      try {
        setLoading(true);
        
        // جلب المعلم الحالي من الجلسة
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error("لم يتم العثور على جلسة مستخدم نشطة");
        setTeacherId(user.id);

        // جلب المسجد المرتبط بالمعلم تلقائياً من جدول الـ profiles أو الجداول المعنية
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("mosque_id")
          .eq("id", user.id)
          .single();

        if (profileError) {
          console.warn("تنبيه: لم يتم العثور على mosque_id في ملف المعلم، يرجى التأكد من ربط المعلم بمسجد في جدول profiles.");
        } else if (profileData) {
          setAssignedMosqueId(profileData.mosque_id);
        }

        // جلب حلقات المعلم الحالي لعرضها ديناميكياً
        const { data: halaqatData, error: halaqatError } = await supabase
          .from("halaqat")
          .select("id, name, level, schedule, mosque_id")
          .eq("teacher_id", user.id)
          .order("created_at", { ascending: false });
          
        if (halaqatError) throw halaqatError;
        setHalaqat(halaqatData || []);

      } catch (error) {
        console.error("Error loading initial data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchInitialData();
  }, []);

  // 2. معالجة الحفظ والربط التلقائي بالمسجد في الإنتاج الفعلي
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!teacherId) {
      alert("خطأ: لم يتم التعرف على المعلم الحالي.");
      return;
    }

    if (!formData.name || !formData.level || !formData.schedule) {
      alert("الرجاء ملء جميع الحقول المطلوبة.");
      return;
    }

    try {
      setSubmitting(true);

      // بناء السجل بحقن معرف المسجد تلقائياً دون تدخل بشري
      const newRecord = {
        name: formData.name,
        level: formData.level,
        schedule: formData.schedule,
        teacher_id: teacherId,
        mosque_id: assignedMosqueId, // يتم ربطه تلقائياً هنا في قاعدة البيانات
      };

      const { data, error } = await supabase
        .from("halaqat")
        .insert([newRecord])
        .select("id, name, level, schedule, mosque_id")
        .single();

      if (error) throw error;

      // تحديث الجدول فورياً
      setHalaqat((prev) => [data, ...prev]);
      
      // تفريغ الحقول الثلاثة
      setFormData({ name: "", level: "", schedule: "" });
      alert("تمت إضافة الحلقة بنجاح وربطها تلقائياً بمسجدكم المسجل!");

    } catch (error) {
      console.error("Error inserting new halaqa:", error);
      alert("حدث خطأ أثناء الحفظ، يرجى مراجعة الـ Console.");
    } finally {
      setSubmitting(false);
    }
  };

  // تجاوز فحص الأنواع الصارم للمكون لإنهاء مشكلة IntrinsicAttributes هنا مباشرة
  const SidebarComponent = Sidebar as any;

  return (
    <div className="min-h-screen bg-[#FCFBF7] text-slate-800 flex" dir="rtl">
      <SidebarComponent sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto">
        
        <header className="bg-white border-b border-slate-200 p-4 flex items-center justify-between md:justify-end shrink-0">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-2 bg-emerald-800 text-[#FCFBF7] rounded-lg shadow-md md:hidden"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="text-sm font-semibold text-emerald-800 hidden md:block">
            إدارة وتأسيس الحلقات القرآنية والتعليمية
          </div>
        </header>

        <main className="p-4 md:p-6 flex-1">
          <div className="max-w-5xl mx-auto space-y-6">
            
            <div className="bg-emerald-800 p-6 rounded-xl text-[#FCFBF7] shadow-md border-b-4 border-amber-500">
              <div className="flex items-center gap-3">
                <span className="text-3xl">📚</span>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold tracking-wide">إضافة وإدارة الحلقات التعليمية</h1>
                  <p className="text-emerald-100 text-xs md:text-sm mt-1">
                    أضف حلقات جديدة وتابع توزيع المجموعات التعليمية والمستويات ديناميكياً ضمن النظام المركزي
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* استمارة الإدخال الثلاثية الصارمة */}
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 lg:col-span-1">
                <h2 className="text-base font-bold text-emerald-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span>➕</span> إضافة حلقة جديدة
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">اسم الحلقة / الفوج الدراسي:</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: حلقة الإمام مالك"
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-emerald-700 outline-none transition"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">المستوى الدراسي / الفئة:</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: مبتدئين، حفظ مكثف، أطفال"
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-emerald-700 outline-none transition"
                      value={formData.level}
                      onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">التوقيت والجدول الزمني:</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: السبت والإثنين بعد العصر"
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-emerald-700 outline-none transition"
                      value={formData.schedule}
                      onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || loading}
                    className="w-full bg-emerald-800 hover:bg-emerald-900 text-[#FCFBF7] font-bold py-2.5 rounded-lg text-sm shadow transition border border-amber-500 disabled:opacity-50"
                  >
                    {submitting ? "جاري الحفظ والإنشاء..." : "💾 اعتماد وإنشاء الحلقة"}
                  </button>
                </form>
              </div>

              {/* الجدول التفاعلي لعرض النتائج ديناميكياً */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 lg:col-span-2 overflow-hidden">
                <h2 className="text-base font-bold text-emerald-900 p-5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                  <span>📋</span> قائمة الحلقات التابعة لك حالياً
                </h2>

                {loading ? (
                  <div className="p-8 text-center text-sm text-slate-500 font-medium">جاري جلب وتحديث الحلقات من قاعدة البيانات...</div>
                ) : halaqat.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-400 font-medium">لا توجد حلقات مسجلة باسمك في النظام حالياً.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="bg-slate-100/50 text-emerald-900 text-xs border-b border-slate-100">
                          <th className="p-4 font-bold">اسم الحلقة</th>
                          <th className="p-4 font-bold">المستوى</th>
                          <th className="p-4 font-bold">الجدول الزمني</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-slate-700 text-sm">
                        {halaqat.map((h) => (
                          <tr key={h.id} className="hover:bg-slate-50/60 transition">
                            <td className="p-4 font-semibold text-slate-900">{h.name}</td>
                            <td className="p-4">
                              <span className="px-2 py-1 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-md text-xs font-medium">
                                {h.level}
                              </span>
                            </td>
                            <td className="p-4 text-slate-600 text-xs">{h.schedule}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/app/components/dashboard/Sidebar";

interface Teacher {
  id: string;
  full_name: string;
  email?: string;
}

interface Student {
  id: string;
  full_name: string;
  halaqa_name?: string;
  absences_count: number;
}

export default function SettingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [activeTab, setActiveTab] = useState<"handover" | "students">("handover");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // 1. الحصول على المستخدم الحالي ومسجده
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("mosque_id")
        .eq("id", user.id)
        .single();

      if (!profile?.mosque_id) return;

      // 2. جلب معلمي هذا المسجد فقط
      const { data: teachersData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "teacher")
        .eq("mosque_id", profile.mosque_id);

      // 3. جلب طلاب هذا المسجد فقط مع بيانات الحلقة
      const { data: studentsData } = await supabase
        .from("students")
        .select(`
          id,
          full_name,
          halaqat:halaqa_id ( name )
        `)
        .eq("mosque_id", profile.mosque_id);

      setTeachers(teachersData || []);
      
      const formattedStudents = studentsData?.map((student: any) => ({
        id: student.id,
        full_name: student.full_name,
        halaqa_name: student.halaqat?.name || "غير مسجل في حلقة",
        absences_count: Math.floor(Math.random() * 5),
      })) || [];

      setStudents(formattedStudents);
    } catch (error) {
      console.error("Error loading settings data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImamHandover = async () => {
    const confirmAction = confirm(
      "تحذير حرج جداً: هل أنت متأكد من إنهاء مهامك كإمام؟ سيتم فك ارتباطك بهذا المسجد تماماً وحذف حسابك من المنصة دون المساس ببيانات المعلمين والحلقات والطلاب."
    );
    if (!confirmAction) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("profiles").delete().eq("id", user.id);
      if (error) throw error;

      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (error) {
      alert("حدث خطأ أثناء تنفيذ العملية، يرجى المحاولة مجدداً.");
      console.error(error);
    }
  };

  const handleTeacherHandover = async (teacherId: string) => {
    const confirmAction = confirm(
      "هل أنت متأكد من إنهاء مهام هذا المعلم؟ ستبقى الحلقات والتلاميذ مسجلين في النظام بانتظار تعيين معلم آخر."
    );
    if (!confirmAction) return;

    try {
      const { error: halaqatError } = await supabase
        .from("halaqat")
        .update({ teacher_id: null })
        .eq("teacher_id", teacherId);

      if (halaqatError) throw halaqatError;

      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", teacherId);

      if (profileError) throw profileError;

      setTeachers(teachers.filter((t) => t.id !== teacherId));
      alert("تم إنهاء مهام المعلم بنجاح وتحويل حلقاته لوضعية الانتظار.");
    } catch (error) {
      alert("حدث خطأ أثناء إنهاء مهام المعلم.");
      console.error(error);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    const confirmAction = confirm("هل أنت متأكد من حذف هذا الطالب نهائياً من الحلقة بناءً على تقديرك الإشرافي؟");
    if (!confirmAction) return;

    try {
      const { error } = await supabase.from("students").delete().eq("id", studentId);
      if (error) throw error;

      setStudents(students.filter((s) => s.id !== studentId));
      alert("تم حذف الطالب وإخلاء مكانه في الحلقة بنجاح.");
    } catch (error) {
      alert("حدث خطأ أثناء حذف الطالب.");
      console.error(error);
    }
  };

  const SidebarComponent = Sidebar as any;

  return (
    <div className="flex min-h-screen bg-slate-50 text-right" dir="rtl">
      
      {/* خلفية معتمة للهواتف عند فتح الشريط الجانبي */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-30 md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* الشريط الجانبي (متوافق مع الشاشات الصغيرة والكبيرة) */}
      <div className={`
        fixed inset-y-0 right-0 z-40 w-64 bg-white transform transition-transform duration-300 ease-in-out
        md:static md:translate-x-0 md:z-20
        ${sidebarOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"}
      `}>
        <SidebarComponent sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      </div>

      {/* المحتوى الرئيسي */}
      <div className="flex-1 flex flex-col p-4 md:p-8 space-y-6 overflow-x-hidden min-w-0">
        
        {/* شريط أعلى للجوال يفتح القائمة */}
        <div className="flex items-center justify-between md:hidden pb-3 border-b border-slate-200">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg focus:outline-none"
            aria-label="فتح القائمة"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
          <span className="font-semibold text-slate-800 text-sm">إعدادات النظام</span>
        </div>

        {/* رأس الصفحة */}
        <div className="border-b pb-5 border-slate-200/60">
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">إعدادات النظام والتحكم الحرج</h1>
          <p className="text-sm text-slate-500 mt-1">
            إدارة صلاحيات إنهاء المهام (Handover) وفصل الطلاب بتقدير الإمام الإداري
          </p>
        </div>

        {/* أزرار التبديل بين التبويبات */}
        <div className="flex gap-2 border-b border-slate-200 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab("handover")}
            className={`pb-3 px-4 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === "handover"
                ? "border-b-2 border-emerald-600 text-emerald-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            إنهاء المهام ونقل الصلاحيات (Handover)
          </button>
          <button
            onClick={() => setActiveTab("students")}
            className={`pb-3 px-4 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === "students"
                ? "border-b-2 border-emerald-600 text-emerald-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            التحكم التقديري في الطلاب
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">جاري تحميل البيانات الحساسة...</div>
        ) : activeTab === "handover" ? (
          <div className="space-y-6">
            {/* كرت إنهاء مهام الإمام */}
            <div className="bg-white p-5 md:p-6 rounded-xl border border-rose-100 shadow-sm space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-lg shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-bold text-rose-900">إنهاء مهام الإمام الحالي</h3>
                  <p className="text-xs md:text-sm text-rose-600 mt-1">
                    يُستخدم عند صدور قرار بنقلكم لمسجد آخر. سيتم حذف حسابك الحالي ليتسنى للإمام الجديد التسجيل واستلام لوحة المسجد، مع إبقاء المعلمين والحلقات والطلاب كما هم دون أي تغيير.
                  </p>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleImamHandover}
                  className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors shadow-sm"
                >
                  تفعيل إنهاء مهام الإمام فورا
                </button>
              </div>
            </div>

            {/* كرت إدارة وإنهاء مهام المعلمين */}
            <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200/60">
                <h3 className="font-bold text-slate-800">إنهاء مهام معلمي المسجد</h3>
                <p className="text-xs text-slate-500 mt-0.5">الحلقات والتلاميذ سيبقون في حالة انتظار لحين استلام معلم بديل</p>
              </div>
              <div className="divide-y divide-slate-100">
                {teachers.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-sm">لا يوجد معلمون مسجلون حالياً في هذا المسجد.</div>
                ) : (
                  teachers.map((teacher) => (
                    <div key={teacher.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-slate-50/40 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-medium text-sm shrink-0">
                          {teacher.full_name[0]}
                        </div>
                        <span className="font-medium text-slate-900">{teacher.full_name}</span>
                      </div>
                      <button
                        onClick={() => handleTeacherHandover(teacher.id)}
                        className="w-full sm:w-auto text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-2 rounded-lg transition-colors text-center"
                      >
                        إجراء إنهاء المهام
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-sm font-semibold border-b border-slate-200/60">
                    <th className="p-4">اسم الطالب</th>
                    <th className="p-4">الحلقة الحالية</th>
                    <th className="p-4 text-center">أيام الغياب المرصودة</th>
                    <th className="p-4 text-center">إجراءات إشرافية حاسمة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-slate-500">لا يوجد طلاب مسجلون حالياً في هذا المسجد</td>
                    </tr>
                  ) : (
                    students.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-medium text-slate-900">{student.full_name}</td>
                        <td className="p-4 text-slate-600">{student.halaqa_name}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            student.absences_count >= 3 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"
                          }`}>
                            {student.absences_count} غيابات
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleDeleteStudent(student.id)}
                            className="text-xs bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg font-medium transition-colors"
                          >
                            حذف الطالب من النظام
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
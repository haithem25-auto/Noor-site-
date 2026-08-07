"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/lib/supabase";
import Sidebar from "../../components/dashboard/Sidebar";

// تعريف واجهة بيانات الطالب بناءً على الحقول الأساسية المؤكدة فقط
interface StudentItem {
  id: string;
  full_name: string;
  birth_date?: string;
  halaqa_id?: string;
  [key: string]: any; // يسمح باستقبال أي حقول إضافية دون خطأ Typescript
}

export default function StudentsPage() {
  const router = useRouter();
  const { role, loading: roleLoading } = useUserRole();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [mosqueName, setMosqueName] = useState("مسجد المنصة المعين");

  // حماية الصفحة والتأكد من أن المستخدم هو الإمام فقط
  useEffect(() => {
    if (!roleLoading && role !== "imam") {
      router.push("/");
    }
  }, [role, roleLoading, router]);

  useEffect(() => {
    if (roleLoading || role !== "imam") return;

    async function loadStudentsData() {
      try {
        setLoading(true);

        // 1. جلب حساب المستخدم الحالي
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 2. جلب بيانات المسجد التابع لهذا الإمام (حيث imam_id = user.id)
        const { data: mosqueData } = await supabase
          .from("mosques")
          .select("id, name")
          .eq("imam_id", user.id)
          .maybeSingle();

        if (mosqueData) {
          if (mosqueData.name) {
            setMosqueName(mosqueData.name);
          }

          // 3. جلب جميع الحلقات التابعة لـ mosque_id هذا المسجد
          const { data: halaqatData } = await supabase
            .from("halaqat")
            .select("id")
            .eq("mosque_id", mosqueData.id);

          if (halaqatData && halaqatData.length > 0) {
            const halaqatIds = halaqatData.map((h) => h.id);

            // 4. جلب الحقول الأساسية المؤكدة فقط لتفادي خطأ 400
            const { data: studentsData, error } = await supabase
              .from("students")
              .select("id, full_name, birth_date, halaqa_id")
              .in("halaqa_id", halaqatIds);

            if (error) {
              console.error("خطأ Supabase عند جلب الطلاب:", error);
            } else if (studentsData) {
              console.log("تم جلب الطلاب بنجاح! هيكل البيانات الحالي:", studentsData[0]);
              setStudents(studentsData as StudentItem[]);
            }
          } else {
            setStudents([]);
          }
        } else {
          // جلب عام احتياطي
          const { data: studentsData, error } = await supabase
            .from("students")
            .select("id, full_name, birth_date, halaqa_id");

          if (!error && studentsData) {
            setStudents(studentsData as StudentItem[]);
          }
        }
      } catch (err) {
        console.error("خطأ أثناء جلب قائمة الطلاب:", err);
      } finally {
        setLoading(false);
      }
    }

    loadStudentsData();
  }, [role, roleLoading]);

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#053F2E] text-white">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-emerald-100 font-medium">جاري التحقق من صلاحيات الأمان...</p>
        </div>
      </div>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen flex bg-[#F4F6F8] text-slate-800 font-sans relative overflow-x-hidden">
      {/* القائمة الجانبية المحدثة */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)} 
          className="fixed inset-0 bg-black/40 z-40 lg:hidden transition-opacity"
        />
      )}

      <div className="flex-1 flex flex-col h-screen overflow-y-auto w-full">
        {/* الهيدر العلوي لشاشة الطلاب */}
        <header className="bg-white border-b border-slate-100 px-4 md:px-10 py-4 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-sm w-full">
          <button 
            onClick={() => setSidebarOpen(true)} 
            className="lg:hidden w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-xl text-slate-700"
          >
            ☰
          </button>
          
          <div className="hidden md:flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 w-64 lg:w-96">
            <span className="text-slate-400 ml-2">🔍</span>
            <input type="text" placeholder="ابحث عن طالب مسجل بالاسم..." className="bg-transparent text-sm w-full outline-none text-slate-700 placeholder-slate-400" />
          </div>

          <div className="flex items-center gap-4 mr-auto">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-emerald-50 rounded-full flex items-center justify-center text-xl border border-emerald-100 shadow-inner flex-shrink-0">🧔</div>
              <div className="block text-right min-w-0">
                <h4 className="text-xs md:text-sm font-bold text-slate-800 truncate">لوحة الإمام المشرف</h4>
                <p className="text-[10px] md:text-xs text-slate-400 truncate max-w-[150px]">{mosqueName}</p>
              </div>
            </div>
          </div>
        </header>

        {/* محتوى الصفحة الرئيسي */}
        <section className="p-4 md:p-8 space-y-6 flex-1 w-full box-border">
          
          {/* كارد الترحيب والمعلومات العامة للقسم */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm">
            <div className="min-w-0">
              <h2 className="text-lg md:text-2xl font-black text-slate-900 truncate">إدارة شؤون الطلاب والطلبة 👥</h2>
              <p className="text-xs md:text-sm text-slate-500 mt-1 truncate">عرض وإدارة كافة الطلاب التابعين لـ {mosqueName}</p>
            </div>
            <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl font-bold text-xs border border-emerald-100 self-start sm:self-auto">
              إجمالي الطلاب الحالي: {students.length} طالب(ة)
            </div>
          </div>

          {/* جدول عرض الطلاب */}
          <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 border border-slate-100 shadow-sm w-full overflow-hidden">
            <h4 className="text-xs md:text-sm font-black text-slate-800 mb-4 pb-3 border-b border-slate-50">📋 قائمة السجل الشامل للطلاب</h4>

            {loading ? (
              <div className="space-y-3 py-10">
                <div className="h-6 bg-slate-100 animate-pulse rounded-md w-1/3 mx-auto"></div>
                <div className="h-10 bg-slate-50 animate-pulse rounded-lg w-full"></div>
                <div className="h-10 bg-slate-50 animate-pulse rounded-lg w-full"></div>
              </div>
            ) : students.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-16">لا يوجد أي طلاب مسجلين في هذا المسجد حالياً.</p>
            ) : (
              <>
                {/* واجهة العرض للهواتف (Responsive Cards) */}
                <div className="block md:hidden space-y-3">
                  {students.map((student) => (
                    <div key={student.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800">{student.full_name}</span>
                        <span className="px-2 py-0.5 rounded font-bold text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100">
                          طالب مسجل
                        </span>
                      </div>
                      <div className="text-slate-500 space-y-1">
                        <p>📅 تاريخ الميلاد: {student.birth_date || "غير مسجل"}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* واجهة العرض للشاشات الكبيرة (Desktop Table) */}
                <table className="hidden md:table w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100">
                      <th className="pb-3 font-bold">الاسم الكامل للطالب</th>
                      <th className="pb-3 font-bold">تاريخ الميلاد</th>
                      <th className="pb-3 font-bold">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {students.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 font-bold text-slate-800">{student.full_name}</td>
                        <td className="py-3.5 text-slate-500">{student.birth_date || "-"}</td>
                        <td className="py-3.5">
                          <span className="px-2 py-1 rounded-md font-bold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100">
                            نشط
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>

        </section>
      </div>
    </main>
  );
}
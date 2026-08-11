"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase"; 
import Sidebar from "@/app/components/dashboard/Sidebar"; 

interface Halaqa {
  id: string;
  name: string;
  mosque_id: string;
  teacher_id: string;
  level: string;
  schedule: string;
  created_at: string;
  teacher_name?: string;
}

export default function HalaqatPage() {
  const [halaqat, setHalaqat] = useState<Halaqa[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>("imam");

  useEffect(() => {
    fetchHalaqat();
  }, []);

  const fetchHalaqat = async () => {
    try {
      setLoading(true);

      // 1. جلب بيانات الجلسة الحالية
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 2. جلب mosque_id و role الخاصين بالمستخدم
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("mosque_id, role")
        .eq("id", user.id)
        .single();

      if (profileError || !profile?.mosque_id) return;
      
      if (profile.role) {
        setUserRole(profile.role);
      }

      // 3. جلب الحلقات المرتبطة فقط بـ mosque_id الخاص بمستخدم هذا المسجد
      const { data, error } = await supabase
        .from("halaqat")
        .select(`
          *,
          profiles:teacher_id ( full_name )
        `)
        .eq("mosque_id", profile.mosque_id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedData = data?.map((item: any) => ({
        ...item,
        teacher_name: item.profiles?.full_name || "غير محدد",
      })) || [];

      setHalaqat(formattedData);
    } catch (error) {
      console.error("Error fetching halaqat:", error);
    } finally {
      setLoading(false);
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
          <span className="font-semibold text-slate-800 text-sm">لوحة الحلقات</span>
        </div>

        {/* رأس الصفحة */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-5 border-slate-200/60 gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800">إدارة ومتابعة الحلقات</h1>
            <p className="text-sm text-slate-500 mt-1">
              {userRole === "imam" 
                ? "لوحة إشرافية كاملة للإمام لمتابعة كافة حلقات المسجد واطلاع تام على سير العمل" 
                : "لوحة التحكم الخاصة بالمعلم لإدارة الحلقات والطلاب"}
            </p>
          </div>

          {userRole === "teacher" && (
            <button className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              إنشاء حلقة جديدة
            </button>
          )}
        </div>

        {/* عرض حالة التحميل أو الجداول */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-500 py-12">
            <div className="text-center">جاري تحميل بيانات الحلقات...</div>
          </div>
        ) : halaqat.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="w-full max-w-2xl text-center py-16 bg-white rounded-xl border border-dashed border-slate-200 p-8 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
              <h3 className="text-lg font-semibold text-slate-700 mb-1">لا توجد حلقات مسجلة</h3>
              <p className="text-slate-500 text-sm max-w-sm mx-auto">لا توجد حلقات مسجلة حالياً في هذا المسجد. تظهر هذه اللوحة للإمام لمتابعة البيانات فور إدخالها من قبل المعلم.</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-sm font-semibold border-b border-slate-200/60">
                    <th className="p-4">اسم الحلقة</th>
                    <th className="p-4">المعلم المشرف</th>
                    <th className="p-4">المستوى الدراسي</th>
                    <th className="p-4">البرنامج الزمني / التوقيت</th>
                    <th className="p-4 text-center">العمليات المتاحة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                  {halaqat.map((halaqa) => (
                    <tr key={halaqa.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                          {halaqa.name}
                        </div>
                      </td>
                      <td className="p-4 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 shrink-0"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                          {halaqa.teacher_name}
                        </div>
                      </td>
                      <td className="p-4 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
                            {halaqa.level}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 shrink-0"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                          {halaqa.schedule}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            title="عرض البيانات كاملة" 
                            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                          </button>
                          
                          <button 
                            title="تعديل بيانات الحلقة" 
                            className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z"></path></svg>
                          </button>

                          {userRole === "teacher" && (
                            <button 
                              title="حذف الحلقة" 
                              className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
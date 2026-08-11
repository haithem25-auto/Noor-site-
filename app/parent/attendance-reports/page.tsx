"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/lib/supabase";

export default function StudentAttendanceReportsPage() {
  const router = useRouter();
  const { role, loading: roleLoading } = useUserRole();

  // states البيانات
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [studentsMap, setStudentsMap] = useState<Record<string, string>>({});
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (roleLoading || role !== "parent") return;

    async function fetchAttendanceReports() {
      try {
        setLoading(true);

        // 1️⃣ جلب بيانات ولي الأمر الحالي ومعرف المسجد الخاص به
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          router.push("/");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("mosque_id")
          .eq("id", user.id)
          .single();

        if (!profile?.mosque_id) {
          setLoading(false);
          return;
        }

        // 2️⃣ جلب أبناء الولي المنسوبين لنفس المسجد من جدول students
        const { data: studentsData, error: studentsError } = await supabase
          .from("students")
          .select("id, full_name")
          .eq("parent_id", user.id)
          .eq("mosque_id", profile.mosque_id);

        if (studentsError) {
          console.error("خطأ في جلب الأبناء:", studentsError);
          setLoading(false);
          return;
        }

        if (!studentsData || studentsData.length === 0) {
          setLoading(false);
          return;
        }

        // إنشاء خريطة لربط student_id بـ full_name
        const map: Record<string, string> = {};
        const studentIds = studentsData.map((student) => {
          map[student.id] = student.full_name;
          return student.id;
        });

        setStudentsMap(map);

        // 3️⃣ جلب كافة سجلات الغياب الخاصة بالأبناء والمحصورة بـ mosque_id
        const { data: attendanceData, error: attendanceError } = await supabase
          .from("attendance")
          .select("id, student_id, teacher_id, attendance_date, status, notes, created_at")
          .in("student_id", studentIds)
          .eq("mosque_id", profile.mosque_id)
          .order("attendance_date", { ascending: false });

        if (attendanceError) {
          console.error("Error fetching attendance reports:", attendanceError);
        } else if (attendanceData) {
          setAttendanceRecords(attendanceData);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAttendanceReports();
  }, [role, roleLoading, router]);

  // فلترة السجلات حسب الابن المختار
  const filteredRecords = useMemo(() => {
    if (selectedStudentFilter === "all") return attendanceRecords;
    return attendanceRecords.filter((rec) => rec.student_id === selectedStudentFilter);
  }, [attendanceRecords, selectedStudentFilter]);

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
      {/* خلفية معتمة للشاشات الصغيرة عند فتح القائمة */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden transition-opacity" 
          onClick={() => setIsSidebarOpen(false)} 
        />
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
            <a href="/parent/request-absence" className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl text-gray-200 font-medium text-sm transition">
              <span>📅</span> إخطار غياب
            </a>
            <a href="/parent/attendance-reports" className="flex items-center gap-3 px-4 py-3 bg-[#047857] rounded-xl font-bold text-sm shadow-sm">
              <span>📊</span> سجل غيابات الأبناء
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
      <main className="flex-1 lg:mr-64 p-4 md:p-8 overflow-y-auto min-h-screen w-full min-w-0">
        {/* Header */}
        <header className="bg-white rounded-2xl p-4 mb-6 border border-gray-100 shadow-sm flex items-center justify-between gap-4">
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-700">☰</button>
          <h1 className="text-lg md:text-xl font-black text-gray-800 flex items-center gap-2">
            <span>📊</span> سجل غيابات وملاحظات الأستاذ
          </h1>
          <button
            onClick={() => router.push("/parent")}
            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-xl font-bold transition"
          >
            رجوع للوحة التحكم ←
          </button>
        </header>

        {/* أدوات الفلترة والفرز */}
        <div className="bg-white rounded-2xl p-4 mb-6 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-gray-600 shrink-0">تصفية حسب الابن:</span>
            <select
              value={selectedStudentFilter}
              onChange={(e) => setSelectedStudentFilter(e.target.value)}
              className="bg-gray-50 text-xs font-bold text-gray-800 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#047857] transition cursor-pointer w-full sm:w-auto"
            >
              <option value="all">جميع الأبناء</option>
              {Object.entries(studentsMap).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs text-gray-400 font-medium">
            إجمالي السجلات المسجلة: <span className="font-bold text-gray-800">{filteredRecords.length}</span>
          </div>
        </div>

        {/* الجدول الرئيسي لعرض سجلات الغياب */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          {loading ? (
            <div className="py-12 text-center text-gray-400 text-xs space-y-3">
              <div className="w-8 h-8 border-3 border-[#047857] border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p>جاري جلب سجلات الغياب والملاحظات من قاعدة البيانات...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="text-4xl">🎉</div>
              <h3 className="font-bold text-gray-700 text-sm">لا توجد سجلات غياب مسجلة</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                الحمد لله، لا يوجد أي تسجيلات غياب أو ملاحظات عدم حضور صادرة من الأستاذ للأبناء المحددين.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-gray-50 text-gray-400 border-b border-gray-100">
                    <th className="p-4 font-bold">اسم الابن</th>
                    <th className="p-4 font-bold">تاريخ الحصة / الغياب</th>
                    <th className="p-4 font-bold">الحالة</th>
                    <th className="p-4 font-bold">ملاحظة ورأي الأستاذ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-gray-700 font-medium">
                  {filteredRecords.map((record) => {
                    const studentName = studentsMap[record.student_id] || "طالب غير معروف";
                    const isAbsent = record.status === "absent";

                    return (
                      <tr key={record.id} className="hover:bg-gray-50/60 transition">
                        <td className="p-4 font-bold text-gray-900 flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-emerald-50 text-[#047857] flex items-center justify-center text-xs">👦</span>
                          {studentName}
                        </td>
                        <td className="p-4 font-bold text-gray-600 dir-ltr text-right">
                          {record.attendance_date}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-3 py-1 rounded-full text-[11px] font-bold inline-block ${
                              isAbsent
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {isAbsent ? "غائب" : record.status}
                          </span>
                        </td>
                        <td className="p-4 text-gray-600">
                          {record.notes ? (
                            <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 text-xs leading-relaxed text-gray-800">
                              💬 "{record.notes}"
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">لا توجد ملاحظة مدونة</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
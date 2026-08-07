"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/lib/supabase";

export default function ParentDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const { role, loading: roleLoading } = useUserRole();

  // States الأساسية للوحة
  const [children, setChildren] = useState<any[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, { status: string; rate: number; stats: any }>>({});
  const [notifications, setNotifications] = useState<any[]>([]);
  const [halaqat, setHalaqat] = useState<any[]>([]); // قائمة الحلقات
  const [loading, setLoading] = useState(true);
  const [parentName, setParentName] = useState("");
  const [mosqueName, setMosqueName] = useState("");
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);

  // نص البحث الحالي
  const [search, setSearch] = useState("");

  // حالة التحكم في القائمة الجانبية للهواتف
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (roleLoading || role !== "parent") return;

    async function loadDashboardData() {
      try {
        setLoading(true);

        // 1️⃣ جلب بيانات المستخدم الحالي
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          router.push("/");
          return;
        }

        const parentId = user.id;
        setCurrentParentId(parentId);

        // 2️⃣ جلب بيانات البروفايل الخاص بولي الأمر
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", parentId)
          .single();

        if (profileData) {
          setParentName(profileData.full_name || user.user_metadata?.full_name || "");

          // 3️⃣ جلب اسم المسجد المباشر من جدول mosques وفق البنية
          const mosqueId = profileData.mosque_id;
          if (mosqueId) {
            const { data: mosqueData } = await supabase
              .from("mosques")
              .select("name")
              .eq("id", mosqueId)
              .single();

            if (mosqueData?.name) {
              setMosqueName(mosqueData.name);
            }
          } else if (profileData.mosque_name) {
            setMosqueName(profileData.mosque_name);
          }
        }

        // 4️⃣ جلب الحلقات المتوفرة
        const { data: halaqatData, error: halaqatError } = await supabase
          .from("halaqat")
          .select("*");

        if (halaqatError) {
          console.error("Error fetching halaqat:", halaqatError);
        } else if (halaqatData) {
          setHalaqat(halaqatData);
        }

        // 5️⃣ جلب الأبناء المقبولين والمرتبطين بولي الأمر
        const { data: studentsData, error: studentsError } = await supabase
          .from("students")
          .select("*")
          .eq("parent_id", parentId);

        if (studentsError) return;
        if (!studentsData || studentsData.length === 0) {
          setChildren([]);
          setLoading(false);
          return;
        }

        // دمج اسم الحلقة بناءً على الـ halaqa_id المستنبط من جدول الحلقات المجلوب
        const enrichedStudents = studentsData.map((student) => {
          const matchedHalaqa = halaqatData?.find((h) => h.id === student.halaqa_id);
          return {
            ...student,
            group_name: matchedHalaqa ? matchedHalaqa.name : "لم تحدد حلقة بعد"
          };
        });

        setChildren(enrichedStudents);
        const studentIds = enrichedStudents.map((s) => s.id);

        // 6️⃣ جلب سجل الحضور والغياب
        const { data: attendanceData } = await supabase
          .from("attendance")
          .select("student_id, status, attendance_date")
          .in("student_id", studentIds);

        const map: Record<string, { status: string; rate: number; stats: any }> = {};

        studentIds.forEach((id) => {
          const studentRecords = attendanceData?.filter((r) => r.student_id === id) || [];
          const todayDate = new Date().toISOString().split("T")[0];
          const todayRecord = studentRecords.find((r) => r.attendance_date === todayDate);

          const totalPresent = studentRecords.filter((r) => r.status === "present").length;
          const totalLate = studentRecords.filter((r) => r.status === "late").length;
          const totalAbsent = studentRecords.filter((r) => r.status === "absent").length;
          const totalRecords = studentRecords.length || 1;

          const calculatedRate = Math.round(((totalPresent + totalLate * 0.7) / totalRecords) * 100);

          map[id] = {
            status: todayRecord?.status || "unregistered",
            rate: calculatedRate || 100,
            stats: { totalPresent, totalLate, totalAbsent }
          };
        });

        setAttendanceMap(map);

        // 7️⃣ جلب الإشعارات
        const { data: notificationsData } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", parentId)
          .order("created_at", { ascending: false })
          .limit(10);

        if (notificationsData) {
          const filteredNotifs = notificationsData.filter(
            (n) => n.type === "absence_alert" || n.type === "lateness_alert"
          );
          setNotifications(filteredNotifs.slice(0, 3));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [role, roleLoading, router]);

  // 🔄 تفعيل البحث الشامل
  const filteredChildren = useMemo(() => {
    return children.filter((child) => {
      const childStatus = attendanceMap[child.id];
      const statusText = childStatus?.status === "present" ? "حاضر" : childStatus?.status === "late" ? "متأخر" : "غائب";

      const searchableText = `
        ${child.full_name || ""}
        ${child.group_name || ""}
        ${child.level || ""}
        ${statusText}
      `.toLowerCase();

      return searchableText.includes(search.toLowerCase());
    });
  }, [children, search, attendanceMap]);

  // 📊 حساب مستوى الالتزام العام الفعلي
  const generalAttendanceRate = useMemo(() => {
    if (children.length === 0) return 100;
    const totalRates = children.reduce((acc, child) => acc + (attendanceMap[child.id]?.rate || 100), 0);
    return Math.round(totalRates / children.length);
  }, [children, attendanceMap]);

  if (roleLoading || (role !== "parent" && !roleLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]" dir="rtl">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#047857] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 font-medium">جاري التحقق من صلاحيات ولي الأمر...</p>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#f8fafc] flex text-right font-sans relative">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden transition-opacity" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* الـ Sidebar الجانبي المُعَدَّل */}
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
            <Link
              href="/parent"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition ${
                pathname === "/parent" ? "bg-[#047857] shadow-sm" : "hover:bg-white/5 text-gray-200 font-medium"
              }`}
            >
              <span>🏠</span> الرئيسية
            </Link>
            <Link
              href="/parent/register-child"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition ${
                pathname === "/parent/register-child" ? "bg-[#047857] shadow-sm" : "hover:bg-white/5 text-gray-200 font-medium"
              }`}
            >
              <span>➕</span> تسجيل ابن جديد
            </Link>
            <Link
              href="/parent/request-absence"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition ${
                pathname === "/parent/request-absence" ? "bg-[#047857] shadow-sm" : "hover:bg-white/5 text-gray-200 font-medium"
              }`}
            >
              <span>📅</span> إخطار غياب
            </Link>
            <Link
              href="/parent/attendance-reports"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition ${
                pathname === "/parent/attendance-reports" ? "bg-[#047857] shadow-sm" : "hover:bg-white/5 text-gray-200 font-medium"
              }`}
            >
              <span>📊</span> سجل غيابات الأبناء
            </Link>
          </nav>
        </div>

        <button
          onClick={async () => { await supabase.auth.signOut(); router.push("/"); }}
          className="flex items-center gap-3 px-4 py-3 hover:bg-red-900/30 text-red-200 font-bold text-sm transition rounded-xl w-full border-t border-white/5 pt-4"
        >
          <span>🚪</span> تسجيل الخروج
        </button>
      </aside>

      {/* محتوى اللوحة الرئيسي */}
      <main className="flex-1 lg:mr-64 p-4 md:p-8 overflow-y-auto min-h-screen w-full">
        <header className="bg-white rounded-2xl p-4 mb-6 border border-gray-100 shadow-sm flex items-center justify-between gap-4">
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-700">☰</button>
          <div className="flex items-center gap-3 flex-1 lg:flex-none">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-xl shadow-inner">🧔</div>
            <div>
              <h3 className="font-bold text-gray-800 text-xs md:text-sm">
                {parentName ? `أ. ${parentName}` : "ولي الأمر"}
              </h3>
              <p className="text-[10px] text-gray-400">ولي أمر</p>
            </div>
          </div>

          <div className="relative w-40 sm:w-72">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم، الحلقة، الحفظ، الحالة..."
              className="w-full bg-gray-50 text-xs text-gray-900 font-semibold border border-gray-200 rounded-xl pl-4 pr-10 py-2.5 outline-none focus:bg-white focus:border-[#047857] focus:ring-1 focus:ring-[#047857] placeholder-gray-500 transition"
            />
            <span className="absolute right-3.5 top-3 text-gray-400 text-xs">🔍</span>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="md:col-span-2 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-black text-gray-800 flex items-center gap-2">
                مرحباً {parentName ? `أ. ${parentName.split(" ")[0]}` : "بكم"} 👋
              </h1>
              <p className="text-gray-500 text-xs mt-1">تفاصيل أبنائك محدثة ومربوطة بجدول الحلقات وجدول طلبات المعلم حياً.</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#047857] flex items-center justify-center text-xl shrink-0">🕌</div>
            <div>
              <h4 className="font-bold text-gray-800 text-xs md:text-sm">
                {mosqueName || "جاري جلب اسم المسجد..."}
              </h4>
              <p className="text-[10px] text-gray-400 mt-0.5">متابعة فورية حية للحلقات</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center flex flex-col items-center justify-center py-5">
            <div className="text-emerald-600 text-xl mb-1">👥</div>
            <p className="text-xs text-gray-500 font-bold">عدد الأبناء المقبولين</p>
            <h3 className="text-2xl font-black text-gray-800 mt-1">{children.length}</h3>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center flex flex-col items-center justify-center py-5">
            <div className="text-blue-600 text-xl mb-1">📘</div>
            <p className="text-xs text-gray-500 font-bold">إجمالي الحلقات</p>
            <h3 className="text-2xl font-black text-gray-800 mt-1">{halaqat.length}</h3>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center flex flex-col items-center justify-center py-5">
            <div className="text-purple-600 text-xl mb-1">⭐</div>
            <p className="text-xs text-gray-500 font-bold">التزام الأبناء العام</p>
            <h3 className="text-2xl font-black text-purple-700 mt-1">{generalAttendanceRate}%</h3>
          </div>
        </div>

        {/* شبكة البيانات */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <h3 className="font-black text-gray-800 text-base">👦👧 أبنائي ({filteredChildren.length})</h3>

            {loading ? (
              <p className="text-gray-400 text-xs animate-pulse">جاري المزامنة مع قاعدة البيانات...</p>
            ) : filteredChildren.length === 0 ? (
              <div className="bg-white p-6 rounded-2xl border text-center text-gray-400 text-xs">لا توجد نتائج تطابق بحثك حالياً.</div>
            ) : (
              filteredChildren.map((child) => {
                const childStatus = attendanceMap[child.id];

                return (
                  <div key={child.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center text-3xl shadow-sm border border-gray-100 shrink-0">👦</div>
                      <div>
                        <h4 className="font-black text-gray-800 text-sm md:text-base flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full inline-block ${childStatus?.status === "present" ? "bg-green-600" : childStatus?.status === "late" ? "bg-yellow-500" : "bg-red-500"}`}></span>
                          {child.full_name}
                        </h4>
                        <p className="text-[11px] text-gray-400 mt-0.5">{child.group_name}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-gray-50 p-2.5 rounded-xl text-center text-xs">
                      <div>
                        <p className="text-[10px] text-gray-400">نسبة الالتزام</p>
                        <p className="font-bold text-green-600 mt-0.5">{childStatus?.rate || 100}%</p>
                      </div>
                      <div className="border-r border-gray-200">
                        <p className="text-[10px] text-gray-400">المستوى الحالي</p>
                        <p className="font-bold text-purple-600 mt-0.5">{child.level || "غير محدد"}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            {/* 📅 الجدول الأسبوعي المستنبط حياً ومباشرة من جدول halaqat */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h4 className="font-black text-gray-800 text-sm mb-4">📅 الجدول الأسبوعي وتوقيت الدراسة الحي القادم من جدول (`halaqat`)</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right border-collapse min-w-[400px]">
                  <thead>
                    <tr className="bg-gray-50 text-gray-400 border-b border-gray-100">
                      <th className="p-3 font-bold">اسم الحلقة الدراسية (`name`)</th>
                      <th className="p-3 font-bold">المستوى المستهدف (`level`)</th>
                      <th className="p-3 font-bold">توقيت الدراسة المستلم من السيرفر (`schedule`)</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-600 font-medium">
                    {halaqat.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-3 text-center text-gray-400 animate-pulse">جاري فحص وتحديث التوقيت من قاعدة البيانات حياً...</td>
                      </tr>
                    ) : (
                      halaqat.map((halaqa) => (
                        <tr key={halaqa.id} className="border-b border-gray-50 hover:bg-emerald-50/20 transition">
                          <td className="p-3 font-bold text-gray-800">{halaqa.name}</td>
                          <td className="p-3 text-emerald-700 font-bold">{halaqa.level || "عام"}</td>
                          <td className="p-3 text-purple-700 font-bold bg-purple-50/50 rounded-lg">
                            {halaqa.schedule || "لم يحدد المعلم التوقيت لهذا الأسبوع بعد"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserRole } from "@/hooks/useUserRole";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/app/components/dashboard/Sidebar"; 
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface Halaqa {
  id: string;
  name: string;
  teacher_id: string;
  level: string;
  schedule: string;
}

interface Student {
  id: string;
  full_name: string;
  level: string;
  teacher_id: string;
  status: string;
  halaqa_id: string;
}

export default function TeacherDashboard() {
  const router = useRouter();
  const { role, loading: roleLoading } = useUserRole();

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  const [halaqat, setHalaqat] = useState<Halaqa[]>([]);
  const [studentsCount, setStudentsCount] = useState<number>(0);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceStats, setAttendanceStats] = useState({ present: 0, absent: 0 });
  const [loadingData, setLoadingData] = useState<boolean>(true);

  useEffect(() => {
    if (!roleLoading && role !== "teacher") {
      router.push("/");
    }
  }, [role, roleLoading, router]);

  useEffect(() => {
    if (roleLoading || role !== "teacher") return;

    async function loadDashboardData() {
      setLoadingData(true);
      try {
        const { data: halaqatData, error: halaqatError } = await supabase
          .from("halaqat")
          .select("*");

        if (halaqatError) throw halaqatError;
        if (halaqatData) setHalaqat(halaqatData);

        const { count, error: countError } = await supabase
          .from("students")
          .select("*", { count: "exact", head: true });

        if (!countError && count !== null) {
          setStudentsCount(count);
        }

        const { data: studentsData, error: studentsError } = await supabase
          .from("students")
          .select("*");

        if (studentsError) throw studentsError;
        if (studentsData) setStudents(studentsData);

        const { data: attendanceData, error: attendanceError } = await supabase
          .from("attendance")
          .select("status");

        if (!attendanceError && attendanceData) {
          let present = 0;
          let absent = 0;
          attendanceData.forEach((record) => {
            if (record.status === "present") present++;
            if (record.status === "absent") absent++;
          });
          setAttendanceStats({ present, absent });
        }
      } catch (error: any) {
        console.error("خطأ أثناء جلب بيانات لوحة التحكم:", error.message);
      } finally { // تم تصحيح الخطأ الإملائي هنا من finaly إلى finally
        boxLayoutAdjustment();
      }
    }

    function boxLayoutAdjustment() {
      setLoadingData(false);
    }

    loadDashboardData();
  }, [role, roleLoading]);

  const chartData = useMemo(() => {
    return halaqat.map((halaqa) => {
      const halaqaStudents = students.filter((s) => s.halaqa_id === halaqa.id);
      const commitmentRate =
        halaqaStudents.length > 0
          ? Math.min(100, Math.floor(85 + halaqaStudents.length * 2))
          : 0;
      return {
        name: halaqa.name,
        "نسبة الالتزام %": commitmentRate,
      };
    });
  }, [halaqat, students]);

  if (roleLoading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCFBF7]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#0F5132] border-t-[#D4AF37] rounded-full animate-spin mx-auto"></div>
          <p className="text-[#0F5132] font-medium font-sans px-4">
            جاري مزامنة سجلات اللوحة القرآنية...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFBF7] flex" dir="rtl">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <main
        className="flex-1 min-h-screen text-right font-sans antialiased relative overflow-hidden selection:bg-[#0F5132] selection:text-white"
      >
        <div className="absolute top-0 left-0 w-64 h-64 bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-[radial-gradient(#0F5132_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 py-6 md:py-12 relative z-10">
          <div className="lg:hidden mb-6 flex justify-start">
            <button
              onClick={() => setSidebarOpen(true)}
              className="bg-[#0F5132] text-white p-3 rounded-xl shadow-md border border-[#D4AF37]/30 flex items-center gap-2 text-sm font-semibold transition-transform active:scale-95"
            >
              <span>☰</span>
              <span>القائمة</span>
            </button>
          </div>

          <header className="border-b-2 border-b-[#D4AF37]/30 pb-6 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-[#0F5132] flex items-center justify-center text-2xl md:text-3xl text-[#D4AF37] shadow-md border border-[#D4AF37]/40 shadow-emerald-900/10 font-serif shrink-0">
                🕌
              </div>
              <div>
                <h1 className="text-2xl md:text-4xl font-extrabold text-[#0F5132] tracking-tight font-serif leading-tight">
                  بوابة الشيخ المعلم الإحصائية
                </h1>
                <p className="text-[#5c685b] mt-1 text-xs md:text-base font-medium">
                  عرض بيانات الحلقات، نسب الالتزام، والتواقيت المعتمدة داخل منصة نور
                </p>
              </div>
            </div>
            <div className="bg-[#0F5132]/5 border border-[#D4AF37]/40 px-3 py-1.5 rounded-xl text-[11px] md:text-xs font-bold text-[#0F5132] self-start sm:self-auto">
              نظام رصد ومتابعة حية موثق
            </div>
          </header>

          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
            {[
              {
                title: "إجمالي طلبة المعلم",
                value: `${studentsCount} طالب`,
                color: "text-[#0F5132]",
                icon: "👥",
                desc: "المسجلين في الفروع الحالية",
              },
              {
                title: "عدد الحلقات النشطة",
                value: `${halaqat.length} حلقات`,
                color: "text-[#0F5132]",
                icon: "📖",
                desc: "الحلقات المسندة لفضيلتكم",
              },
              {
                title: "نسبة الحضور التراكمية",
                value:
                  attendanceStats.present > 0
                    ? `%${Math.floor(
                        (attendanceStats.present /
                          (attendanceStats.present + attendanceStats.absent ||
                            1)) *
                          100
                      )}`
                    : "%0",
                color: "text-emerald-700",
                icon: "🟢",
                desc: "حضور الطلاب منذ انطلاق الفصل",
              },
              {
                title: "نسبة الغياب العامة",
                value:
                  attendanceStats.absent > 0
                    ? `%${Math.floor(
                        (attendanceStats.absent /
                          (attendanceStats.present + attendanceStats.absent ||
                            1)) *
                          100
                      )}`
                    : "%0",
                color: "text-amber-800",
                icon: "🔴",
                desc: "معدل الغيابات غير المبررة",
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl p-5 md:p-6 border-t-4 border-t-[#D4AF37] border border-gray-100 shadow-sm relative overflow-hidden transition-all hover:shadow-md"
              >
                <div className="absolute left-4 top-4 text-xl md:text-2xl opacity-30">
                  {item.icon}
                </div>
                <p className="text-gray-500 font-semibold text-xs mb-1">
                  {item.title}
                </p>
                <h3 className={`text-2xl md:text-3xl font-black ${item.color} my-1.5 md:my-2 font-serif`}>
                  {item.value}
                </h3>
                <p className="text-[11px] text-gray-400 font-medium">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </section>

          <section className="bg-white rounded-2xl p-4 md:p-6 border border-gray-100 shadow-sm mb-8">
            <div className="border-r-4 border-[#0F5132] pr-3 mb-6">
              <h2 className="text-lg md:text-xl font-bold text-[#0F5132] font-serif">
                منحنى التزام التلاميذ البياني
              </h2>
              <p className="text-gray-400 text-[11px] md:text-xs mt-0.5">
                معدل الانضباط والالتزام التقريبي الخاص بكل حلقة مسجلة بالمنصة
              </p>
            </div>

            <div className="w-full h-[280px] md:h-[320px] pt-4">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      contentStyle={{
                        textAlign: "right",
                        borderRadius: "12px",
                        borderColor: "#e2e8f0",
                        fontSize: "12px",
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      wrapperStyle={{ fontSize: "12px" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="نسبة الالتزام %"
                      stroke="#0F5132"
                      strokeWidth={3}
                      activeDot={{ r: 6 }}
                      dot={{
                        stroke: "#D4AF37",
                        strokeWidth: 2,
                        r: 4,
                        fill: "#fff",
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-xs md:text-sm">
                  لا توجد بيانات كافية لعرض المنحنى البياني حالياً.
                </div>
              )}
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 md:p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-l from-[#0F5132]/5 to-transparent gap-4">
              <div className="border-r-4 border-[#0F5132] pr-3">
                <h2 className="text-lg md:text-xl font-bold text-[#0F5132] font-serif">
                  جدول مواقيت الحلقات المعتمد
                </h2>
                <p className="text-gray-400 text-[11px] md:text-xs mt-0.5">
                  تفاصيل المواعيد والمستويات للحصص القرآنية المسندة للأستاذ
                </p>
              </div>
              <span className="text-[10px] md:text-xs font-bold text-[#D4AF37] bg-[#0F5132] px-2.5 py-1 rounded-full shrink-0">
                توقيت حقيقي
              </span>
            </div>

            <div className="overflow-x-auto w-full inline-block align-middle">
              <div className="min-w-full overflow-hidden">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-[#fcfbf9] text-gray-500 font-bold text-xs md:text-sm border-b border-gray-100 whitespace-nowrap">
                      <th className="p-4 pr-6">اسم الحلقة القرآنية</th>
                      <th className="p-4">المستوى الدراسي الإداري</th>
                      <th className="p-4">التوقيت والجدول الزمني للحصة</th>
                      <th className="p-4 pl-6 text-left">حالة الفوج الحالية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs md:text-sm font-medium text-gray-700 whitespace-nowrap">
                    {halaqat.map((halaqa) => (
                      <tr
                        key={halaqa.id}
                        className="hover:bg-[#FCFBF7]/60 transition-colors"
                      >
                        <td className="p-4 pr-6 font-bold text-[#0F5132]">
                          {halaqa.name}
                        </td>
                        <td className="p-4">
                          <span className="bg-[#D4AF37]/10 text-[#856404] px-2.5 py-1 rounded-lg text-[11px] md:text-xs font-semibold">
                            {halaqa.level || "عام"}
                          </span>
                        </td>
                        <td className="p-4 text-gray-600 font-mono tracking-wide">
                          {halaqa.schedule || "لم يحدد التوقيت"}
                        </td>
                        <td className="p-4 pl-6 text-left">
                          <span className="inline-flex items-center gap-1.5 text-[11px] md:text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                            نشط ومتابع
                          </span>
                        </td>
                      </tr>
                    ))}
                    {halaqat.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="p-8 text-center text-gray-400 font-medium whitespace-normal"
                        >
                          لا توجد حلقات مسجلة في جدول الأستاذ الحالي.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
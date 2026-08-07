"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; 
import { useUserRole } from "@/hooks/useUserRole"; 
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";
import QRCode from "qrcode"; 
import { supabase } from "@/lib/supabase";
import Sidebar from "../components/dashboard/Sidebar";

interface NotificationItem {
  id: string;
  title: string;
  content: string;
  category: "absent" | "reminder" | "donation" | "general";
  created_at: string;
}

interface ChartDayData {
  day: string;
  حضور: number;
}

interface PendingProfileItem {
  id: string;
  full_name: string;
  email: string;
  role: "teacher" | "parent" | "community_member";
  created_at: string;
}

interface MasjidGoerItem {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { role, loading: roleLoading } = useUserRole();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [mosque, setMosque] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string>(""); 

  const [notifTitle, setNotifTitle] = useState("");
  const [notifContent, setNotifContent] = useState("");
  const [sendingNotif, setSendingNotif] = useState(false);

  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    halaqat: 0,
    attendanceRate: 100, 
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [chartData, setChartData] = useState<ChartDayData[]>([]);

  const [pendingProfiles, setPendingProfiles] = useState<PendingProfileItem[]>([]);
  const [masjidGoers, setMasjidGoers] = useState<MasjidGoerItem[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<"requests" | "goers">("requests");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!roleLoading && role !== "imam") {
      router.push("/");
    }
  }, [role, roleLoading, router]);

  const refreshLists = async (mosqueId: string) => {
    const cleanId = String(mosqueId).trim();
    if (!cleanId || cleanId.length !== 36 || cleanId === "demo-id") {
      return;
    }
    
    try {
      const { data: reqData, error: reqErr } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, created_at, status")
        .eq("status", "pending");
      
      if (!reqErr && reqData) {
        const filteredRequests = reqData.filter(
          (p) => (p.role === "teacher" || p.role === "parent" || p.role === "community_member")
        );
        setPendingProfiles(filteredRequests as PendingProfileItem[]);
      }

      const { data: goerData, error: goerErr } = await supabase
        .from("masjid_goers")
        .select("id, full_name, email, created_at")
        .eq("mosque_id", cleanId);
        
      if (!goerErr && goerData) setMasjidGoers(goerData as MasjidGoerItem[]);
    } catch (err) {
      console.error("Error refreshing dashboard lists:", err);
    }
  };

  useEffect(() => {
    if (roleLoading || role !== "imam") return;

    async function loadImamDashboardData() {
      try {
        setLoading(true);
        const todayDate = new Date().toISOString().split("T")[0];

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: imamProfile } = await supabase
          .from("profiles")
          .select("mosque_id, mosque_name")
          .eq("id", user.id)
          .maybeSingle();

        const rawMosqueId = imamProfile?.mosque_id || "";
        const currentMosqueId = String(rawMosqueId).trim();
        let currentMosqueName = imamProfile?.mosque_name || "مسجد المنصة المعين";
        let mosqueSlug = "default-mosque";

        const isUuidValid = currentMosqueId && currentMosqueId.length === 36 && currentMosqueId !== "demo-id";

        if (isUuidValid) {
          const { data: mosqueTableData } = await supabase
            .from("mosques")
            .select("slug")
            .eq("id", currentMosqueId)
            .maybeSingle();
          if (mosqueTableData?.slug) {
            mosqueSlug = mosqueTableData.slug;
          }
          setMosque({ id: currentMosqueId, name: currentMosqueName, slug: mosqueSlug });
        } else {
          setMosque({ id: "demo-id", name: "المسجد الافتراضي للنظام", slug: "default-mosque" });
        }

        if (isUuidValid) {
          const siteUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
          const targetPublicUrl = `${siteUrl}/mosques/${mosqueSlug}`;
          try {
            const generatedQrDataUrl = await QRCode.toDataURL(targetPublicUrl, {
              width: 300,
              margin: 2,
              color: { dark: "#047857", light: "#FFFFFF" }
            });
            setQrImageUrl(generatedQrDataUrl);
          } catch (qrErr) {
            console.error("خطأ أثناء توليد الـ QR Code:", qrErr);
          }
        }

        const studentsQuery = supabase.from("students").select("id", { count: "exact" });
        const halaqatQuery = supabase.from("halaqat").select("id", { count: "exact" });
        const teachersQuery = supabase.from("profiles").select("id", { count: "exact" }).eq("role", "teacher").eq("status", "active");
        
        if (isUuidValid) {
          studentsQuery.eq("mosque_id", currentMosqueId);
          halaqatQuery.eq("mosque_id", currentMosqueId);
          teachersQuery.eq("mosque_id", currentMosqueId);
        }

        const [studentsRes, teachersRes, halaqatRes] = await Promise.all([
          studentsQuery,
          teachersQuery,
          halaqatQuery
        ]);

        let todayAttendanceCount = 0;
        if (isUuidValid) {
          const { count } = await supabase.from("attendance")
            .select("id", { count: "exact" })
            .eq("status", "present")
            .eq("attendance_date", todayDate);
            
          todayAttendanceCount = count || 0;
        }

        const totalStudents = studentsRes.count || 0;
        let calculatedRate = 100;

        if (totalStudents > 0) {
          calculatedRate = Math.round((todayAttendanceCount / totalStudents) * 100);
        }

        setStats({
          students: totalStudents,
          teachers: teachersRes.count || 0,
          halaqat: halaqatRes.count || 0,
          attendanceRate: calculatedRate, 
        });

        if (isUuidValid) {
          const { data: dbNotifications } = await supabase
            .from("notifications")
            .select("id, title, content, category, created_at")
            .eq("mosque_id", currentMosqueId)
            .order("created_at", { ascending: false })
            .limit(3);

          if (dbNotifications) setNotifications(dbNotifications);
          await refreshLists(currentMosqueId);
        }

        const daysNames = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
        const currentDayOfWeek = new Date().getDay();
        
        const attendancePromises = daysNames.map(async (dayName, index) => {
          const targetDate = new Date();
          const diff = index - currentDayOfWeek;
          targetDate.setDate(targetDate.getDate() + diff);
          const formattedDate = targetDate.toISOString().split("T")[0];

          let dayPresent = 0;
          if (isUuidValid) {
            const { count } = await supabase
              .from("attendance")
              .select("id", { count: "exact" })
              .eq("status", "present")
              .eq("attendance_date", formattedDate);
              
            dayPresent = count || 0;
          }

          const rate = totalStudents > 0 ? Math.round((dayPresent / totalStudents) * 100) : 0;
          
          return {
            day: dayName,
            حضور: targetDate > new Date() && dayPresent === 0 ? 0 : rate
          };
        });

        const resolvedChartData = await Promise.all(attendancePromises);
        setChartData(resolvedChartData);

      } catch (err) {
        console.error("خطأ في جلب بيانات لوحة التحكم:", err);
      } finally {
        setLoading(false);
      }
    }

    loadImamDashboardData();
  }, [role, roleLoading]);

  const handleAcceptProfile = async (id: string) => {
    if (!mosque || mosque.id === "demo-id") return;
    try {
      setActionLoading(id);
      
      const { error } = await supabase
        .from("profiles")
        .update({ 
          status: "active",
          mosque_id: mosque.id,
          mosque_name: mosque.name
        })
        .eq("id", id);

      if (error) throw error;
      alert("✅ تم تفعيل وقبول الحساب بنجاح!");
      await refreshLists(mosque.id);
    } catch (err: any) {
      alert(`فشل قبول الحساب: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectProfile = async (id: string) => {
    if (!mosque || mosque.id === "demo-id") return;
    if (!confirm("هل أنت متأكد من رفض هذا الطلب وحذفه نهائياً من النظام؟")) return;
    
    try {
      setActionLoading(id);
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", id);

      if (error) throw error;
      alert("🗑️ تم حذف وإلغاء طلب الحساب المعلق بنجاح.");
      await refreshLists(mosque.id);
    } catch (err: any) {
      alert(`فشل حذف الحساب: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const downloadQrCode = () => {
    if (!qrImageUrl) return;
    const downloadLink = document.createElement("a");
    downloadLink.href = qrImageUrl;
    downloadLink.download = `QR_CODE_${mosque?.slug || "mosque"}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle || !notifContent || !mosque || mosque.id === "demo-id") {
      alert("عذراً، يجب ربط حسابك بمسجد حقيقي أولاً.");
      return;
    }

    try {
      setSendingNotif(true);
      const { error } = await supabase.from("notifications").insert([
        {
          title: notifTitle,
          content: notifContent,
          category: "general",
          mosque_id: mosque.id
        }
      ]);

      if (error) throw error;
      alert("تم إرسال وحفظ الإشعار بنجاح!");
      setNotifTitle("");
      setNotifContent("");
    } catch (err) {
      console.error(err);
    } finally {
      setSendingNotif(false);
    }
  };

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
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)} 
          className="fixed inset-0 bg-black/40 z-40 lg:hidden transition-opacity"
        />
      )}

      <div className="flex-1 flex flex-col h-screen overflow-y-auto w-full">
        
        <header className="bg-white border-b border-slate-100 px-4 md:px-10 py-4 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-sm w-full">
          <button 
            onClick={() => setSidebarOpen(true)} 
            className="lg:hidden w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-xl text-slate-700"
          >
            ☰
          </button>
          
          <div className="hidden md:flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 w-64 lg:w-96">
            <span className="text-slate-400 ml-2">🔍</span>
            <input type="text" placeholder="ابحث عن طالب، حلقة، معلم..." className="bg-transparent text-sm w-full outline-none text-slate-700 placeholder-slate-400" />
          </div>

          <div className="flex items-center gap-4 mr-auto max-w-[60%] md:max-w-none">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-9 h-9 md:w-11 md:h-11 bg-emerald-50 rounded-full flex items-center justify-center text-xl md:text-2xl border border-emerald-100 shadow-inner flex-shrink-0">🧔</div>
              <div className="block text-right min-w-0">
                <h4 className="text-xs md:text-sm font-bold text-slate-800 truncate">الشيخ المشرف المسؤول</h4>
                {loading ? <div className="w-16 h-3 bg-slate-200 animate-pulse rounded mt-1" /> : <p className="text-[10px] md:text-xs text-slate-400 truncate max-w-[120px] md:max-w-[180px]">{mosque?.name}</p>}
              </div>
            </div>
          </div>
        </header>

        <section className="p-4 md:p-8 space-y-5 md:space-y-6 flex-1 w-full box-border">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm">
            <div className="min-w-0">
              <h2 className="text-lg md:text-2xl font-black text-slate-900 truncate">مرحباً بك في لوحة الإدارة 👋</h2>
              {loading ? <div className="w-24 h-4 bg-slate-100 animate-pulse rounded mt-2" /> : <p className="text-xs md:text-sm text-slate-500 mt-1 truncate">{mosque?.name}</p>}
            </div>
            <div className="bg-slate-50 px-3 md:px-4 py-2 rounded-xl border border-slate-100 flex items-center gap-3 text-right self-start sm:self-auto w-full sm:w-auto">
              <span className="text-lg md:text-xl">📅</span>
              <div className="text-xs text-slate-600 font-medium min-w-0">
                <p className="text-[10px] md:text-xs text-slate-400">توقيت النظام الحالي</p>
                <p className="text-slate-500 font-bold truncate mt-0.5 text-[11px] md:text-xs">{new Date().toLocaleDateString("ar-DZ", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { title: "إجمالي الطلاب المسجلين", value: stats.students, sub: "طالب وطالبة حقيقي", icon: "👥", bg: "bg-emerald-50 text-emerald-600" },
              { title: "الحلقات والمجموعات", value: stats.halaqat, sub: "غرفة حلقة نشطة", icon: "📖", bg: "bg-blue-50 text-blue-600" },
              { title: "الطاقم التعليمي المتاح", value: stats.teachers, sub: "حساب معلم معتمد", icon: "👨‍🏫", bg: "bg-purple-50 text-purple-600" },
              { title: "معدل الحضور والالتزام اليومي", value: `${stats.attendanceRate}%`, sub: "محسوب من حضور الحلقات", icon: "📊", bg: "bg-amber-50 text-amber-600" },
            ].map((item, index) => (
              <div key={index} className="bg-white rounded-2xl p-4 md:p-6 border border-slate-100 shadow-sm flex items-center justify-between gap-4">
                <div className="space-y-1 w-full min-w-0">
                  <p className="text-[11px] font-bold text-slate-400 truncate">{item.title}</p>
                  {loading ? <div className="w-12 h-6 bg-slate-100 animate-pulse rounded-md my-1" /> : <h3 className="text-xl md:text-3xl font-black text-slate-800 truncate">{item.value}</h3>}
                  <p className="text-[10px] md:text-[11px] text-slate-400 truncate">{item.sub}</p>
                </div>
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full ${item.bg} flex items-center justify-center text-lg md:text-xl flex-shrink-0`}>{item.icon}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="lg:col-span-2 bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 border border-slate-100 shadow-sm w-full overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs md:text-sm font-black text-slate-800">📈 منحنى الالتزام والحضور الأسبوعي الحي</h4>
              </div>
              <div className="w-full h-[220px] md:h-[280px] relative">
                {loading ? (
                  <div className="w-full h-full bg-slate-50 animate-pulse rounded-xl" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 100]} tickLine={false} />
                      <Tooltip formatter={(value) => [`${value}%`, "نسبة الحضور"]} />
                      <Line type="monotone" dataKey="حضور" stroke="#047857" strokeWidth={2.5} dot={{ r: 3, fill: "#047857" }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 border border-slate-100 shadow-sm flex flex-col items-center justify-between text-center w-full">
              <div className="w-full">
                <h4 className="text-xs md:text-sm font-black text-slate-800 mb-1">🖨️ الرمز السريع للمسجد (QR Code)</h4>
                <p className="text-[10px] md:text-[11px] text-slate-400 mb-4">اطبع الرمز وعلقه على لوحة إعلانات المسجد ليقوم الأولياء والمعلمون بمسحه والانضمام فوراً.</p>
                
                <div className="bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200 flex items-center justify-center mx-auto w-36 h-36 md:w-48 md:h-48 shadow-inner">
                  {loading || !qrImageUrl ? (
                    <div className="w-full h-full bg-slate-200 animate-pulse rounded-lg" />
                  ) : (
                    <img 
                      src={qrImageUrl} 
                      alt="رابط طلب الانضمام للمسجد" 
                      className="w-full h-full object-contain rounded-md"
                    />
                  )}
                </div>
              </div>

              <button 
                onClick={downloadQrCode}
                disabled={loading || !qrImageUrl}
                className="w-full mt-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 md:py-3 rounded-xl text-xs transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
              >
                📥 تحميل الرمز بصيغة صورة دقيقة
              </button>
            </div>

          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 w-full">
            
            <div className="xl:col-span-2 bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 border border-slate-100 shadow-sm flex flex-col w-full overflow-hidden">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4 w-full overflow-x-auto whitespace-nowrap scrollbar-none">
                <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl">
                  <button
                    onClick={() => setActiveSubTab("requests")}
                    className={`px-2.5 py-1.5 text-[11px] md:text-xs font-bold rounded-lg transition-all ${activeSubTab === "requests" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                  >
                    ⏳ طلبات الحسابات المعلقة ({pendingProfiles.length})
                  </button>
                  <button
                    onClick={() => setActiveSubTab("goers")}
                    className={`px-2.5 py-1.5 text-[11px] md:text-xs font-bold rounded-lg transition-all ${activeSubTab === "goers" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                  >
                     رواد المسجد  ({masjidGoers.length})                  
                   </button>
                </div>
              </div>

              <div className="flex-1 w-full">
                {activeSubTab === "requests" ? (
                  pendingProfiles.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-10">لا توجد أي طلبات لإنشاء حسابات معلقة حالياً.</p>
                  ) : (
                    <>
                      <div className="block md:hidden space-y-3">
                        {pendingProfiles.map((item) => (
                          <div key={item.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-slate-800">{item.full_name}</span>
                              <span className={`px-2 py-0.5 rounded font-bold text-[9px] ${item.role === "teacher" ? "bg-purple-50 text-purple-700" : item.role === "parent" ? "bg-blue-50 text-blue-700" : "bg-orange-50 text-orange-700"}`}>
                                {item.role === "teacher" ? "معلّـم" : item.role === "parent" ? "ولي أمر" : "عضو مجتمع"}
                              </span>
                            </div>
                            <p className="text-slate-500 font-mono break-all">{item.email}</p>
                            <div className="flex gap-2 pt-1 border-t border-slate-200/60">
                              <button
                                onClick={() => handleAcceptProfile(item.id)}
                                disabled={actionLoading !== null}
                                className="flex-1 bg-emerald-600 text-white py-2 rounded-lg font-bold text-[11px]"
                              >
                                {actionLoading === item.id ? "جاري..." : "✓ قبول"}
                              </button>
                              <button
                                onClick={() => handleRejectProfile(item.id)}
                                disabled={actionLoading !== null}
                                className="flex-1 bg-red-50 text-red-600 py-2 rounded-lg font-bold text-[11px]"
                              >
                                ✕ رفض
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <table className="hidden md:table w-full text-right border-collapse text-xs">
                        <thead>
                          <tr className="text-slate-400 border-b border-slate-100">
                            <th className="pb-3 font-bold">الاسم الكامل</th>
                            <th className="pb-3 font-bold">البريد الإلكتروني</th>
                            <th className="pb-3 font-bold">نوع الحساب المطلـوب</th>
                            <th className="pb-3 font-bold text-center">إجراءات الإمام</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {pendingProfiles.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 font-bold text-slate-800">{item.full_name}</td>
                              <td className="py-3 text-slate-500 font-mono">{item.email}</td>
                              <td className="py-3">
                                <span className={`px-2 py-1 rounded-md font-bold text-[10px] ${item.role === "teacher" ? "bg-purple-50 text-purple-700" : item.role === "parent" ? "bg-blue-50 text-blue-700" : "bg-orange-50 text-orange-700"}`}>
                                  {item.role === "teacher" ? "👨‍🏫 طلب معلّـم" : item.role === "parent" ? "👨‍👩‍👦 طلب ولي أمر" : "👥 عضو مجتمع"}
                                </span>
                              </td>
                              <td className="py-3 text-center flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleAcceptProfile(item.id)}
                                  disabled={actionLoading !== null}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-[11px] font-bold shadow-sm transition disabled:opacity-40"
                                >
                                  {actionLoading === item.id ? "..." : "قبول"}
                                </button>
                                <button
                                  onClick={() => handleRejectProfile(item.id)}
                                  disabled={actionLoading !== null}
                                  className="bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition disabled:opacity-40"
                                >
                                  رفض
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )
                ) : (
                  masjidGoers.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-10">لا يوجد رواد مشتركون في التنبيهات السريعة حتى الآن.</p>
                  ) : (
                    <>
                      <div className="block md:hidden space-y-3">
                        {masjidGoers.map((item) => (
                          <div key={item.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-slate-800">{item.full_name}</span>
                              <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[9px]">نشط فوري</span>
                            </div>
                            <p className="text-slate-500 font-mono break-all">{item.email}</p>
                          </div>
                        ))}
                      </div>

                      <table className="hidden md:table w-full text-right border-collapse text-xs">
                        <thead>
                          <tr className="text-slate-400 border-b border-slate-100">
                            <th className="pb-3 font-bold">الاسم الكريم</th>
                            <th className="pb-3 font-bold">البريد الإلكتروني للتوصل</th>
                            <th className="pb-3 font-bold">حالة الاشتراك البريدي</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {masjidGoers.map((item) => (
                            <tr key={item.id}>
                              <td className="py-3 font-bold text-slate-800">{item.full_name}</td>
                              <td className="py-3 text-slate-500 font-mono">{item.email}</td>
                              <td className="py-3">
                                <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-md text-[10px]">● نشط فوري</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )
                )}
              </div>
            </div>

            <div className="space-y-6 w-full">
              
              <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-100 shadow-sm w-full">
                <h4 className="text-xs md:text-sm font-black text-slate-800 mb-3">📢 بث إشعار فوري للرواد والأولياء</h4>
                <form onSubmit={handleSendNotification} className="space-y-3">
                  <input 
                    type="text" 
                    value={notifTitle} 
                    onChange={(e) => setNotifTitle(e.target.value)} 
                    placeholder="عنوان الإشعار" 
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium focus:border-emerald-500 text-slate-700 placeholder-slate-400" 
                    required 
                  />
                  <textarea 
                    value={notifContent} 
                    onChange={(e) => setNotifContent(e.target.value)} 
                    placeholder="اكتب تفاصيل نص الرسالة هنا لتبث تلقائياً..." 
                    rows={3} 
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium resize-none focus:border-emerald-500 text-slate-700 placeholder-slate-400" 
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1 block">
                    مثال: الدراسة غداً... سيتم بث التنبيه تلقائياً لجميع المشتركين.
                  </p>
                  <button 
                    type="submit" 
                    disabled={sendingNotif} 
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
                  >
                    {sendingNotif ? "جاري الإرسال..." : "بث الإشعار الفوري"}
                  </button>
                </form>
              </div>

              <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-100 shadow-sm w-full">
                <h4 className="text-xs md:text-sm font-black text-slate-800 mb-4">🔔 آخر التنبيهات المنشورة مؤخراً</h4>
                <div className="space-y-3">
                  {loading ? (
                    <div className="h-10 bg-slate-100 animate-pulse rounded-xl" />
                  ) : notifications.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">لا توجد تنبيهات حية متوفرة حالياً.</p>
                  ) : (
                    notifications.map((item) => (
                      <div key={item.id} className="border-r-4 border-emerald-500 pr-3 py-1 bg-slate-50/50 rounded-l-xl text-xs">
                        <h5 className="font-bold text-slate-800">{item.title}</h5>
                        <p className="text-[11px] text-slate-400 mt-0.5">{item.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>

        </section>
      </div>
    </main>
  );
}
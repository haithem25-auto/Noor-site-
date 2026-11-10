"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/app/components/dashboard/Sidebar";

interface MaintenanceItem {
  id: string;
  fault_name: string;
  fault_type: string | null;
  description: string | null;
  location: string | null;
  status: "pending" | "in_progress" | "resolved";
  cost: number | null;
  created_at: string;
  resolved_at: string | null;
}

export default function MaintenancePage() {
  const router = useRouter();
  const { role, loading: roleLoading } = useUserRole();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [mosqueId, setMosqueId] = useState<string | null>(null);
  const [mosqueName, setMosqueName] = useState<string>("مسجد المنصة المعين");
  const [maintenanceList, setMaintenanceList] = useState<MaintenanceItem[]>([]);

  // نموذج إضافة عطل جديد
  const [faultName, setFaultName] = useState("");
  const [faultType, setFaultType] = useState("كهرباء");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");

  useEffect(() => {
    if (!roleLoading && role !== "imam") {
      router.push("/");
    }
  }, [role, roleLoading, router]);

  const fetchMaintenanceData = async (currentMosqueId: string) => {
    try {
      const { data, error } = await supabase
        .from("maintenance")
        .select("*")
        .eq("mosque_id", currentMosqueId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setMaintenanceList(data as MaintenanceItem[]);
    } catch (err) {
      console.error("خطأ في جلب بيانات الصيانة:", err);
    }
  };

  useEffect(() => {
    if (roleLoading || role !== "imam") return;

    async function loadInitialData() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: imamProfile } = await supabase
          .from("profiles")
          .select("mosque_id, mosque_name")
          .eq("id", user.id)
          .maybeSingle();

        const rawMosqueId = imamProfile?.mosque_id || "";
        const currentMosqueId = String(rawMosqueId).trim();
        
        if (imamProfile?.mosque_name) {
          setMosqueName(imamProfile.mosque_name);
        }

        const isUuidValid = currentMosqueId && currentMosqueId.length === 36 && currentMosqueId !== "demo-id";

        if (isUuidValid) {
          setMosqueId(currentMosqueId);
          await fetchMaintenanceData(currentMosqueId);
        } else {
          setMosqueId("demo-id");
        }
      } catch (err) {
        console.error("خطأ في تحميل بيانات الصفحة:", err);
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, [role, roleLoading]);

  const handleAddFault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mosqueId || mosqueId === "demo-id") {
      alert("عذراً، يجب ربط حسابك بمسجد حقيقي لتسجيل بلاغات الصيانة.");
      return;
    }

    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const numericCost = cost ? parseFloat(cost) : 0;

      const { error } = await supabase.from("maintenance").insert([
        {
          fault_name: faultName,
          fault_type: faultType,
          location: location,
          description: description,
          cost: numericCost,
          mosque_id: mosqueId,
          reported_by: user.id,
          status: "pending",
        },
      ]);

      if (error) throw error;

      alert("✅ تم تسجيل بلاغ العطل بنجاح!");
      setFaultName("");
      setLocation("");
      setDescription("");
      setCost("");
      setFaultType("كهرباء");

      await fetchMaintenanceData(mosqueId);
    } catch (err: any) {
      alert(`فشل تسجيل العطل: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: "pending" | "in_progress" | "resolved") => {
    if (!mosqueId) return;
    try {
      setUpdatingId(id);
      const updateData: any = { status: newStatus };
      
      if (newStatus === "resolved") {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("maintenance")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      alert("🔄 تم تحديث حالة العطل بنجاح!");
      await fetchMaintenanceData(mosqueId);
    } catch (err: any) {
      alert(`فشل التحديث: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteFault = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا البلاغ نهائياً؟")) return;
    if (!mosqueId) return;

    try {
      setUpdatingId(id);
      const { error } = await supabase.from("maintenance").delete().eq("id", id);
      if (error) throw error;

      alert("🗑️ تم حذف البلاغ بنجاح.");
      await fetchMaintenanceData(mosqueId);
    } catch (err: any) {
      alert(`فشل الحذف: ${err.message}`);
    } finally {
      setUpdatingId(null);
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

  // إحصائيات سريعة للأعطال
  const totalFaults = maintenanceList.length;
  const pendingFaults = maintenanceList.filter((m) => m.status === "pending").length;
  const inProgressFaults = maintenanceList.filter((m) => m.status === "in_progress").length;
  const resolvedFaults = maintenanceList.filter((m) => m.status === "resolved").length;
  const totalCost = maintenanceList.reduce((acc, curr) => acc + (curr.cost || 0), 0);

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
        
        {/* Header */}
        <header className="bg-white border-b border-slate-100 px-4 md:px-10 py-4 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-sm w-full">
          <button 
            onClick={() => setSidebarOpen(true)} 
            className="lg:hidden w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-xl text-slate-700"
          >
            ☰
          </button>
          
          <div className="hidden md:flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 w-64 lg:w-96">
            <span className="text-slate-400 ml-2">🔍</span>
            <input type="text" placeholder="ابحث في الأعطال أو مواقع الصيانة..." className="bg-transparent text-sm w-full outline-none text-slate-700 placeholder-slate-400" />
          </div>

          <div className="flex items-center gap-4 mr-auto max-w-[60%] md:max-w-none">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-9 h-9 md:w-11 md:h-11 bg-emerald-50 rounded-full flex items-center justify-center text-xl md:text-2xl border border-emerald-100 shadow-inner flex-shrink-0">🧔</div>
              <div className="block text-right min-w-0">
                <h4 className="text-xs md:text-sm font-bold text-slate-800 truncate">الشيخ المشرف المسؤول</h4>
                {loading ? <div className="w-16 h-3 bg-slate-200 animate-pulse rounded mt-1" /> : <p className="text-[10px] md:text-xs text-slate-400 truncate max-w-[120px] md:max-w-[180px]">{mosqueName}</p>}
              </div>
            </div>
          </div>
        </header>

        <section className="p-4 md:p-8 space-y-5 md:space-y-6 flex-1 w-full box-border">
          
          {/* Page Title Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm">
            <div className="min-w-0">
              <h2 className="text-lg md:text-2xl font-black text-slate-900 truncate">🛠️ إدارة صيانة وأعطال المسجد</h2>
              <p className="text-xs md:text-sm text-slate-500 mt-1">تسجيل ومتابعة أعطال المسجد وتكاليف إصلاحها حتى الاكتمال.</p>
            </div>
            <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100 flex items-center gap-2 text-right">
              <span className="text-sm font-bold text-emerald-700">إجمالي المصاريف:</span>
              <span className="text-sm font-black text-slate-800">{totalCost.toLocaleString()} دج</span>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { title: "إجمالي البلاغات المسجلة", value: totalFaults, sub: "سجل الأعطال الكلي", icon: "📋", bg: "bg-blue-50 text-blue-600" },
              { title: "الأعطال المعلقة", value: pendingFaults, sub: "تحتاج تدخلاً فورياً", icon: "⏳", bg: "bg-amber-50 text-amber-600" },
              { title: "قيد الإصلاح حالياً", value: inProgressFaults, sub: "جاري العمل عليها", icon: "🔧", bg: "bg-purple-50 text-purple-600" },
              { title: "البلاغات المنجزة (المنتهية)", value: resolvedFaults, sub: "تم إصلاحها بالكامل", icon: "✅", bg: "bg-emerald-50 text-emerald-600" },
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

          {/* Main Content: Add Fault Form & Faults Table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Form: تسجيل عطل جديد */}
            <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 border border-slate-100 shadow-sm h-fit">
              <h4 className="text-xs md:text-sm font-black text-slate-800 mb-4 pb-2 border-b border-slate-100">➕ تسجيل عطل جديد للمسجد</h4>
              
              <form onSubmit={handleAddFault} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">اسم العطل *</label>
                  <input 
                    type="text" 
                    value={faultName}
                    onChange={(e) => setFaultName(e.target.value)}
                    placeholder="مثال: عطل في مكيف مصلى الرجال"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-medium text-slate-700"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">نوع العطل</label>
                  <select 
                    value={faultType}
                    onChange={(e) => setFaultType(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-medium text-slate-700"
                  >
                    <option value="كهرباء">⚡ كهرباء</option>
                    <option value="سباكة">🚰 سباكة ومياه</option>
                    <option value="تكييف وتدفئة">❄️ تكييف وتدفئة</option>
                    <option value="فرش وسجاد">🧵 فرش وسجاد</option>
                    <option value="أجهزة صوتية">📢 أجهزة صوتية ومكبرات</option>
                    <option value="أخرى">📌 أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">مكان العطل داخل المسجد</label>
                  <input 
                    type="text" 
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="مثال: مصلى الرجال - الجهة الشرقية"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-medium text-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">تكلفة الصيانة المقدرة/الفعلية (دج)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-medium text-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">وصف تفصيلي للمشكلة</label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="اكتب تفاصيل العطل وما يحتاجه الإصلاح..."
                    rows={3}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none resize-none focus:border-emerald-500 font-medium text-slate-700"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={submitting}
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 mt-2"
                >
                  {submitting ? "جاري الحفظ والتسجيل..." : "حفظ وإرسال بلاغ العطل"}
                </button>
              </form>
            </div>

            {/* Table: قائمة الأعطال ومتابعتها */}
            <div className="lg:col-span-2 bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 border border-slate-100 shadow-sm flex flex-col">
              <h4 className="text-xs md:text-sm font-black text-slate-800 mb-4 pb-2 border-b border-slate-100">📋 سجل الأعطال ومتابعة الإصلاح</h4>

              <div className="flex-1 overflow-x-auto">
                {loading ? (
                  <div className="space-y-3">
                    <div className="h-12 bg-slate-100 animate-pulse rounded-xl" />
                    <div className="h-12 bg-slate-100 animate-pulse rounded-xl" />
                    <div className="h-12 bg-slate-100 animate-pulse rounded-xl" />
                  </div>
                ) : maintenanceList.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-16">لا توجد أي بلاغات صيانة مسجلة حتى الآن للمسجد.</p>
                ) : (
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-100">
                        <th className="pb-3 font-bold">العطل والمكان</th>
                        <th className="pb-3 font-bold">النوع والتكلفة</th>
                        <th className="pb-3 font-bold">الحالة</th>
                        <th className="pb-3 font-bold text-center">تحديث الإمام والتحكم</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {maintenanceList.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5">
                            <p className="font-bold text-slate-800 text-sm">{item.fault_name}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">📍 {item.location || "المسجد عموماً"}</p>
                            {item.description && <p className="text-[11px] text-slate-500 mt-1 italic">"{item.description}"</p>}
                          </td>
                          <td className="py-3.5">
                            <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded text-[10px] mb-1">
                              {item.fault_type || "أخرى"}
                            </span>
                            <p className="font-black text-emerald-700 text-xs">{item.cost ? `${item.cost.toLocaleString()} دج` : "مجاني / غير محدد"}</p>
                          </td>
                          <td className="py-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-bold text-[10px] ${
                              item.status === "resolved" 
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                                : item.status === "in_progress" 
                                ? "bg-purple-50 text-purple-700 border border-purple-100" 
                                : "bg-amber-50 text-amber-700 border border-amber-100"
                            }`}>
                              {item.status === "resolved" ? "✅ تم الإصلاح" : item.status === "in_progress" ? "🔧 قيد الإصلاح" : "⏳ معلق"}
                            </span>
                          </td>
                          <td className="py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {item.status !== "in_progress" && item.status !== "resolved" && (
                                <button
                                  onClick={() => handleUpdateStatus(item.id, "in_progress")}
                                  disabled={updatingId === item.id}
                                  className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-[10px] font-bold transition disabled:opacity-40"
                                >
                                  بدء الإصلاح
                                </button>
                              )}
                              {item.status !== "resolved" && (
                                <button
                                  onClick={() => handleUpdateStatus(item.id, "resolved")}
                                  disabled={updatingId === item.id}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded text-[10px] font-bold transition disabled:opacity-40"
                                >
                                  إنهاء وإصلاح
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteFault(item.id)}
                                disabled={updatingId === item.id}
                                className="bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded text-[10px] font-bold transition disabled:opacity-40"
                              >
                                حذف
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>

        </section>
      </div>
    </main>
  );
}
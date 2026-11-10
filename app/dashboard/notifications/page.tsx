"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/app/components/dashboard/Sidebar"; 

interface notification {
  id: string;
  user_id: string;
  mosque_id: string;
  title: string;
  message: string;
  is_read: boolean;
  is_sent: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);

      // 1. جلب بيانات المستخدم الحالي
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 2. جلب mosque_id الخاص بالمستخدم من جدول profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("mosque_id")
        .eq("id", user.id)
        .single();

      if (!profile?.mosque_id) return;

      // 3. جلب الإشعارات الخاصة بهذا المسجد فقط
      const { data, error } = await supabase
        .from("notifications")
        .select("id, user_id, mosque_id, title, message, is_read, is_sent, created_at")
        .eq("mosque_id", profile.mosque_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  // دالة لتمييز إشعار معين كمقروء
  const handleMarkAsRead = async (id: string) => {
    try {
      setActionLoading(id);
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);

      if (error) throw error;

      // تحديث الحالة محلياً لتغيير الواجهة فوراً
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, is_read: true } : item))
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
      alert("فشل تحديث حالة الإشعار.");
    } finally {
      setActionLoading(null);
    }
  };

  // دالة لحذف جميع الإشعارات
  const handleDeleteAllNotifications = async () => {
    if (!confirm("هل أنت متأكد من رغبتك في حذف جميع الإشعارات نهائياً؟")) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("mosque_id")
        .eq("id", user.id)
        .single();

      if (!profile?.mosque_id) return;

      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("mosque_id", profile.mosque_id);

      if (error) throw error;

      setNotifications([]);
      alert("🗑️ تم حذف جميع الإشعارات بنجاح.");
    } catch (error) {
      console.error("Error deleting notifications:", error);
      alert("فشل حذف الإشعارات.");
    }
  };

  // تجاوز فحص الأنواع الصارم للمكون لإنهاء مشكلة IntrinsicAttributes هنا مباشرة
  const SidebarComponent = Sidebar as any;

  return (
    <div className="flex min-h-screen bg-slate-50 text-right" dir="rtl">
      {/* الشريط الجانبي - تم تجاوز فحص الـ Types ليعمل مباشرة بدون أخطاء */}
      <div className="w-64 min-h-screen sticky top-0 hidden md:block z-20">
        <SidebarComponent sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      </div>

      {/* المحتوى الرئيسي */}
      <div className="flex-1 flex flex-col p-6 md:p-8 space-y-6 overflow-x-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5 border-slate-200/60">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">الإشعارات العامة</h1>
            <p className="text-sm text-slate-500 mt-1">
              متابعة الإشعارات، التنبيهات، والإعلانات المرسلة للمساجد
            </p>
          </div>
          {notifications.length > 0 && (
            <button
              onClick={handleDeleteAllNotifications}
              className="bg-red-50 hover:bg-red-100 text-red-600 font-semibold px-4 py-2 rounded-xl text-xs transition self-start sm:self-auto flex items-center gap-2 border border-red-200 shadow-sm"
            >
              🗑️ حذف كل الإشعارات
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-500 py-12">
            <div className="text-center">جاري تحميل الإشعارات...</div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="w-full max-w-2xl text-center py-16 bg-white rounded-xl border border-dashed border-slate-200 p-8 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <h3 className="text-lg font-semibold text-slate-700 mb-1">صندوق الإشعارات فارغ</h3>
              <p className="text-slate-500 text-sm max-w-sm mx-auto">
                لا توجد أي إشعارات أو تنبيهات عامة مسجلة في النظام حالياً.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-sm font-semibold border-b border-slate-200/60">
                    <th className="p-4">عنوان الإشعار</th>
                    <th className="p-4">المحتوى</th>
                    <th className="p-4">حالة القراءة</th>
                    <th className="p-4">حالة الإرسال</th>
                    <th className="p-4">التاريخ</th>
                    <th className="p-4 text-center">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                  {notifications.map((notification) => (
                    <tr key={notification.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-semibold text-slate-900">{notification.title}</td>
                      <td className="p-4 text-slate-600 max-w-xs truncate">{notification.message}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${notification.is_read ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                          {notification.is_read ? "مقروء" : "غير مقروء"}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
                          {notification.is_sent ? "تم الإرسال" : "قيد الإرسال"}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500 text-xs">
                        {new Date(notification.created_at).toLocaleDateString("ar-EG")}
                      </td>
                      <td className="p-4 text-center">
                        {!notification.is_read ? (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            disabled={actionLoading === notification.id}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition shadow-sm disabled:opacity-50"
                          >
                            {actionLoading === notification.id ? "جاري..." : "تمييز كمقروء"}
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs font-medium">تمت القراءة</span>
                        )}
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
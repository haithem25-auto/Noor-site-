"use client";

import { Dispatch, SetStateAction } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUserRole } from "@/hooks/useUserRole";

type SidebarProps = {
  sidebarOpen: boolean;
  setSidebarOpen: Dispatch<SetStateAction<boolean>>;
};

type NavItem = {
  name: string;
  href: string;
};

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
}: SidebarProps) {
  const pathname = usePathname();

  const { role, loading: roleLoading } = useUserRole();

  // 1. مصفوفة أزرار لوحة الإمام
  const imamNavItems: NavItem[] = [
    { name: "الرئيسية", href: "/dashboard" },
    { name: "الطلبة", href: "/dashboard/students" },
    { name: "الحلقات", href: "/dashboard/halaqat" },
    { name: "إشعارات المسجد", href: "/dashboard/notifications" },
    { name: "الإعدادات", href: "/dashboard/settings" },
  ];

  // 2. مصفوفة أزرار لوحة المعلم المحددة بدقة
  const teacherNavItems: NavItem[] = [
    { name: "الرئيسية (اللوحة الإحصائية)", href: "/teacher" },
    { name: "إدارة الطلاب والحضور", href: "/teacher/student-absent" },
    { name: "إدارة الحلقات", href: "/teacher/halaqat" },
    { name: "طلبات الانضمام", href: "/teacher/join-requests" },
    { name: "إشعارات وتصريحات الغياب", href: "/teacher/absent-notifications" },
    { name: "إعدادات المعلم", href: "/teacher/settings" },
  ];

  let navItems: NavItem[] = [];

  if (role === "imam") {
    navItems = imamNavItems;
  } else if (role === "teacher") {
    navItems = teacherNavItems;
  }

  return (
    <aside
      className={`fixed lg:static z-50 top-0 right-0 h-screen w-[280px]
      bg-[#0f172a] text-white p-6 flex flex-col
      transition-transform duration-300
      ${sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}`}
    >
      {/* Logo */}
      <div className="mb-12">
        <h1 className="text-4xl font-black text-[#2D6A4F]">نور</h1>
        <p className="text-gray-400 mt-3 text-sm leading-6">
          منصة إدارة المساجد والمدارس القرآنية
        </p>
      </div>

      {/* Navigation */}
      <div className="space-y-3 flex-1">
        {roleLoading ? (
          <div className="space-y-3 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-white/5 rounded-2xl w-full" />
            ))}
          </div>
        ) : (
          navItems.map((item, index) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={index}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`block w-full text-right px-5 py-4 rounded-2xl transition font-medium text-sm ${
                  isActive
                    ? "bg-[#047857] text-white shadow-md font-bold"
                    : "hover:bg-white/10 text-gray-300"
                }`}
              >
                {item.name}
              </Link>
            );
          })
        )}
      </div>
    </aside>
  );
}
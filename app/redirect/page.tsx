"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function RedirectPage() {
  const router = useRouter();

  useEffect(() => {
    async function checkRole() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // محاولة جلب الـ profile
      let { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      // ✨ إذا لم يجد ملف شخصي (يعني مستخدم دخل أول مرة عبر غوغل)
      if (!profile) {
        // نقوم بإنشاء بروفايل جديد له برتبة افتراضية (مثلاً parent)
        const { data: newProfile, error: insertError } = await supabase
          .from("profiles")
          .insert([
            { 
              id: user.id, 
              email: user.email,
              role: "parent" // الرتبة الافتراضية لمن يسجل عبر غوغل (يمكنك تغييرها)
            }
          ])
          .select("role")
          .single();

        if (insertError) {
          console.error("Error creating profile:", insertError.message);
          router.push("/login");
          return;
        }
        
        profile = newProfile;
      }

      // التوجيه بناءً على الرتبة
      switch (profile?.role) {
        case "imam":
          router.push("/dashboard");
          break;

        case "teacher":
          router.push("/teacher");
          break;

        case "parent":
          router.push("/parent");
          break;

        default:
          router.push("/login");
      }
    }

    checkRole();
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f8fafc] text-gray-600 font-medium">
      <div className="flex flex-col items-center gap-3">
        {/* أنيميشن تحميل بسيط ليعطي طابعاً احترافياً بدلاً من الصفحة السوداء */}
        <svg className="animate-spin h-8 w-8 text-[#047857]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span>جاري فحص الحساب وتوجيهك...</span>
      </div>
    </main>
  );
}
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false); // حالة تحميل منفصلة لغوغل
  const router = useRouter();

  // 1. دالة تسجيل الدخول التقليدية
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    
    if (!email || !password) {
      alert("الرجاء ملء جميع الحقول");
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/redirect");
  }

  // 2. دالة التسجيل/الدخول عبر Google (تم تحديثها لحل مشكلة تبادل الرموز)
  async function handleGoogleLogin() {
    setIsGoogleLoading(true);
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // سيتم توجيه المستخدم إلى صفحة الـ redirect بعد نجاح تسجيل الدخول في غوغل
        redirectTo: `${window.location.origin}/redirect`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      alert(error.message);
      setIsGoogleLoading(false);
    }
  }

  // 3. دالة نسيت كلمة السر
  async function handleForgotPassword() {
    if (!email) {
      alert("الرجاء كتابة بريدك الإلكتروني أولاً في حقل البريد الإلكتروني لإرسال رابط الاستعادة.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // الرابط الذي سينتقل إليه المستخدم بعد الضغط على الرسالة في إيميله لتعيين كلمة سر جديدة
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) {
      alert(error.message);
    } else {
      alert("تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني بنجاح.");
    }
  }

  return (
    <main dir="rtl" className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6 text-right">
      
      <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 w-full max-w-md transition-all">
        
        <h1 className="text-3xl font-black mb-8 text-center text-gray-800">
          تسجيل الدخول
        </h1>

        <form onSubmit={handleLogin} className="space-y-4">
          
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2 mr-1">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading || isGoogleLoading}
              className="w-full border border-gray-200 rounded-2xl px-4 h-14 outline-none focus:border-[#047857] focus:ring-2 focus:ring-[#047857]/20 transition disabled:bg-gray-50"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2 mr-1">
              <label className="block text-sm font-medium text-gray-600">
                كلمة المرور
              </label>
              {/* زر نسيت كلمة السر */}
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs font-semibold text-[#047857] hover:underline focus:outline-none"
              >
                نسيت كلمة السر؟
              </button>
            </div>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading || isGoogleLoading}
              className="w-full border border-gray-200 rounded-2xl px-4 h-14 outline-none focus:border-[#047857] focus:ring-2 focus:ring-[#047857]/20 transition disabled:bg-gray-50"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || isGoogleLoading}
            className="w-full bg-[#047857] hover:bg-[#065f46] text-white h-14 rounded-2xl font-bold transition mt-6 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-[#047857]/10"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                جاري الدخول...
              </span>
            ) : (
              "تسجيل الدخول"
            )}
          </button>
        </form>

        {/* خط فاصل بين الدخول العادي ودخول غوغل */}
        <div className="relative flex py-5 items-center my-2">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="flex-shrink mx-4 text-gray-400 text-sm">أو عبر</span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>

        {/* زر تسجيل الدخول بواسطة Google */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading || isGoogleLoading}
          className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 h-14 rounded-2xl font-semibold transition flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
        >
          {isGoogleLoading ? (
            <svg className="animate-spin h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <>
              {/* أيقونة غوغل SVG */}
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M5.266 9.765A7.077 7.077 0 0112 4.909c1.69 0 3.218.6 4.418 1.582l3.51-3.51C17.642 1.073 14.96 0 12 0 7.354 0 3.392 2.673 1.48 6.564l3.786 3.201z"
                />
                <path
                  fill="#4285F4"
                  d="M23.491 12.275c0-.796-.073-1.564-.191-2.305H12v4.51h6.464a5.523 5.523 0 01-2.395 3.618l3.723 2.891c2.177-2.005 3.423-4.955 3.423-8.714z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.266 14.235L1.48 17.436A11.936 11.936 0 0012 24c2.96 0 5.642-1.073 7.714-2.927l-3.723-2.891a7.121 7.121 0 01-3.991 1.118 7.077 7.077 0 01-6.734-4.855z"
                />
                <path
                  fill="#34A853"
                  d="M12 4.909c1.69 0 3.218.6 4.418 1.582l3.51-3.51C17.642 1.073 14.96 0 12 0 7.354 0 3.392 2.673 1.48 6.564l3.786 3.201A7.077 7.077 0 0112 4.91z"
                />
              </svg>
              <span>المتابعة باستخدام Google</span>
            </>
          )}
        </button>

      </div>

    </main>
  );
}
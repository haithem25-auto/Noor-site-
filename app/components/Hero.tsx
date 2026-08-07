"use client";

import { motion } from "framer-motion";
import Link from "next/link"; // تم إضافة الاستيراد هنا للربط بين الصفحات

export default function Hero() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="relative overflow-hidden flex flex-col items-center justify-center text-center px-6 py-24 md:py-28 "
    >
      {/* Background Glow */}
      <div className="absolute top-[-100px] left-[-100px] w-[350px] h-[350px] bg-green-200 rounded-full blur-3xl opacity-30"></div>
      <div className="absolute bottom-[-120px] right-[-100px] w-[350px] h-[350px] bg-emerald-300 rounded-full blur-3xl opacity-20"></div>

      <div className="bg-green-100 text-[#047857] px-4 py-2 rounded-full text-sm font-semibold mb-6 relative z-10">
        اول منصة saas عربية اسلامية حديثة للمساجد و المذارس القرانية 
      </div>

      <h1 className="text-4xl sm:text-5xl md:text-7xl font-black leading-tight max-w-5xl relative z-10">
        إدارة المساجد
        <span className="text-[#047857]"> بأسلوب عصري </span>
        وذكي
      </h1>

      <p className="mt-8 text-base md:text-lg text-gray-600 max-w-2xl leading-8 relative z-10">
        نور منصة رقمية حديثة تربط الإمام والمعلم وولي الأمر
        في نظام موحد للحضور والإشعارات والتقارير وإدارة الحلقات.
      </p>

      <div className="flex gap-4 mt-10 flex-wrap justify-center relative z-10">

        {/* تم تعديل الزر وتغليفه بـ Link ليوجه الإمام مباشرة إلى صفحة التسجيل */}
        <Link href="/register">
          <button className="bg-[#047857] text-white px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-[#065f46] transition w-full sm:w-auto">
            ابدأ مجانًا
          </button>
        </Link>

        <button className="border border-gray-300 px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-gray-100 transition">
          مشاهدة النظام
        </button>

      </div>

    </motion.section>
  );
}
"use client";

import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import { motion } from "framer-motion";
import Features from "./components/Features";
import DashboardPreview from "./components/DashboardPreview";
import TeacherUI from "./components/TeacherUI";
export default function Home() {
  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#1F2937]">

      <Navbar />
      
      {/* Hero Section */}
      <Hero />
      {/* Features Section */}

      <Features />

      {/* Dashboard Preview */}
      <DashboardPreview />

      {/* Teacher Mobile UI */}
      <TeacherUI />
      {/* CTA Section */}
<section className="px-6 py-28 bg-[#f8fafc]">

  <div className="max-w-6xl mx-auto relative overflow-hidden rounded-[40px] bg-gradient-to-br from-[#047857] to-[#065f46] p-12 md:p-20 text-white shadow-2xl">

    {/* Glow Effects */}
    <div className="absolute top-[-100px] right-[-100px] w-[300px] h-[300px] bg-white/10 rounded-full blur-3xl"></div>

    <div className="absolute bottom-[-120px] left-[-100px] w-[300px] h-[300px] bg-emerald-300/20 rounded-full blur-3xl"></div>

    <div className="relative z-10 text-center">

      <div className="inline-block bg-white/10 border border-white/20 backdrop-blur-md px-5 py-2 rounded-full text-sm font-semibold mb-8">
        مستقبل إدارة المساجد يبدأ هنا
      </div>

      <h2 className="text-4xl md:text-6xl font-black leading-tight mb-8 max-w-4xl mx-auto">
        حوّل إدارة المسجد والمدرسة القرآنية
        إلى تجربة رقمية حديثة
      </h2>

      <p className="text-lg md:text-xl text-white/80 leading-9 max-w-3xl mx-auto mb-12">
        نور يساعد الأئمة والمعلمين والأولياء
        على التواصل وإدارة الحضور والإشعارات
        والتقارير بطريقة سهلة واحترافية.
      </p>

      <div className="flex flex-wrap justify-center gap-5">

        <button className="bg-white text-[#047857] px-8 py-4 rounded-2xl text-lg font-bold hover:scale-105 transition">
          ابدأ مجانًا
        </button>

        <button className="border border-white/30 bg-white/10 backdrop-blur-md px-8 py-4 rounded-2xl text-lg font-bold hover:bg-white/20 transition">
          طلب عرض توضيحي
        </button>

      </div>

    </div>

  </div>

</section>
{/* Footer */}
<footer className="bg-[#0f172a] text-white px-6 py-20">

  <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">

    {/* Brand */}
    <div>

      <h2 className="text-4xl font-black text-[#2D6A4F] mb-6">
        نور
      </h2>

      <p className="text-gray-400 leading-8">
        منصة SaaS حديثة لإدارة المساجد
        والمدارس القرآنية بطريقة احترافية
        وعصرية.
      </p>

    </div>

    {/* Links */}
    <div>

      <h3 className="text-xl font-bold mb-5">
        المنصة
      </h3>

      <div className="space-y-3 text-gray-400">

        <p>الرئيسية</p>
        <p>المميزات</p>
        <p>لوحة التحكم</p>
        <p>الأسعار</p>

      </div>

    </div>

    {/* Links */}
    <div>

      <h3 className="text-xl font-bold mb-5">
        الخدمات
      </h3>

      <div className="space-y-3 text-gray-400">

        <p>إدارة الحضور</p>
        <p>الإشعارات</p>
        <p>QR للمساجد</p>
        <p>التقارير</p>

      </div>

    </div>

    {/* Contact */}
    <div>

      <h3 className="text-xl font-bold mb-5">
        تواصل معنا
      </h3>

      <div className="space-y-3 text-gray-400">

        <p>haithembakhouche23@gmail.com</p>
        <p>+213 562 954 676</p>
        <p>الجزائر</p>

      </div>

    </div>

  </div>

  {/* Bottom */}
  <div className="border-t border-white/10 mt-16 pt-8 text-center text-gray-500">

    © 2026 Noor Platform. جميع الحقوق محفوظة.

  </div>

</footer>

    </main>
  );
}
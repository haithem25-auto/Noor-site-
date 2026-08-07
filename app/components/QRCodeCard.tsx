"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface QRCodeCardProps {
  slug: string; // 💡 أصبحنا نستقبل الـ slug الفريد للمسجد هنا
}

export default function QRCodeCard({ slug }: QRCodeCardProps) {
  const [qr, setQr] = useState("");

  useEffect(() => {
    // 💡 بناء الرابط بشكل ديناميكي ليتغير تلقائياً بين السيرفر المحلي (localhost) والسيرفر الحقيقي عند الرفع (Production)
    const fullUrl = `${window.location.origin}/mosques/${slug}`;
    
    QRCode.toDataURL(fullUrl)
      .then(setQr)
      .catch((err) => console.error("خطأ أثناء توليد الـ QR Code:", err));
  }, [slug]);

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
      <h2 className="font-black text-slate-800 mb-4 text-sm flex items-center gap-1.5">
        <span>🕌</span> الـ QR Code الرسمي للمسجد
      </h2>

      {qr ? (
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <img
            src={qr}
            alt="Mosque QR Code"
            className="w-48 h-48 object-contain"
          />
        </div>
      ) : (
        <div className="w-48 h-48 bg-slate-50 border border-dashed rounded-2xl animate-pulse flex items-center justify-center text-xs text-slate-400">
          جاري توليد الرمز...
        </div>
      )}
      
      <p className="text-[11px] text-slate-400 mt-3 max-w-[200px] leading-relaxed">
        يمكن لرواد المسجد والمعلمين وأولياء الأمور مسح هذا الرمز للتسجيل فوراً في المنصة.
      </p>
    </div>
  );
}
"use client";

import { motion } from "framer-motion";

const features = [
  {
    icon: "📍",
    title: "إدارة عبر GPS",
    desc: "ربط المساجد الحقيقية بالخريطة مع إمكانية الوصول السريع والتسجيل الذكي.",
  },
  {
    icon: "📲",
    title: "QR ذكي للمسجد",
    desc: "تسجيل الحضور والإشعارات من خلال QR موحد.",
  },
  {
    icon: "📊",
    title: "تقارير وتحليلات",
    desc: "إحصائيات وتقارير شهرية بطريقة احترافية.",
  },
  {
    icon: "🔔",
    title: "إشعارات ذكية",
    desc: "إرسال تنبيهات الغياب والتحديثات للأولياء تلقائيًا.",
  },
  {
    icon: "👨‍🏫",
    title: "واجهة معلم سريعة",
    desc: "تجربة Mobile First سهلة وعملية.",
  },
  {
    icon: "⚡",
    title: "أتمتة كاملة",
    desc: "تشغيل الإشعارات والتقارير باستخدام n8n.",
  },
];

export default function Features() {
  return (
    <section className="px-6 py-24 bg-white">

      <div className="text-center mb-16">

        <h2 className="text-4xl font-black mb-6">
          لماذا نور؟
        </h2>

        <p className="text-gray-600 max-w-2xl mx-auto text-lg leading-8">
          منصة مصممة خصيصًا لتنظيم المساجد والمدارس القرآنية
          بأسلوب حديث وسهل الاستخدام.
        </p>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">

        {features.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            viewport={{ once: true }}
            whileHover={{ y: -8 }}
            className="bg-[#f8fafc] p-8 rounded-3xl border border-gray-100 hover:shadow-2xl transition"
          >

            <div className="text-4xl mb-5">
              {item.icon}
            </div>

            <h3 className="text-2xl font-bold mb-4">
              {item.title}
            </h3>

            <p className="text-gray-600 leading-8">
              {item.desc}
            </p>

          </motion.div>
        ))}

      </div>

    </section>
  );
}
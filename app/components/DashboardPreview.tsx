import Link from "next/link";

export default function DashboardPreview() {
  // القائمة الجانبية المحدثة تشمل "رواد المسجد" مع المسارات المتوقعة
  const sidebarItems = [
    { name: "الرئيسية", path: "/dashboard/imam" },
    { name: "الطلبة", path: "/dashboard/imam/students" },
    { name: "المعلمون", path: "/dashboard/imam/teachers" },
    { name: "رواد المسجد", path: "/dashboard/imam/visitors" }, // الميزة الجديدة المضافة لزيادة التفاعل
    { name: "الحضور", path: "/dashboard/imam/attendance" },
    { name: "التقارير", path: "/dashboard/imam/reports" },
    { name: "الإشعارات", path: "/dashboard/imam/notifications" },
  ];

  const stats = [
    { title: "عدد الطلبة", value: "245" },
    { title: "نسبة الحضور", value: "92%" },
    { title: "عدد المعلمين", value: "12" },
  ];

  const chartHeights = [60, 80, 50, 90, 70, 85];

  return (
    <section className="px-6 py-28 bg-[#f8fafc]">
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-black mb-6 text-slate-900">
          لوحة تحكم متكاملة
        </h2>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-8">
          تجربة إدارة حديثة تساعد الإمام والمعلمين على متابعة الطلاب والحضور والإشعارات بسهولة.
        </p>
      </div>

      <div className="max-w-7xl mx-auto bg-white rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden">
        
        {/* Top Bar */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-white">
          <div>
            <h3 className="text-2xl font-bold text-slate-800">
              لوحة الإمام
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              مسجد النور الكبير
            </p>
          </div>

          {/* التعديل وفقاً لسيناريو العمل: زر ينقل المستخدم مباشرة لصفحة التسجيل */}
          <Link 
            href="/register"
            className="bg-[#047857] hover:bg-[#065f46] text-white px-5 py-2.5 rounded-xl font-medium transition-colors duration-200 shadow-sm"
          >
            ابدأ مجاناً
          </Link>
        </div>

        {/* Dashboard Body */}
        <div className="grid grid-cols-1 lg:grid-cols-4 min-h-[500px] overflow-hidden">
          
          {/* Sidebar */}
          <div className="bg-[#0f172a] text-white p-6 flex flex-col justify-between">
            <div className="space-y-6">
              <h2 className="text-3xl font-black text-[#4ade80] tracking-wide px-2">
                نور
              </h2>
              
              <nav className="space-y-1.5 text-sm">
                {sidebarItems.map((item, index) => (
                  <Link
                    key={index}
                    href={item.path}
                    className="block hover:bg-white/10 text-slate-300 hover:text-white rounded-xl px-4 py-3 transition-all duration-200 font-medium"
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
            
            {/* أسفل القائمة الجانبية للمظهر الجمالي */}
            <div className="pt-6 border-t border-slate-800 text-xs text-slate-500 px-2">
              منصة نور للمساجد v2.0
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 p-4 md:p-8 bg-[#f8fafc]">
            
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200"
                >
                  <p className="text-gray-500 text-sm font-medium mb-2">
                    {stat.title}
                  </p>
                  <h3 className="text-3xl md:text-4xl font-black text-slate-800">
                    {stat.value}
                  </h3>
                </div>
              ))}
            </div>

            {/* Attendance Chart Preview */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-xl font-bold text-slate-800">
                  إحصائيات الحضور
                </h3>
                <span className="text-sm text-gray-400 font-medium">
                  آخر 30 يوم
                </span>
              </div>

              <div className="flex items-end gap-3 md:gap-4 h-64 px-2">
                {chartHeights.map((height, index) => (
                  <div
                    key={index}
                    className="bg-[#047857]/90 hover:bg-[#047857] w-full rounded-t-xl transition-all duration-300 cursor-pointer relative group"
                    style={{ height: `${height}%` }}
                  >
                    {/* Tooltip تظهر عند تمرير الفأرة فوق العمود */}
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                      {height}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
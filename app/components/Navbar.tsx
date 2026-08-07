export default function Navbar() {
  return (
    <nav className="w-full flex items-center justify-between px-8 py-6 border-b border-gray-200 bg-white/70 backdrop-blur-md sticky top-0 z-50">

      <h1 className="text-2xl font-bold text-[#047857]">
        نور
      </h1>

      <div className="hidden md:flex items-center gap-8 text-sm font-medium">
        <a href="#">الرئيسية</a>
        <a href="#">المميزات</a>
        <a href="#">لوحة التحكم</a>
        <a href="#">تواصل معنا</a>
      </div>

      <button className="bg-[#047857] text-white px-5 py-2 rounded-xl hover:bg-[#065f46] transition">
        ابدأ الآن
      </button>

    </nav>
  );
}
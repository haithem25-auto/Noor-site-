export default function TeacherUI() {

  const students = [
    "أحمد محمد",
    "يوسف علي",
    "عبد الرحمن",
  ];

  return (
    <section className="px-6 py-28 bg-white">

      <div className="text-center mb-16">

        <h2 className="text-4xl md:text-5xl font-black mb-6">
          واجهة المعلم السريعة
        </h2>

        <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-8">
          تم تصميم واجهة المعلم لتكون بسيطة وسريعة جدًا،
          مع تجربة Mobile First مناسبة للاستخدام اليومي داخل المسجد.
        </p>

      </div>

      <div className="flex justify-center">

        {/* Phone */}
        <div className="w-[340px] bg-[#0f172a] rounded-[40px] p-4 shadow-2xl">

          <div className="bg-[#f8fafc] rounded-[32px] overflow-hidden min-h-[700px]">

            {/* Header */}
            <div className="bg-[#047857] text-white p-6">

              <p className="text-sm opacity-80">
                حلقة حفظ القرآن
              </p>

              <h3 className="text-2xl font-black mt-2">
                تسجيل الحضور
              </h3>

            </div>

            {/* Students */}
            <div className="p-4 space-y-4">

              {students.map((student, index) => (
                <div
                  key={index}
                  className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100"
                >

                  <div className="flex items-center justify-between mb-5">

                    <div>

                      <h4 className="font-bold text-lg">
                        {student}
                      </h4>

                      <p className="text-sm text-gray-500">
                        المستوى {index + 1}
                      </p>

                    </div>

                    <div className="w-12 h-12 rounded-full bg-[#047857]"></div>

                  </div>

                  <div className="grid grid-cols-3 gap-3">

                    <button className="bg-green-100 text-green-700 py-3 rounded-2xl font-bold">
                      حاضر
                    </button>

                    <button className="bg-red-100 text-red-700 py-3 rounded-2xl font-bold">
                      غائب
                    </button>

                    <button className="bg-yellow-100 text-yellow-700 py-3 rounded-2xl font-bold">
                      متأخر
                    </button>

                  </div>

                </div>
              ))}

            </div>

          </div>

        </div>

      </div>

    </section>
  );
}
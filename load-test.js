import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 20 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.05'],
  },
};

const BASE_URL = 'https://bdpfstpptauizowdowzo.supabase.co/rest/v1/ ';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkcGZzdHBwdGF1aXpvd2Rvd3pvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMzY0MDAsImV4cCI6MjA5NTcxMjQwMH0._Q5KgB1ofQJqUdh8RzJpEBM5pdcR1GQSNsfHrxz1Wz4';

const headers = {
  'Content-Type': 'application/json',
  'apikey': API_KEY,
  'Authorization': `Bearer ${API_KEY}`,
  'Prefer': 'return=minimal',
};

export default function () {
  const isTeacher = Math.random() < 0.2;

  if (isTeacher) {
    // 1. جلب معرفات الطلاب الحقيقية من جدول الطلاب أولاً
    const resGetStudents = http.get(`${BASE_URL}/students?select=id&limit=5`, { headers });
    
    let realStudentIds = [];
    if (resGetStudents.status === 200) {
      const students = JSON.parse(resGetStudents.body);
      realStudentIds = students.map((s) => s.id);
    }

    // إذا وجد طلاباً حقيقيين، يرسل الحضور لهم
    if (realStudentIds.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const attendanceData = [];
      const notificationData = [];

      realStudentIds.forEach((studentId, idx) => {
        const isAbsent = idx % 5 === 0;

        attendanceData.push({
          student_id: studentId,
          date: today,
          status: isAbsent ? 'غائب' : 'حاضر',
        });

        if (isAbsent) {
          notificationData.push({
            student_id: studentId,
            type: 'absence_alert',
            message: 'تم تسجيل غياب الطالب اليوم',
            created_at: new Date().toISOString(),
          });
        }
      });

      // إرسال بيانات الحضور بمعرفات حقيقية
      const resAttendance = http.post(
        `${BASE_URL}/attendance`,
        JSON.stringify(attendanceData),
        { headers }
      );

      const attendanceSuccess = check(resAttendance, {
        'Attendance registered successfully': (r) =>
          r.status === 201 || r.status === 200 || r.status === 204,
      });

      if (!attendanceSuccess) {
        console.log(`Attendance Fail (${resAttendance.status}): ${resAttendance.body}`);
      }

      if (notificationData.length > 0) {
        const resNotifications = http.post(
          `${BASE_URL}/notifications`,
          JSON.stringify(notificationData),
          { headers }
        );

        check(resNotifications, {
          'Notifications sent successfully': (r) =>
            r.status === 201 || r.status === 200 || r.status === 204,
        });
      }
    } else {
      console.log('No real students found in table "students" to assign attendance.');
    }
  } else {
    // سيناريو الطالب: استعلامات القراءة
    const resStudents = http.get(
      `${BASE_URL}/students?select=id,name,role&limit=10`,
      { headers }
    );

    check(resStudents, {
      'Students fetch status is 200': (r) => r.status === 200,
    });

    const resAttendanceList = http.get(
      `${BASE_URL}/attendance?select=*&limit=20`,
      { headers }
    );

    check(resAttendanceList, {
      'Attendance fetch status is 200': (r) => r.status === 200,
    });
  }

  sleep(1);
}
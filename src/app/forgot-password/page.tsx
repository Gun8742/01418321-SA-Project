import Link from "next/link";
export default function ForgotPassword() {
  return (
    <main className="standalone">
      <section className="panel stack">
        <h1>ลืมรหัสผ่าน</h1>
        <p>
          ลูกจ้างกรุณาติดต่อนายจ้างเพื่อ Generate รหัสผ่านใหม่
          แล้วรับข้อมูลบัญชีจากนายจ้างโดยตรง
        </p>
        <Link href="/login">กลับเข้าสู่ระบบ</Link>
      </section>
    </main>
  );
}

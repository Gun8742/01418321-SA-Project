import { AccountForm } from "@/features/accounts/account-forms";
export default function ForgotPassword() {
  return (
    <main className="standalone">
      <AccountForm kind="forgot" />
    </main>
  );
}

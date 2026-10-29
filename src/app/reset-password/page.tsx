import type { Metadata } from "next";
export const metadata: Metadata = {
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};
import { AccountForm } from "@/features/accounts/account-forms";
export default async function ResetPassword({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <main className="standalone">
      <AccountForm kind="reset" token={token} />
    </main>
  );
}

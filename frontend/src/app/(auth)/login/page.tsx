import { Suspense } from "react";
import { PhoneLogin } from "@/components/auth/PhoneLogin";

export default function Page() {
  return (
    <Suspense>
      <PhoneLogin mode="login" />
    </Suspense>
  );
}

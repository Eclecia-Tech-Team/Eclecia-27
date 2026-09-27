import type { Metadata } from "next";
import { ComingSoon } from "@/components/common/ComingSoon";

export const metadata: Metadata = {
  title: "Register for Eclecia'27",
  description: "Registrations for Eclecia'27 open soon.",
};

export default function RegisterPage() {
  return (
    <ComingSoon
      eyebrow="Registrations"
      note="Registrations open soon. Follow @eclecia_hitk for the announcement."
    />
  );
}

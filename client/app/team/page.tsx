import type { Metadata } from "next";
import { ComingSoon } from "@/components/common/ComingSoon";

export const metadata: Metadata = {
  title: "Team: Eclecia'27",
  description:
    "Meet the organizing committee and student team behind Eclecia'27.",
};

export default function TeamPage() {
  return (
    <ComingSoon
      eyebrow="The Team"
      note="Meet the passionate organizers, leads, and student committee behind Eclecia'27."
    />
  );
}

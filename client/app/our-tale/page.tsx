import type { Metadata } from "next";
import { ComingSoon } from "@/components/common/ComingSoon";

export const metadata: Metadata = {
  title: "Our Tale: Eclecia'27",
  description:
    "The journey, history and legacy of Eclecia at Heritage Institute of Technology.",
};

export default function OurTalePage() {
  return (
    <ComingSoon
      eyebrow="Our Tale"
      note="Discover the rich history, past editions, and journey of Eclecia over the years."
    />
  );
}

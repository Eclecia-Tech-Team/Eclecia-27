import type { Metadata } from "next";
import { ComingSoon } from "@/components/common/ComingSoon";

export const metadata: Metadata = {
  title: "Events: Eclecia'27",
  description: "The full Eclecia'27 event line-up is on its way.",
};

export default function EventsPage() {
  return (
    <ComingSoon
      eyebrow="Events"
      note="Music, dance, drama, art, fashion and literary. The full line-up drops soon."
    />
  );
}

import type { Metadata } from "next";
import ForceDark from "@/components/ForceDark";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import SupportManager from "@/components/SupportManager";
import "../../support.css";

export const metadata: Metadata = {
  title: "Mi aporte a UruGo",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};
export default function MySupportPage() {
  return <main className="public-page support-page"><ForceDark /><PublicHeader /><div className="support-manager-shell"><SupportManager /></div><PublicFooter /></main>;
}

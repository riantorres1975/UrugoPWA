"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { ReactNode } from "react";
import LandingSearch from "@/components/LandingSearch";
import { rememberNearbyRoutesRequest } from "@/lib/nearby-request";
const PersonalDay = dynamic(() => import("@/components/PersonalDay"), { ssr: false });
export default function LandingHeroPlanner({ children }: { children?: ReactNode }) {
  return <div className="mt-6 sm:mt-7">
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
      <LandingSearch />
      <Link href="/mapa?cerca=1" onClick={rememberNearbyRoutesRequest} className="inline-flex min-h-[62px] items-center justify-center rounded-lg border border-[#b8e840]/50 px-5 text-sm font-bold text-[#d4ef8e] hover:bg-[#b8e840]/10">Rutas cerca de mí</Link>
    </div>
    <PersonalDay />
    {children}
  </div>;
}

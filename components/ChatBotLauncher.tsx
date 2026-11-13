"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import ChatBotIcon from "@/components/ChatBotIcon";

const loadChatBot = () => import("@/components/ChatBot");
const ChatBot = dynamic(loadChatBot, {
  ssr: false,
  loading: () => <ChatButton loading />,
});

function ChatButton({
  loading = false,
  onClick,
}: {
  loading?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onFocus={() => void loadChatBot()}
      onPointerEnter={() => void loadChatBot()}
      className="ov-panel pointer-events-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-lima/25 bg-surface text-lima shadow-[0_8px_28px_rgba(0,0,0,0.25)] transition hover:border-lima/50 active:scale-[0.97] lg:h-10 lg:w-10 lg:rounded-lg lg:shadow-none"
      aria-label={loading ? "Cargando asistente de rutas" : "Abrir asistente de rutas"}
      aria-busy={loading}
      title="Tu guía de Uruapan"
    >
      <ChatBotIcon />
    </button>
  );
}

export default function ChatBotLauncher() {
  const [activated, setActivated] = useState(false);

  if (activated) return <ChatBot initialOpen />;
  return <ChatButton onClick={() => setActivated(true)} />;
}

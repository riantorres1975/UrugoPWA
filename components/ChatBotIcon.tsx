export default function ChatBotIcon({ size = 22 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 18 3.5 21v-5.4A8.4 8.4 0 0 1 2 10.8C2 5.9 6.4 2 12 2s10 3.9 10 8.8-4.4 8.8-10 8.8c-2.2 0-4.2-.6-6-1.6Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M7 12h3.3c2 0 1.4-4 3.4-4H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="7" cy="12" r="1.8" fill="currentColor" /><circle cx="17" cy="8" r="1.8" fill="currentColor" />
  </svg>;
}

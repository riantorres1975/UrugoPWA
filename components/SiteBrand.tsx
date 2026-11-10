import Image from "next/image";
import Link from "next/link";

export default function SiteBrand() {
  return (
    <Link className="site-brand" href="/" aria-label="UruGo, inicio">
      <Image src="/icons/icon.svg" alt="" width={36} height={36} unoptimized />
      <span>Uru<span>Go</span></span>
    </Link>
  );
}

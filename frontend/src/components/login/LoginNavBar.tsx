import Link from "next/link";
import Image from "next/image";

export default function LoginNavBar() {
  return (
    <div className="mb-10 flex items-center justify-between gap-4">
      <Link href="/" className="flex items-center gap-2.5">
        <Image
          src="/mentor-logo.png"
          alt="Mentor AI"
          width={100}
          height={100}
          className="h-9 w-9 rounded-xl"
          priority
        />
        <span className="text-lg font-bold text-white">Mentor AI</span>
      </Link>
    </div>
  );
}

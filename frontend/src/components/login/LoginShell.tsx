import type { ReactNode } from "react";
import LoginMarketingPanel from "./LoginMarketingPanel";
import LoginNavBar from "./LoginNavBar";

type Props = {
  children: ReactNode;
};

export default function LoginShell({ children }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050a14] via-[#0a1628] to-[#050a14] px-6 py-8 font-sans lg:px-12 lg:py-10">
      <div className="mx-auto max-w-6xl">
        <LoginNavBar />
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-14 xl:gap-20">
          <LoginMarketingPanel />
          <div className="lg:pt-2">{children}</div>
        </div>
      </div>
    </div>
  );
}

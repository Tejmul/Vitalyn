import Image from "next/image";
import { Logo } from "@/components/ui/Logo";
import { TokenBoard } from "@/components/landing/TokenBoard";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <Logo />
        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-10">{children}</div>
      </div>
      <div className="ecg-paper relative hidden overflow-hidden lg:block">
        <div className="absolute inset-6 overflow-hidden rounded-[36px] bg-blue">
          <Image src="/images/care-family.jpg" alt="" fill sizes="50vw" className="object-cover opacity-35 mix-blend-luminosity" />
          <div className="absolute inset-0 bg-gradient-to-t from-blue via-blue/60 to-transparent" />
          <div className="absolute inset-x-10 bottom-10">
            <p className="font-deva text-[34px] italic text-white/90">लाइन में नहीं, ऑनलाइन।</p>
            <p className="mt-2 max-w-[420px] font-display text-[34px] font-extrabold leading-[1] tracking-[-0.045em] text-white">Book the visit. Skip the queue. Show your token.</p>
          </div>
          <div className="absolute right-10 top-10">
            <TokenBoard />
          </div>
        </div>
      </div>
    </div>
  );
}

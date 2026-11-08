import { AppNav } from "@/components/app/AppNav";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh bg-[#fafbfe]">
      <AppNav />
      <main className="mx-auto max-w-[1240px] px-5 pb-24 pt-8">{children}</main>
    </div>
  );
}

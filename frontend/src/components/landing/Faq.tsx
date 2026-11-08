"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Eyebrow, Reveal } from "./Reveal";

const QA = [
  ["Is Vitalyn free for patients?", "Yes. You pay the doctor's consultation fee at the hospital, the same as walking in. We show the fee before you book."],
  ["What happens after I book?", "Most doctors confirm instantly and you get your token straight away. Some doctors check each request first: the hospital or the doctor accepts it, and you see the token in My bookings. If nobody replies in time, the request expires and we tell you."],
  ["What if the doctor can't see me?", "You'll see 'Not accepted' with a reason, and your slot is freed. If the hospital doesn't reply in time, the request expires and we tell you straight away. Pick another time with one tap."],
  ["Can I book for my mother or father?", "Yes. When you book, type the patient's name and age. All family bookings stay together in your account."],
  ["Can I cancel or change the time?", "Cancel any time before your visit. Press Move to pick a new time, up to 2 hours before. Your old slot is only released once the new one is yours."],
  ["My hospital isn't listed. Can it join?", "Yes. Fill in the form at List your hospital. Our team checks the registration details, and once approved the desk logs in with a one-time code on their mobile."],
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="mx-auto grid max-w-[1240px] gap-12 px-5 py-24 md:py-32 lg:grid-cols-12">
      <Reveal className="lg:col-span-5">
        <Eyebrow>Questions</Eyebrow>
        <h2 className="mt-4 font-display text-[clamp(2.2rem,4.4vw,3.6rem)] font-extrabold leading-[0.95] tracking-[-0.045em]">Things people ask before booking.</h2>
        <div className="mt-8 rounded-3xl bg-mist p-6">
          <p className="font-display text-[18px] font-bold text-ink">Still unsure?</p>
          <p className="mt-1 text-[15px] text-muted">Call the hospital directly. Every hospital page has a one-tap call button.</p>
        </div>
      </Reveal>
      <div className="lg:col-span-7">
        {QA.map(([q, a], i) => {
          const isOpen = open === i;
          return (
            <div key={q} className="border-b border-line">
              <button onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen} className="flex w-full items-center justify-between gap-6 py-6 text-left">
                <span className="font-display text-[19px] font-bold tracking-[-0.02em] text-ink sm:text-[21px]">{q}</span>
                <span className={`grid size-10 shrink-0 place-items-center rounded-full transition-all duration-300 ${isOpen ? "rotate-45 bg-blue text-white" : "bg-mist text-ink"}`}>
                  <Plus className="size-4" />
                </span>
              </button>
              <div className={`grid transition-[grid-template-rows] duration-300 ease-out-expo ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                <div className="overflow-hidden">
                  <p className="max-w-[600px] pb-6 text-[16px] leading-relaxed text-muted">{a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { useBooking } from "@/lib/booking";
import StayPicker from "@/app/components/picker/StayPicker";

/**
 * The date picker as a native modal <dialog>: it renders in the top layer, so no
 * parent's overflow can clip it, and ESC / focus trapping come from the browser.
 * Full-screen on phones, a centred panel from `sm` up. Mount once per page.
 */
export default function StayPickerDialog() {
  const { pickerOpen, closePicker } = useBooking();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (pickerOpen && !dialog.open) dialog.showModal();
    else if (!pickerOpen && dialog.open) dialog.close();
  }, [pickerOpen]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="stay-picker-title"
      onClose={closePicker}
      onClick={(e) => {
        if (e.target === e.currentTarget) closePicker(); // backdrop
      }}
      className="m-auto h-dvh max-h-dvh w-full max-w-none overflow-y-auto overscroll-contain bg-surface p-0 text-ink backdrop:bg-ink/55 sm:h-auto sm:max-h-[calc(100dvh-48px)] sm:max-w-[980px] sm:rounded-[20px] sm:shadow-[0_40px_90px_-40px_rgba(6,43,68,0.7)]"
    >
      {pickerOpen && <StayPicker variant="dialog" />}
    </dialog>
  );
}

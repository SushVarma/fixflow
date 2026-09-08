"use client";

import { useRef, useState } from "react";
import { simulateInboundMessageAction } from "@/lib/actions/messages";

const PRESETS = [
  {
    label: "AC not cooling",
    name: "Rahul Sharma",
    phone: "9820011111",
    text: "AC not cooling properly since morning, please send technician",
  },
  {
    label: "Water leakage",
    name: "Priya Shah",
    phone: "9820022222",
    text: "AC se paani gir raha hai, jaldi bhejo",
  },
  {
    label: "Routine service",
    name: "Amit Mehta",
    phone: "9820033333",
    text: "AC service karwani hai, kal 4 baje aa sakte ho?",
  },
];

export function SimulateMessageForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Simulate WhatsApp message
      </p>
      <div className="mb-2 flex flex-wrap gap-1">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => {
              setName(p.name);
              setPhone(p.phone);
              setText(p.text);
            }}
            className="rounded-full border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
          >
            {p.label}
          </button>
        ))}
      </div>
      <form
        ref={formRef}
        action={simulateInboundMessageAction}
        onSubmit={() => setPending(true)}
        className="space-y-2"
      >
        <input
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Customer name"
          className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
        />
        <input
          name="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone number"
          className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
        />
        <textarea
          name="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type what the customer says..."
          rows={2}
          className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
        >
          {pending ? "Sending..." : "Send as customer"}
        </button>
      </form>
    </div>
  );
}

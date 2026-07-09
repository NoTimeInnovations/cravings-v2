"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Search } from "lucide-react";
import { toast } from "sonner";

export interface ShareOutlet {
  id: string;
  store_name: string;
  email: string;
  username: string;
  isParent?: boolean;
}

interface Props {
  brandName: string;
  password: string;
  outlets: ShareOutlet[];
}

const BASE = "https://menuthere.com/";

export default function ShareBranchClient({ brandName, password, outlets }: Props) {
  const [query, setQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // A clean, WhatsApp-friendly onboarding message (bold via *asterisks*).
  const buildMessage = (o: ShareOutlet) => {
    const link = `${BASE}${o.username}`;
    return (
      `Hello ${o.store_name} 👋\n\n` +
      `Your store is now live on ${brandName}!\n\n` +
      `🔗 *Store link:* ${link}\n` +
      `📧 *Login email:* ${o.email}\n` +
      `🔑 *Password:* ${password}\n\n` +
      `Log in at menuthere.com to manage your menu, orders and offers. ` +
      `Please change your password after your first login.\n\n` +
      `— Team ${brandName}`
    );
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return ok;
      } catch {
        return false;
      }
    }
  };

  const handleCopy = async (o: ShareOutlet) => {
    const ok = await copyText(buildMessage(o));
    if (!ok) {
      toast.error("Couldn't copy — please copy the details manually.");
      return;
    }
    setCopiedId(o.id);
    toast.success(`Copied ${o.store_name}'s details`);
    setTimeout(() => setCopiedId((c) => (c === o.id ? null : c)), 1600);
  };

  const handleCopyAll = async () => {
    const all = filtered.map(buildMessage).join("\n\n———\n\n");
    const ok = await copyText(all);
    toast[ok ? "success" : "error"](
      ok ? `Copied ${filtered.length} partners` : "Couldn't copy"
    );
  };

  const filtered = useMemo(() => {
    const f = query.trim().toLowerCase();
    if (!f) return outlets;
    return outlets.filter((o) =>
      `${o.store_name} ${o.email} ${o.username}`.toLowerCase().includes(f)
    );
  }, [query, outlets]);

  // Shared copy button — compact in the desktop table, full-width on mobile cards.
  const CopyBtn = ({ o, fullWidth }: { o: ShareOutlet; fullWidth?: boolean }) => {
    const done = copiedId === o.id;
    return (
      <button
        onClick={() => handleCopy(o)}
        aria-label={`Copy details for ${o.store_name}`}
        className={`inline-flex items-center gap-1.5 rounded-lg border text-[12.5px] font-semibold transition active:translate-y-px ${
          fullWidth ? "w-full justify-center px-3 py-2" : "px-3 py-1.5"
        } ${
          done
            ? "border-[#BDE3D0] bg-[#EFFAF4] text-[#1E7A54]"
            : "border-[#ECE6E1] bg-white text-[#A31621] hover:border-[#D62839] hover:bg-[#FFF6F7]"
        }`}
      >
        {done ? (
          <>
            <Check className="h-3.5 w-3.5" /> Copied
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" /> Copy
          </>
        )}
      </button>
    );
  };

  const pwChip = (
    <span className="rounded-md border border-[#ECE6E1] bg-[#F4EFEB] px-2 py-0.5 font-mono text-[12.5px] tracking-wide">
      {password}
    </span>
  );

  return (
    <div className="min-h-screen bg-[#FAF8F6] text-[#1C1714] antialiased">
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-5 sm:pt-8">
        {/* Masthead */}
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b-2 border-[#1C1714] pb-4">
          <div>
            <div className="mb-1 flex items-center gap-3">
              <span className="h-3 w-3 flex-none rounded-full bg-[#D62839] shadow-[0_0_0_4px_rgba(214,40,57,0.14)]" />
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#A31621]">
                {brandName} Branch
              </p>
            </div>
            <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-balance sm:text-[26px]">
              Partner Credentials
            </h1>
            <p className="mt-1.5 text-[13px] text-[#837A73] sm:text-[13.5px]">
              <b className="tabular-nums text-[#1C1714]">{outlets.length}</b>{" "}
              {outlets.length === 1 ? "branch" : "branches"} · storefronts on{" "}
              <b className="text-[#1C1714]">menuthere.com</b> · default password{" "}
              {pwChip}
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#ABA39C]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search branches…"
                aria-label="Search branches"
                className="w-full rounded-[9px] border border-[#ECE6E1] bg-white py-2 pl-9 pr-3 text-[13.5px] outline-none transition focus:border-[#D62839] focus:ring-[3px] focus:ring-[#D62839]/15 sm:w-[210px]"
              />
            </div>
            <button
              onClick={handleCopyAll}
              className="rounded-[9px] bg-[#1C1714] px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-black active:translate-y-px"
            >
              Copy all
            </button>
          </div>
        </header>

        {/* Desktop / tablet: table */}
        <div className="hidden overflow-hidden rounded-[14px] border border-[#ECE6E1] bg-white shadow-[0_1px_2px_rgba(28,23,20,0.04),0_8px_28px_rgba(28,23,20,0.05)] md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="bg-[#FBF7F4]">
                  <th className="w-11 border-b border-[#ECE6E1] px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-[#837A73]">
                    #
                  </th>
                  <th className="border-b border-[#ECE6E1] px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-[#837A73]">
                    Store Name
                  </th>
                  <th className="border-b border-[#ECE6E1] px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-[#837A73]">
                    Email
                  </th>
                  <th className="border-b border-[#ECE6E1] px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-[#837A73]">
                    Storefront Link
                  </th>
                  <th className="border-b border-[#ECE6E1] px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-[#837A73]">
                    Password
                  </th>
                  <th className="border-b border-[#ECE6E1] px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-[#837A73]">
                    Copy
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-sm text-[#837A73]"
                    >
                      No branches match your search.
                    </td>
                  </tr>
                )}
                {filtered.map((o, i) => {
                  const link = `${BASE}${o.username}`;
                  return (
                    <tr
                      key={o.id}
                      className={
                        o.isParent
                          ? "bg-[#FDEDEE] hover:bg-[#FBE4E6]"
                          : "hover:bg-[#FCFAF8]"
                      }
                    >
                      <td className="border-b border-[#ECE6E1] px-4 py-3 text-right text-[13.5px] tabular-nums text-[#837A73]">
                        {i + 1}
                      </td>
                      <td className="border-b border-[#ECE6E1] px-4 py-3 text-[13.5px]">
                        <span className="font-semibold tracking-[-0.005em]">
                          {o.store_name}
                        </span>
                        {o.isParent && (
                          <span className="ml-2 inline-block rounded-full bg-[#F7DEE1] px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wide text-[#A31621]">
                            Brand / Main
                          </span>
                        )}
                      </td>
                      <td className="border-b border-[#ECE6E1] px-4 py-3 text-[13.5px] text-[#4A433E]">
                        {o.email}
                      </td>
                      <td className="border-b border-[#ECE6E1] px-4 py-3 text-[13.5px]">
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="break-all text-[#A31621] hover:underline"
                        >
                          {link}
                        </a>
                      </td>
                      <td className="border-b border-[#ECE6E1] px-4 py-3 text-[13.5px]">
                        {pwChip}
                      </td>
                      <td className="border-b border-[#ECE6E1] px-4 py-3 text-right">
                        <CopyBtn o={o} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile: cards */}
        <div className="space-y-3 md:hidden">
          {filtered.length === 0 && (
            <div className="rounded-[14px] border border-[#ECE6E1] bg-white px-4 py-10 text-center text-sm text-[#837A73]">
              No branches match your search.
            </div>
          )}
          {filtered.map((o, i) => {
            const link = `${BASE}${o.username}`;
            return (
              <div
                key={o.id}
                className={`rounded-[14px] border p-4 shadow-[0_1px_2px_rgba(28,23,20,0.04)] ${
                  o.isParent
                    ? "border-[#F3CDD1] bg-[#FDEDEE]"
                    : "border-[#ECE6E1] bg-white"
                }`}
              >
                <div className="mb-3 flex items-start gap-2">
                  <span className="mt-0.5 text-[11px] tabular-nums text-[#B4ABA4]">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold leading-snug tracking-[-0.005em]">
                      {o.store_name}
                    </h3>
                    {o.isParent && (
                      <span className="mt-1 inline-block rounded-full bg-[#F7DEE1] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#A31621]">
                        Brand / Main
                      </span>
                    )}
                  </div>
                </div>

                <dl className="space-y-2 text-[13px]">
                  <div className="flex gap-3">
                    <dt className="w-[68px] flex-none text-[#9A918B]">Email</dt>
                    <dd className="min-w-0 break-all text-[#4A433E]">{o.email}</dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="w-[68px] flex-none text-[#9A918B]">Link</dt>
                    <dd className="min-w-0">
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all text-[#A31621] hover:underline"
                      >
                        {link}
                      </a>
                    </dd>
                  </div>
                  <div className="flex items-center gap-3">
                    <dt className="w-[68px] flex-none text-[#9A918B]">Password</dt>
                    <dd>{pwChip}</dd>
                  </div>
                </dl>

                <div className="mt-4">
                  <CopyBtn o={o} fullWidth />
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[#837A73]">
          Each <b className="text-[#4A433E]">Copy</b> button copies a ready-to-send
          onboarding message with the store link, email &amp; password.
        </p>
      </div>
    </div>
  );
}

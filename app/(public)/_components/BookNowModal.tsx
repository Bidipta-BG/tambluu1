"use client";

import { useState, FormEvent, useEffect, useRef } from "react";
import type { Ticket, Game, BookRequestPayload } from "@/types";

interface BookNowModalProps {
  ticket: Ticket;
  game: Game;
  tenantId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export default function BookNowModal({
  ticket,
  game,
  tenantId,
  onClose,
  onSuccess,
}: BookNowModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Focus trap & keyboard close
  useEffect(() => {
    firstInputRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload: BookRequestPayload = {
      name: name.trim(),
      phone: phone.trim(),
    };

    try {
      const res = await fetch(
        `${API_BASE}/tenants/${tenantId}/games/${game.id}/tickets/${ticket.id}/book`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { message?: string }).message ?? `Request failed (${res.status})`,
        );
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    /* Overlay */
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === overlayRef.current && onClose()}
      aria-modal="true"
      role="dialog"
      aria-label={`Book ticket #${ticket.ticket_number}`}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden"
        style={{ animation: "modalSlideIn 0.2s ease-out" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div>
            <p className="text-xs font-medium text-amber-400 uppercase tracking-wider">
              Book ticket
            </p>
            <h2 className="text-lg font-bold text-slate-50 mt-0.5">
              #{ticket.ticket_number}
            </h2>
          </div>
          <button
            id="book-modal-close"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Price strip */}
        <div className="bg-amber-400/10 border-b border-amber-400/20 px-5 py-2.5 flex items-center gap-2">
          <span className="text-amber-400 text-xs font-medium">Ticket price</span>
          <span className="ml-auto text-amber-300 font-bold text-base">₹{game.ticket_price}</span>
        </div>

        {/* Body */}
        <div className="p-5">
          {success ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30">
                <svg className="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </span>
              <p className="font-semibold text-slate-50">Booking request sent!</p>
              <p className="text-xs text-slate-400">The organiser will confirm your ticket shortly.</p>
            </div>
          ) : (
            <form
              id="book-now-form"
              onSubmit={handleSubmit}
              className="flex flex-col gap-3.5"
            >
              <div className="flex flex-col gap-1.5">
                <label htmlFor="book-name" className="text-xs font-medium text-slate-400">
                  Full name
                </label>
                <input
                  id="book-name"
                  ref={firstInputRef}
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-50 placeholder-slate-500 outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="book-phone" className="text-xs font-medium text-slate-400">
                  WhatsApp number
                </label>
                <input
                  id="book-phone"
                  type="tel"
                  required
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-50 placeholder-slate-500 outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40"
                />
              </div>

              {error && (
                <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400 ring-1 ring-red-500/20">
                  {error}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-800 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  id="book-now-submit"
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-slate-900 hover:bg-amber-400 disabled:opacity-60 disabled:pointer-events-none transition"
                >
                  {loading ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
                      </svg>
                      Booking…
                    </>
                  ) : (
                    "Confirm booking"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

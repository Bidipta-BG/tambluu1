"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordSection() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("idle");
    setMessage("");

    if (!oldPassword || !newPassword || !confirmPassword) {
      setStatus("error");
      setMessage("All fields are required.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus("error");
      setMessage("New password and confirm password do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setStatus("error");
      setMessage("New password must be at least 6 characters.");
      return;
    }

    setStatus("loading");

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("You must be logged in to update your password.");
      }

      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
      const res = await fetch(`${API_BASE}/password/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          oldPassword,
          newPassword
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to update password");
      }

      setStatus("success");
      setMessage("Password successfully updated!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "An unexpected error occurred");
    }
  };

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const EyeIcon = ({ show, toggle }: { show: boolean, toggle: () => void }) => (
    <button
      type="button"
      onClick={toggle}
      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-300"
      tabIndex={-1}
    >
      {show ? (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        </svg>
      ) : (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.543 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )}
    </button>
  );

  return (
    <form onSubmit={handleUpdate} className="space-y-4 max-w-sm mt-6">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-300">Old Password</label>
        <div className="relative">
          <input
            type={showOldPassword ? "text" : "password"}
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 pr-10 text-sm text-slate-50 placeholder-slate-500 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40"
            placeholder="Enter current password"
          />
          <EyeIcon show={showOldPassword} toggle={() => setShowOldPassword(!showOldPassword)} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-300">New Password</label>
        <div className="relative">
          <input
            type={showNewPassword ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 pr-10 text-sm text-slate-50 placeholder-slate-500 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40"
            placeholder="Enter new password"
          />
          <EyeIcon show={showNewPassword} toggle={() => setShowNewPassword(!showNewPassword)} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-300">Confirm New Password</label>
        <div className="relative">
          <input
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 pr-10 text-sm text-slate-50 placeholder-slate-500 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40"
            placeholder="Confirm new password"
          />
          <EyeIcon show={showConfirmPassword} toggle={() => setShowConfirmPassword(!showConfirmPassword)} />
        </div>
      </div>

      {message && (
        <p className={`text-sm font-medium ${status === "success" ? "text-green-400" : "text-red-400"}`}>
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="mt-2 w-full sm:w-auto rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-500 disabled:opacity-50"
      >
        {status === "loading" ? "Updating..." : "Update Password"}
      </button>
    </form>
  );
}

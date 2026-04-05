"use client";

import { useSession } from "next-auth/react";
import Image from "next/image";
import { SignOutButton } from "./Sign-Out";
import { Mail, Shield, Cpu, Clock } from "lucide-react";

export default function Profile() {
  const { data: session } = useSession();

  const user = session?.user as {
    name?: string;
    email?: string;
    image?: string;
    role?: string;
    designation?: string;
  } | undefined;

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "U";

  const role = user?.role ?? "user";
  const designation = user?.designation;

  const now = new Date();
  const timeString = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateString = now.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <>
      <style>{`
        @keyframes profileSlideIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)  scale(1);    }
        }
        .profile-card {
          animation: profileSlideIn 0.18s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .profile-ring {
          background: conic-gradient(
            from 0deg,
            #6366f1, #8b5cf6, #a78bfa, #6366f1
          );
        }
        @keyframes spin-slow {
          to { transform: rotate(360deg); }
        }
        .spin-slow { animation: spin-slow 8s linear infinite; }
      `}</style>

      {/*
        Positioned ABSOLUTE so it anchors to the avatar button's parent
        (the `relative` div in Navbar). Right-aligned, drops below the avatar.
      */}
      <div
        className="profile-card absolute right-0 top-[calc(100%+10px)] w-72 z-[200]
          bg-white rounded-2xl shadow-2xl border border-gray-100
          overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header banner ── */}
        <div className="relative h-16 bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 overflow-hidden">
          {/* decorative circles */}
          <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
          <div className="absolute -bottom-6 -left-4 w-20 h-20 rounded-full bg-white/10" />
          <div className="absolute top-2 right-16 w-8 h-8 rounded-full bg-white/10" />

          {/* time pill */}
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/20 backdrop-blur-sm
            rounded-full px-2 py-0.5">
            <Clock size={10} className="text-white/80" />
            <span className="text-[0.6rem] text-white font-semibold tracking-wide">{timeString}</span>
          </div>
          <div className="absolute bottom-2 right-3">
            <span className="text-[0.58rem] text-white/70">{dateString}</span>
          </div>
        </div>

        {/* ── Avatar overlapping banner ── */}
        <div className="relative flex justify-center -mt-9 mb-2">
          {/* spinning ring */}
          <div className="profile-ring spin-slow p-[2px] rounded-full w-[72px] h-[72px] flex items-center justify-center shadow-lg">
            <div className="bg-white rounded-full p-[2px] w-full h-full">
              {user?.image ? (
                <Image
                  src={user.image}
                  alt="Avatar"
                  width={64}
                  height={64}
                  className="rounded-full object-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-400 to-violet-500
                  flex items-center justify-center text-white text-xl font-bold">
                  {initials}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Name & role ── */}
        <div className="px-5 pb-3 text-center">
          <h3 className="text-[0.92rem] font-bold text-gray-900 leading-tight truncate">
            {user?.name || "User"}
          </h3>

          <div className="flex items-center justify-center gap-1.5 mt-1.5 flex-wrap">
            {role === "admin" ? (
              <span className="inline-flex items-center gap-1 text-[0.65rem] bg-purple-100
                text-purple-700 font-semibold px-2 py-0.5 rounded-full">
                <Shield size={9} /> Admin
              </span>
            ) : designation ? (
              <span className="inline-flex items-center gap-1 text-[0.65rem] bg-green-100
                text-green-700 font-semibold px-2 py-0.5 rounded-full capitalize">
                <Cpu size={9} /> {designation}
              </span>
            ) : (
              <span className="text-[0.65rem] bg-gray-100 text-gray-600
                font-semibold px-2 py-0.5 rounded-full capitalize">
                {role}
              </span>
            )}
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="mx-4 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

        {/* ── Email row ── */}
        <div className="mx-4 my-3 flex items-center gap-2.5 bg-gray-50 rounded-xl px-3 py-2.5">
          <Mail size={13} className="text-indigo-400 flex-shrink-0" />
          <span className="text-[0.72rem] text-gray-600 truncate min-w-0">
            {user?.email || "—"}
          </span>
        </div>

        {/* ── Sign-out ── */}
        <div className="px-4 pb-4">
          <div className="[&>button]:w-full [&>button]:justify-center [&>button]:rounded-xl
            [&>button]:text-[0.78rem] [&>button]:font-semibold [&>button]:py-2.5
            [&>button]:bg-gradient-to-r [&>button]:from-red-50 [&>button]:to-rose-50
            [&>button]:text-red-600 [&>button]:border [&>button]:border-red-100
            [&>button]:hover:from-red-100 [&>button]:hover:to-rose-100
            [&>button]:transition-all [&>button]:duration-150">
            <SignOutButton />
          </div>
        </div>
      </div>
    </>
  );
}
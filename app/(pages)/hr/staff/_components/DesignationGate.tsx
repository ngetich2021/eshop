// app/hr/staff/_components/DesignationGate.tsx
"use client";

import { useSession } from "next-auth/react";
import { isRouteAllowed } from "@/lib/permissions";
import { ShieldOff } from "lucide-react";
import Link from "next/link";

type GateProps = {
  requiredPrefix: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export default function DesignationGate({ requiredPrefix, children, fallback }: GateProps) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const user         = session?.user as { role?: string; designation?: string; allowedRoutes?: string[] } | undefined;
  const role         = user?.role         ?? "user";
  const designation  = user?.designation  ?? null;
  const allowedRoutes = user?.allowedRoutes ?? [];

  if (isRouteAllowed(requiredPrefix, role, designation, allowedRoutes)) {
    return <>{children}</>;
  }

  if (fallback) return <>{fallback}</>;

  return <BlockedUI designation={designation} role={role} />;
}

function BlockedUI({ designation, role }: { designation: string | null; role: string }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <ShieldOff size={32} className="text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h2>
        <p className="text-sm text-gray-500 leading-relaxed mb-1">
          Your current designation
          {designation ? <> (<span className="font-semibold text-gray-700 capitalize">{designation}</span>)</> : ""}{" "}
          does not have permission to view this page.
        </p>
        <p className="text-xs text-gray-400 mb-6">
          Role: <span className="font-medium capitalize">{role}</span>
        </p>
        <Link href="/dashboard"
          className="inline-flex items-center gap-2 bg-green-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-green-700 transition-colors">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

export function usePermissions() {
  const { data: session } = useSession();
  const user          = session?.user as { role?: string; designation?: string; allowedRoutes?: string[] } | undefined;
  const role          = user?.role          ?? "user";
  const designation   = user?.designation   ?? null;
  const allowedRoutes = user?.allowedRoutes ?? [];

  return {
    role,
    designation,
    allowedRoutes,
    isAdmin: role === "admin",
    can: (prefix: string) => isRouteAllowed(prefix, role, designation, allowedRoutes),
  };
}
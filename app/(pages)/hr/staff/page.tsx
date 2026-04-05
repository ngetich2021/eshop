// app/hr/staff/page.tsx
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import StaffsView from "./_components/StaffsView";
import { resolveActiveShop } from "@/lib/active-shop";

function parseRoutes(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw as string[];
  if (typeof raw === "string") {
    try { return JSON.parse(raw) as string[]; } catch { return []; }
  }
  return [];
}

export default async function StaffPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg text-gray-600">Please sign in to access staff</p>
      </div>
    );
  }

  const userId = session.user.id;
  const { activeShopId, activeShop, isAdmin } = await resolveActiveShop(userId);

  const usersRaw = await prisma.user.findMany({
    where: { profile: { role: "user" }, staff: null },
    select: {
      id: true,
      name: true,
      email: true,
      profile: { select: { fullName: true } },
    },
    orderBy: { name: "asc" },
  });

  const users = usersRaw.map((u) => ({
    id: u.id,
    fullName: u.profile?.fullName || u.name || "Unnamed User",
    email: u.email || undefined,
  }));

  const staffListRaw = await prisma.staff.findMany({
    where: { shopId: activeShopId },
    select: {
      id: true,
      userId: true,
      fullName: true,
      tel1: true,
      tel2: true,
      mpesaNo: true,
      baseSalary: true,
      createdAt: true,
      shopId: true,
      shop: { select: { name: true } },
      user: {
        select: {
          profile: {
            select: {
              role: true,
              designation: true,
              allowedRoutes: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const staffList = staffListRaw.map((s) => ({
    id: s.id,
    userId: s.userId,
    fullName: s.fullName,
    tel1: s.tel1,
    tel2: s.tel2,
    mpesaNo: s.mpesaNo,
    baseSalary: s.baseSalary,
    date: s.createdAt.toISOString().split("T")[0],
    shop: s.shop?.name ?? "—",
    shopId: s.shopId,
    role: s.user?.profile?.role ?? "staff",
    designation: s.user?.profile?.designation ?? null,
    allowedRoutes: parseRoutes((s.user?.profile as { allowedRoutes?: unknown })?.allowedRoutes),
  }));

  const totalStaff  = staffList.length;
  const totalSalary = staffList.reduce((sum, s) => sum + s.baseSalary, 0);

  const rolesRaw = await prisma.role.findMany({ orderBy: { createdAt: "asc" } });
  const roles = rolesRaw.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    allowedRoutes: parseRoutes((r as { allowedRoutes?: unknown }).allowedRoutes),
  }));

  return (
    <StaffsView
      stats={{ totalStaff, totalSalary }}
      staffList={staffList}
      users={users}
      activeShopId={activeShopId}
      activeShopName={activeShop.name}
      isAdmin={isAdmin}
      roles={roles}
    />
  );
}
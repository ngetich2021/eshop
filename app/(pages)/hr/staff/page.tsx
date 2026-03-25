import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import StaffsView from "./_components/StaffsView";

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
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { role: true },
  });
  const isAdmin = profile?.role?.toLowerCase().trim() === "admin";

  // ── USERS WITH ROLE = 'user' AND NOT ALREADY REGISTERED AS STAFF ──
  // This is the exact change you asked for — no already-registered user appears in dropdown
  const usersRaw = await prisma.user.findMany({
    where: {
      profile: { role: "user" },
      staff: null,                    // ← EXCLUDES ANY USER ALREADY IN STAFF TABLE
    },
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

  // SHOPS FOR SELECTION (unchanged)
  const shopsRaw = await prisma.shop.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const shops = shopsRaw.map((s) => ({ id: s.id, name: s.name }));

  // STAFF LIST (unchanged — includes already registered staff)
  const staffListRaw = await prisma.staff.findMany({
    where: isAdmin ? undefined : { shop: { userId } },
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
  }));

  const totalStaff = staffList.length;
  const totalSalary = staffList.reduce((sum, s) => sum + s.baseSalary, 0);

  return (
    <StaffsView
      stats={{ totalStaff, totalSalary }}
      staffList={staffList}
      users={users}
      shops={shops}
    />
  );
}
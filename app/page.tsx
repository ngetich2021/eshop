// app/page.tsx — Server Component
import { auth } from "@/auth"; // your auth export (from auth.ts / auth.js)
import GoogleSignIn from "@/components/Google";
import { SignOutButton } from "@/components/Sign-Out";

export const revalidate = 1;

export default async function Home() {
  const session = await auth(); // ← universal auth() in v5

  return (
    <div className="p-8 max-w-md mx-auto space-y-6">
      {session?.user ? (
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold">
            Welcome, {session.user.name || session.user.email || "User"}!
          </h2>
          <p className="text-gray-600">
            You are signed in (Role: {session.user.role || "unknown"})
          </p>

          {/* Client component for signOut() */}
          <SignOutButton />
        </div>
      ) : (
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-6">Sign in to continue</h2>
          <GoogleSignIn />
        </div>
      )}
    </div>
  );
}
'use client';

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { RiDashboard3Line } from "react-icons/ri";
import { FaUserShield } from "react-icons/fa6";
import { MdVideogameAsset } from "react-icons/md";
import { IoIosNotificationsOutline, IoIosArrowBack, IoIosArrowForward, IoIosLogOut } from "react-icons/io";
import { IoChevronDown, IoChevronUp } from "react-icons/io5";
import Image from "next/image";
import { useSession } from "next-auth/react";
import Profile from "./Profile";
import { AiFillProduct } from "react-icons/ai";
import { FcSalesPerformance } from "react-icons/fc";
import { FaMoneyBillTrendUp } from "react-icons/fa6";
import { SiAwssecretsmanager } from "react-icons/si";
import { GiBuyCard } from "react-icons/gi";
import { FaShop } from "react-icons/fa6";

const NavLinks = [
  { id: 1, title: "dashboard", href: "/dashboard", icon: <RiDashboard3Line size={32} /> },
  {
    id: 2,
    title: "inventory",
    icon: <AiFillProduct size={32} />,
    submenu: [
      { title: "products", href: "/inventory/products" },
      { title: "adjust Stock", href: "/inventory/stock" },
    ],
  },
  {
    id: 3,
    title: "sales",
    icon: <FcSalesPerformance size={32} />,
    submenu: [
      { title: "sold", href: "/sales/sold" },
      { title: "quote", href: "/sales/quote" },
    ],
  },
    {
    id: 4,
    title: "finance",
    icon: <FaMoneyBillTrendUp size={32} />,
    submenu: [
      { title: "payments", href: "/finance/payments" },
      { title: "expenses", href: "/finance/expenses"  },
      { title: "credit", href: "/finance/credit"  },
      { title: "advance", href: "/finance/advance"  },
      { title: "salary", href: "/finance/salary"  },
      { title: "wallet", href: "/finance/wallet"  },
      { title: "margin", href: "/finance/margin"  },
    ],
  },
  { id: 5, title: "suppliers", href: "/suppliers", icon: <FaUserShield size={32} /> },
  {
    id: 6,
    title: "hr",
    icon: <SiAwssecretsmanager size={32} />,
    submenu: [
      { title: "staff", href: "/hr/staff" },
      { title: "payrol", href: "/hr/payrol" },
      { title: "advance", href: "/hr/advance" },
      { title: "salary", href: "/hr/salary" },
    ],
  },
  { id: 7, title: "reports", href: "/reports", icon: <RiDashboard3Line size={32} /> },
  { id: 8, title: "assets", href: "/assets", icon: <MdVideogameAsset size={32} /> },
  { id: 9, title: "buy", href: "/buy", icon: <GiBuyCard size={32} /> },
  { id: 10, title: "shops", href: "/shops", icon: <FaShop size={32} /> },
];

export default function Navbar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  // Using an object to track multiple open submenus
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  const pathname = usePathname();
  const { data: session } = useSession();
  const [profile, setProfile] = useState(false);

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  const isActive = (href: string) => pathname === href;

  const toggleSubmenu = (title: string) => {
    setOpenMenus(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  return (
    <nav className="flex gap-2 overflow-hidden">
      {/* Top bar */}
      <div className="h-24 w-full fixed top-0 left-0 flex justify-between items-center z-50 bg-white border-b border-gray-500 px-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 relative flex-shrink-0">
            <Image
              src="/branton_logo.png"
              alt="Logo"
              fill
              className="object-cover rounded-full p-2 border border-gray-600"
            />
          </div>
          <button onClick={toggleSidebar} className="xl:hidden text-gray-700 hover:text-gray-900">
            {isCollapsed ? <IoIosArrowForward size={32} /> : <IoIosArrowBack size={32} />}
          </button>
        </div>

        <div className="flex items-center gap-4 md:gap-8">
          <div className="relative">
            <IoIosNotificationsOutline size={28} className="text-gray-700" />
            <span className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full border-2 border-white flex items-center justify-center">
              20
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-12 w-12 md:h-12 md:w-12 relative mr-16 sm:mr-0">
              {session && (
                <>
                  <button
                    onClick={() => setProfile((prev) => !prev)}
                    className="relative w-10 h-10"
                  >
                    <Image
                      src={session.user?.image ?? "/branton_logo.png"}
                      alt="User"
                      fill
                      className="object-cover rounded-full border border-gray-600"
                    />
                  </button>

                  {profile && <Profile />}
                </>
              )}
            </div>

            {session ? (
              <p className="hidden md:block font-bold text-sm text-nowrap text-gray-800">
                Hey, {session.user?.name}
              </p>
            ) : (
              "welcome"
            )}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div
        className={`fixed top-24 left-0 h-screen bg-white border-r border-gray-500 transition-all duration-300 flex flex-col ${
          isCollapsed ? "w-20" : "w-64"
        } z-40`}
      >
        <ul className="flex flex-col gap-2 py-6 px-4 flex-1 overflow-y-auto">
          {NavLinks.map((link) => {
            // Check if this specific link or any of its submenus are active
            const hasSubmenu = !!link.submenu;
            const isSubmenuActive = hasSubmenu && link.submenu?.some(sub => isActive(sub.href));
            
            if (hasSubmenu) {
              return (
                <li key={link.id}>
                  <button
                    type="button"
                    onClick={() => toggleSubmenu(link.title)}
                    className={`w-full flex items-center justify-between gap-4 rounded-lg px-3 py-3 transition-all ${
                      isSubmenuActive
                        ? "bg-blue-100 text-blue-700 font-bold shadow-md"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex shrink-0">{link.icon}</div>
                      {!isCollapsed && (
                        <span className="text-sm lg:text-base font-semibold capitalize">
                          {link.title}
                        </span>
                      )}
                    </div>

                    {!isCollapsed && (
                      <div className="text-xl">
                        {openMenus[link.title] ? <IoChevronUp /> : <IoChevronDown />}
                      </div>
                    )}
                  </button>

                  {!isCollapsed && openMenus[link.title] && (
                    <ul className="ml-10 mt-1 flex flex-col gap-1">
                      {link.submenu!.map((sub) => (
                        <li key={sub.title}>
                          <Link
                            href={sub.href}
                            className={`block rounded-lg px-4 py-2 text-sm transition-all ${
                              isActive(sub.href)
                                ? "bg-blue-50 text-blue-700 font-medium"
                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            }`}
                          >
                            {sub.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            }

            // Regular menu item (Only renders if no submenu exists)
            return (
              <li key={link.id}>
                <Link
                  href={link.href || "#"} 
                  className={`flex items-center gap-4 rounded-lg px-3 py-3 transition-all ${
                    isActive(link.href!)
                      ? "bg-blue-100 text-blue-700 font-bold shadow-md"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex shrink-0">{link.icon}</div>
                  {!isCollapsed && (
                    <span className="text-sm lg:text-base font-semibold capitalize">
                      {link.title}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Logout */}
        <div className="border-t border-gray-300 px-4 py-6">
          <button
            className="flex items-center gap-4 w-full rounded-lg px-3 py-3 text-gray-700 hover:bg-gray-100 transition-all"
            onClick={() => console.log("Logout clicked – add your signOut here")}
          >
            <IoIosLogOut size={32} className="flex-shrink-0" />
            {!isCollapsed && (
              <span className="text-sm lg:text-base font-semibold">Logout</span>
            )}
          </button>
        </div>
      </div>

      {/* Content padding */}
      <div className={`pt-24 transition-all duration-300 ${isCollapsed ? "pl-20" : "pl-64"}`}>
        {/* Your page content goes here */}
      </div>
    </nav>
  );
}
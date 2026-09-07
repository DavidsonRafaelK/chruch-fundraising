"use client";

import { motion } from "framer-motion";
import {
  FolderTree,
  LayoutDashboard,
  LogOut,
  Package,
  Receipt,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/app/(admin)/actions";
import {
  Sidebar,
  SidebarBody,
  SidebarLink,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const ICON_CLASS = "size-5 shrink-0";

const LINKS = [
  {
    href: "/",
    label: "Dashboard",
    icon: <LayoutDashboard className={ICON_CLASS} />,
  },
  {
    href: "/products",
    label: "Products",
    icon: <Package className={ICON_CLASS} />,
  },
  {
    href: "/categories",
    label: "Categories",
    icon: <FolderTree className={ICON_CLASS} />,
  },
  {
    href: "/orders",
    label: "Orders",
    icon: <Receipt className={ICON_CLASS} />,
  },
];

export function AdminSidebar({ email }: { email: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Sidebar open={open} setOpen={setOpen}>
      <SidebarBody className="justify-between gap-10 md:sticky md:top-0 md:h-screen">
        <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
          <Brand />
          <SidebarLinks />
        </div>
        <SignOutRow email={email} />
      </SidebarBody>
    </Sidebar>
  );
}

function Brand() {
  const { open, animate } = useSidebar();

  return (
    <div className="flex items-center gap-2 px-2.5 py-1">
      <div className="size-6 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-primary" />
      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="font-heading font-bold whitespace-pre"
      >
        Church Admin
      </motion.span>
    </div>
  );
}

function SidebarLinks() {
  const pathname = usePathname();

  return (
    <div className="mt-8 flex flex-col gap-1">
      {LINKS.map((link) => {
        const active =
          link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <SidebarLink
            key={link.href}
            link={link}
            aria-current={active ? "page" : undefined}
            className={cn(
              "transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          />
        );
      })}
    </div>
  );
}

/*
 * Signing out has to POST a Server Action, so it is a form button rather than
 * a SidebarLink — but it mirrors the link's icon-plus-collapsing-label shape
 * so the rail reads as one list.
 */
function SignOutRow({ email }: { email: string }) {
  const { open, animate } = useSidebar();
  const reveal = {
    display: animate ? (open ? "inline-block" : "none") : "inline-block",
    opacity: animate ? (open ? 1 : 0) : 1,
  };

  return (
    <div className="flex flex-col gap-1">
      <motion.span
        animate={reveal}
        className="truncate px-2.5 text-xs whitespace-pre text-muted-foreground"
      >
        {email}
      </motion.span>
      <form action={signOut}>
        <button
          type="submit"
          className="group/sidebar flex w-full items-center justify-start gap-2 rounded-2xl px-2.5 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className={ICON_CLASS} />
          <motion.span
            animate={reveal}
            className="inline-block text-sm whitespace-pre transition duration-150 group-hover/sidebar:translate-x-1"
          >
            Sign out
          </motion.span>
        </button>
      </form>
    </div>
  );
}

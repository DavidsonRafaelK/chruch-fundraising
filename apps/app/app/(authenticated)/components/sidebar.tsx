"use client";

import type { Role } from "@repo/auth/roles";
import { ModeToggle } from "@repo/design-system/components/mode-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@repo/design-system/components/ui/sidebar";
import { cn } from "@repo/design-system/lib/utils";
import { NotificationsTrigger } from "@repo/notifications/components/trigger";
import {
  ActivityIcon,
  AnchorIcon,
  ImageIcon,
  MessageCircleQuestionIcon,
  SettingsIcon,
  LayoutDashboardIcon,
  type LucideIcon,
  PackageIcon,
  ScrollTextIcon,
  UsersIcon,
  ShoppingCartIcon,
  TicketPercentIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Search } from "./search";
import { UserMenu } from "./user-menu";

interface GlobalSidebarProperties {
  readonly children: ReactNode;
  readonly role: Role;
  readonly storeName: string;
}

interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
  rootOnly?: boolean;
}

const navigation: NavGroup[] = [
  {
    label: "Store",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboardIcon },
      { title: "Products", url: "/products", icon: PackageIcon },
      { title: "Orders", url: "/orders", icon: ShoppingCartIcon },
    ],
  },
  {
    label: "Content",
    items: [
      { title: "Banners", url: "/banners", icon: ImageIcon },
      { title: "Coupons", url: "/coupons", icon: TicketPercentIcon },
      { title: "FAQ", url: "/faqs", icon: MessageCircleQuestionIcon },
      { title: "Settings", url: "/settings", icon: SettingsIcon },
    ],
  },
  {
    label: "System",
    rootOnly: true,
    items: [
      { title: "Health", url: "/system", icon: ActivityIcon },
      { title: "Users", url: "/system/users", icon: UsersIcon },
      { title: "Audit log", url: "/system/logs", icon: ScrollTextIcon },
      { title: "Webhooks", url: "/webhooks", icon: AnchorIcon },
    ],
  },
];

export const GlobalSidebar = ({
  children,
  role,
  storeName,
}: GlobalSidebarProperties) => {
  const sidebar = useSidebar();
  const pathname = usePathname();

  const groups = navigation.filter(
    (group) => !group.rootOnly || role === "root"
  );

  const isActive = (url: string) =>
    url === "/" ? pathname === "/" : pathname.startsWith(url);

  return (
    <>
      <Sidebar variant="inset">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <div
                className={cn(
                  "flex h-[36px] items-center overflow-hidden font-semibold transition-all",
                  sidebar.open ? "px-2" : "-mx-1 justify-center"
                )}
              >
                {sidebar.open ? storeName : storeName.slice(0, 1).toUpperCase()}
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <Search />
        <SidebarContent>
          {groups.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.url)}
                        tooltip={item.title}
                      >
                        <Link href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem className="flex items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center">
                <UserMenu />
              </div>
              <div className="flex shrink-0 items-center gap-px">
                <ModeToggle />
                <NotificationsTrigger />
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>{children}</SidebarInset>
    </>
  );
};

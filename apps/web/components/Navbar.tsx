"use client";

import { BarChart3, BookOpen, ChevronDown, Home, LogIn, LogOut, Menu, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { learnerHome, type AuthUser } from "@/lib/api";

const publicNavItems = [
  { href: "/", label: "Home", icon: Home, exact: true },
  { href: "/disclosure", label: "Disclosure", icon: Sparkles }
];

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
  activeBase?: string;
};

function isRouteActive(pathname: string, item: NavItem) {
  const activePath = item.activeBase || item.href;
  if (item.exact) return pathname === activePath;
  return pathname === activePath || pathname.startsWith(`${activePath}/`);
}

function NavLink({
  item,
  pathname,
  mobile = false,
  onNavigate
}: {
  item: NavItem;
  pathname: string;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const active = isRouteActive(pathname, item);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
          "group inline-flex cursor-pointer items-center gap-2 rounded-md text-sm font-medium transition-all duration-200 hover:scale-[1.01] hover:shadow-sm",
        mobile
          ? "min-h-11 px-3 text-foreground hover:bg-accent hover:text-accent-foreground"
          : "min-h-9 px-3 text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        active && "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary"
      )}
    >
      <Icon className={cn("h-4 w-4 transition-transform group-hover:scale-105", active && "text-primary")} />
      {item.label}
    </Link>
  );
}

function UserMenu({ user, userHome, onLogout }: { user: AuthUser | null; userHome: string; onLogout: () => Promise<void> }) {
  if (!user) {
    return (
      <Button asChild size="sm" className="hidden md:inline-flex">
        <Link href="/login">
          <LogIn className="h-4 w-4" />
          Login
        </Link>
      </Button>
    );
  }

  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="hidden h-10 gap-2 px-2 md:inline-flex">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
            {initials}
          </span>
          <span className="max-w-32 truncate text-sm">{user.name}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <span className="block truncate">{user.name}</span>
          <span className="block truncate text-xs font-normal text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={userHome}>
            <UserRound className="h-4 w-4" />
            {user.role === "educator" ? "Educator dashboard" : "Learner dashboard"}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={user.role === "educator" ? "/educator" : "/learner"}>
            <BookOpen className="h-4 w-4" />
            Switch workspace
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onLogout}>
          <LogOut className="h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const userHome = useMemo(() => {
    if (!user) return "/login";
    return user.role === "educator" ? "/educator" : learnerHome(user);
  }, [user]);

  const navItems = useMemo<NavItem[]>(() => {
    if (!user) return publicNavItems;

    if (user.role === "educator") {
      return [
        { href: "/educator", label: "Dashboard", icon: BarChart3, activeBase: "/educator" },
        { href: "/safeguards", label: "Safeguards", icon: ShieldCheck },
        { href: "/disclosure", label: "Disclosure", icon: Sparkles }
      ];
    }

    return [
      { href: userHome, label: "Dashboard", icon: BookOpen, activeBase: "/learner" },
      { href: "/safeguards", label: "Safeguards", icon: ShieldCheck },
      { href: "/disclosure", label: "Disclosure", icon: Sparkles }
    ];
  }, [user, userHome]);

  async function handleLogout() {
    await logout();
    setMobileOpen(false);
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-3" aria-label="LearnShift AI home">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-hero-gradient text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-sm font-semibold tracking-normal text-ink">LearnShift AI</span>
            <span className="mt-1 hidden text-xs text-muted-foreground sm:block">Adaptive OOP tutor</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserMenu user={user} userHome={userHome} onLogout={handleLogout} />

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden" aria-label="Open navigation">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex w-[min(22rem,calc(100vw-2rem))] flex-col p-0">
              <SheetHeader className="border-b border-border px-5 py-4">
                <SheetTitle>LearnShift AI</SheetTitle>
                <SheetDescription>Adaptive OOP tutor</SheetDescription>
              </SheetHeader>

              <nav className="grid gap-1 px-3 py-4" aria-label="Mobile navigation">
                {navItems.map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} mobile onNavigate={() => setMobileOpen(false)} />
                ))}
              </nav>

              <div className="mt-auto border-t border-border p-4">
                {user ? (
                  <div className="space-y-3">
                    <div className="rounded-md border border-border bg-card p-3">
                      <p className="truncate text-sm font-medium text-card-foreground">{user.name}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{user.email}</p>
                      <span className="badge mt-3 capitalize">{user.role}</span>
                    </div>
                    <SheetClose asChild>
                      <Button asChild className="w-full justify-start">
                        <Link href={userHome}>
                          <UserRound className="h-4 w-4" />
                          Open dashboard
                        </Link>
                      </Button>
                    </SheetClose>
                    <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive" onClick={handleLogout}>
                      <LogOut className="h-4 w-4" />
                      Log out
                    </Button>
                  </div>
                ) : (
                  <SheetClose asChild>
                    <Button asChild className="w-full justify-start">
                      <Link href="/login">
                        <LogIn className="h-4 w-4" />
                        Login
                      </Link>
                    </Button>
                  </SheetClose>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

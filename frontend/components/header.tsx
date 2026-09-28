"use client";

import Link from "next/link";
import { Bitcoin, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useState } from "react";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background animate-slide-down">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-primary">
            <Bitcoin className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">
            Mini<span className="text-primary">Crypto</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-2 md:flex">
          <Link href="/markets">
            <Button variant="ghost" className="cursor-pointer text-muted-foreground hover:text-foreground">
              Thị trường
            </Button>
          </Link>
          <ThemeToggle />
          <Link href="/login">
            <Button variant="ghost" className="cursor-pointer">
              Đăng nhập
            </Button>
          </Link>
          <Link href="/register">
            <Button className="cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90">
              Đăng ký
            </Button>
          </Link>
        </nav>

        {/* Mobile menu toggle */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            className="cursor-pointer"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <div className="border-t border-border px-4 pb-4 pt-2 md:hidden animate-slide-down">
          <div className="flex flex-col gap-2">
            <Link href="/markets" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" className="w-full cursor-pointer justify-start text-muted-foreground hover:text-foreground">
                Thị trường
              </Button>
            </Link>
            <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" className="w-full cursor-pointer justify-start">
                Đăng nhập
              </Button>
            </Link>
            <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
              <Button className="w-full cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90">
                Đăng ký
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

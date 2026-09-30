"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Wallet,
  LogOut,
  Bitcoin,
  TrendingUp,
  ArrowUpDown,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";

interface Balance {
  asset: string;
  available: number;
  locked: number;
}

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  balances: Balance[];
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/login");
      return;
    }

    fetch("http://localhost:5215/api/user/profile", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Unauthorized");
        }
        return res.json();
      })
      .then((data) => setProfile(data))
      .catch(() => {
        setError("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        setTimeout(() => router.push("/login"), 2000);
      })
      .finally(() => setLoading(false));
  }, [router]);

  function handleLogout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
          <p className="text-muted-foreground">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md border-destructive/30">
          <CardContent className="p-6 text-center">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const usdtBalance = profile?.balances?.find((b) => b.asset === "USDT");
  const btcBalance = profile?.balances?.find((b) => b.asset === "BTC");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ═══════ DASHBOARD HEADER ═══════ */}
      <header className="sticky top-0 z-50 border-b border-border bg-background animate-slide-down">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center bg-primary">
              <Bitcoin className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              Mini<span className="text-primary">Crypto</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Separator orientation="vertical" className="h-6" />
            <div className="hidden items-center gap-2 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center bg-primary/10">
                <User className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium">{profile?.fullName}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="cursor-pointer text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* ═══════ MAIN CONTENT ═══════ */}
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Welcome */}
          <div className="mb-8 animate-slide-up">
            <h1 className="text-2xl font-bold sm:text-3xl">
              Xin chào, <span className="text-primary">{profile?.fullName}</span>
            </h1>
            <p className="mt-1 text-muted-foreground">{profile?.email}</p>
          </div>

          {/* ═══════ WALLET OVERVIEW ═══════ */}
          <div className="mb-8">
            <div className="mb-4 flex items-center gap-2 animate-slide-up delay-100">
              <Wallet className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Ví của tôi</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* USDT Card */}
              <Card className="border-border/50 transition-all duration-200 hover:border-primary/30 hover:translate-y-[-2px] animate-slide-up delay-200">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Số dư USDT
                  </CardTitle>
                  <div className="flex h-8 w-8 items-center justify-center bg-success/10">
                    <TrendingUp className="h-4 w-4 text-success" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold tabular-nums">
                    {(usdtBalance?.available ?? 0).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Đang khóa: {(usdtBalance?.locked ?? 0).toFixed(2)} USDT
                  </p>
                </CardContent>
              </Card>

              {/* BTC Card */}
              <Card className="border-border/50 transition-all duration-200 hover:border-primary/30 hover:translate-y-[-2px] animate-slide-up delay-300">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Số dư BTC
                  </CardTitle>
                  <div className="flex h-8 w-8 items-center justify-center bg-primary/10">
                    <Bitcoin className="h-4 w-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold tabular-nums">
                    {(btcBalance?.available ?? 0).toFixed(8)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Đang khóa: {(btcBalance?.locked ?? 0).toFixed(8)} BTC
                  </p>
                </CardContent>
              </Card>

              {/* Quick Action Card */}
              <Card className="border-primary/20 bg-primary/5 transition-all duration-200 hover:border-primary/40 animate-slide-up delay-400">
                <CardContent className="flex h-full flex-col items-center justify-center gap-3 p-6">
                  <div className="flex h-12 w-12 items-center justify-center bg-primary/20 rounded-full">
                    <ArrowUpDown className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-primary">Giao dịch ngay</p>
                  <p className="text-xs text-muted-foreground text-center">
                    Trải nghiệm Pro Trading Terminal
                  </p>
                  <div className="flex gap-2 w-full mt-2">
                    <Button
                      onClick={() => router.push("/dashboard/trade?symbol=BTCUSDT")}
                      className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
                    >
                      BTC/USDT
                    </Button>
                    <Button
                      onClick={() => router.push("/dashboard/trade?symbol=ETHUSDT")}
                      variant="outline"
                      className="flex-1 font-bold"
                    >
                      ETH/USDT
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ═══════ ACTIVITY PLACEHOLDER ═══════ */}
          <div className="animate-slide-up delay-500">
            <h2 className="mb-4 text-xl font-semibold">Lịch sử Giao dịch</h2>
            <Card className="border-border/50">
              <CardContent className="flex flex-col items-center justify-center gap-2 py-16">
                <ArrowUpDown className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-muted-foreground">Chưa có giao dịch nào</p>
                <p className="text-sm text-muted-foreground/60">
                  Các giao dịch của bạn sẽ hiển thị tại đây
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

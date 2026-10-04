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
  History,
  Activity
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
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/login");
      return;
    }

    // Fetch Profile
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
      });

    // Fetch Open Positions
    fetch("http://localhost:5215/api/trading/positions", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => setPositions(data))
      .catch(console.error)
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

  // Mock data for market overview
  const markets = [
    { symbol: "BTCUSDT", name: "Bitcoin", price: "70,250.00", change: "+2.4%", sparkline: "M0,40 Q10,30 20,35 T40,20 T60,25 T80,10 T100,5" },
    { symbol: "ETHUSDT", name: "Ethereum", price: "3,520.15", change: "+1.8%", sparkline: "M0,35 Q15,40 25,25 T50,30 T75,15 T100,10" },
    { symbol: "BNBUSDT", name: "Binance Coin", price: "580.40", change: "-0.5%", sparkline: "M0,20 Q10,25 25,15 T45,35 T70,30 T100,45", isDown: true },
  ];

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

              {/* Market Replay Card */}
              <Card className="border-primary/20 bg-primary/5 transition-all duration-200 hover:border-primary/40 animate-slide-up delay-400">
                <CardContent className="flex h-full flex-col items-center justify-center gap-3 p-6">
                  <div className="flex h-12 w-12 items-center justify-center bg-primary/20 rounded-full">
                    <History className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-primary">Chế độ Market Replay</p>
                  <p className="text-xs text-muted-foreground text-center">
                    Luyện tập giao dịch với dữ liệu quá khứ
                  </p>
                  <div className="flex w-full mt-2">
                    <Button
                      onClick={() => router.push("/dashboard/replay")}
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
                    >
                      Truy cập chế độ Replay
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ═══════ MARKET OVERVIEW ═══════ */}
          <div className="mb-8 animate-slide-up delay-500">
            <div className="mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Thị trường</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {markets.map((market) => (
                <Card 
                  key={market.symbol}
                  className="border-border/50 transition-all duration-200 hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
                  onClick={() => router.push(`/dashboard/trade?symbol=${market.symbol}`)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-bold">{market.symbol.replace("USDT", "/USDT")}</p>
                      <p className="text-xs text-muted-foreground">{market.name}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <p className="font-bold tabular-nums">${market.price}</p>
                      <p className={`text-xs font-medium ${market.isDown ? 'text-destructive' : 'text-success'}`}>
                        {market.change}
                      </p>
                    </div>
                    <div className="w-16 h-8 opacity-70">
                      <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-full">
                        <path 
                          d={market.sparkline} 
                          fill="none" 
                          stroke={market.isDown ? "#f43f5e" : "#10b981"} 
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* ═══════ OPEN POSITIONS ═══════ */}
          <div className="animate-slide-up delay-600">
            <h2 className="mb-4 text-xl font-semibold">Vị thế hiện tại đang hoạt động</h2>
            <Card className="border-border/50">
              <CardContent className="p-0 overflow-hidden">
                {positions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-16">
                    <ArrowUpDown className="h-10 w-10 text-muted-foreground/30" />
                    <p className="text-muted-foreground">Không có vị thế nào đang mở</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted/50 text-muted-foreground">
                        <tr>
                          <th className="font-medium py-3 px-4">Cặp giao dịch</th>
                          <th className="font-medium py-3 px-4">Vị thế</th>
                          <th className="font-medium py-3 px-4 text-right">Kích thước</th>
                          <th className="font-medium py-3 px-4 text-right">Giá vào lệnh</th>
                          <th className="font-medium py-3 px-4 text-right">Ký quỹ</th>
                          <th className="font-medium py-3 px-4 text-right">SL / TP</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {positions.map((p) => (
                          <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4 font-bold">{p.symbol.replace("USDT", "/USDT")}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                p.side === "Long" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                              }`}>
                                {p.side} {p.leverage}x
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right tabular-nums font-medium">{p.quantity}</td>
                            <td className="py-3 px-4 text-right tabular-nums">{p.entryPrice.toLocaleString()}</td>
                            <td className="py-3 px-4 text-right tabular-nums text-primary">{p.margin.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right text-muted-foreground text-xs tabular-nums">
                              {p.stopLossPrice ? p.stopLossPrice.toLocaleString() : "-"} / {p.takeProfitPrice ? p.takeProfitPrice.toLocaleString() : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

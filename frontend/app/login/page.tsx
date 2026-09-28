"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff, LogIn, Bitcoin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/header";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const res = await fetch("http://localhost:5215/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Đăng nhập thất bại!");
      } else {
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        router.push("/dashboard");
      }
    } catch {
      setError("Không thể kết nối tới server!");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md border-border/50 animate-scale-in">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center bg-primary">
              <Bitcoin className="h-6 w-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl font-bold">Chào mừng trở lại</CardTitle>
            <CardDescription>Đăng nhập để tiếp tục giao dịch</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2 animate-slide-up delay-100">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  className="focus-visible:ring-primary"
                />
              </div>

              <div className="space-y-2 animate-slide-up delay-200">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Mật khẩu</Label>
                  <Link
                    href="#"
                    className="text-xs text-muted-foreground transition-colors hover:text-primary"
                  >
                    Quên mật khẩu?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    className="pr-10 focus-visible:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive animate-slide-up">
                  {error}
                </div>
              )}

              <div className="animate-slide-up delay-300">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full cursor-pointer bg-primary text-base font-semibold text-primary-foreground transition-all duration-200 hover:bg-primary/90 hover:translate-y-[-1px] disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                      Đang xử lý...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <LogIn className="h-4 w-4" />
                      Đăng nhập
                    </span>
                  )}
                </Button>
              </div>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground animate-fade-in delay-400">
              Chưa có tài khoản?{" "}
              <Link
                href="/register"
                className="font-medium text-primary underline-offset-4 transition-colors hover:underline"
              >
                Đăng ký ngay
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

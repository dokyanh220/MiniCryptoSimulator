import Link from "next/link";
import {
  ArrowRight,
  TrendingUp,
  Shield,
  Zap,
  Wallet,
  BarChart3,
  Globe,
  Bitcoin,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { MiniChartPreview } from "@/components/mini-chart";

const features = [
  {
    icon: Wallet,
    title: "10,000 USDT miễn phí",
    description: "Nhận ngay 10,000 USDT ảo khi đăng ký để bắt đầu giao dịch không rủi ro.",
  },
  {
    icon: BarChart3,
    title: "Giá thị trường Realtime",
    description: "Dữ liệu giá BTC/USDT được cập nhật theo thời gian thực từ Binance.",
  },
  {
    icon: Zap,
    title: "Khớp lệnh tức thì",
    description: "Đặt lệnh Market hoặc Limit, hệ thống khớp lệnh nhanh chóng và chính xác.",
  },
  {
    icon: Shield,
    title: "An toàn tuyệt đối",
    description: "Không sử dụng tiền thật. Học giao dịch mà không lo mất vốn.",
  },
  {
    icon: TrendingUp,
    title: "Lịch sử giao dịch",
    description: "Theo dõi toàn bộ lịch sử mua bán, phân tích hiệu suất đầu tư của bạn.",
  },
  {
    icon: Globe,
    title: "Giao diện Việt hoá",
    description: "Giao diện hoàn toàn bằng Tiếng Việt, thân thiện với người mới bắt đầu.",
  },
];

const tickerData = [
  { symbol: "BTC/USDT", price: "67,234.50", change: "+2.34%", up: true },
  { symbol: "ETH/USDT", price: "3,456.78", change: "+1.12%", up: true },
  { symbol: "BNB/USDT", price: "543.21", change: "-0.87%", up: false },
  { symbol: "SOL/USDT", price: "178.90", change: "+5.67%", up: true },
  { symbol: "XRP/USDT", price: "0.6234", change: "-1.23%", up: false },
  { symbol: "ADA/USDT", price: "0.4567", change: "+3.45%", up: true },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        {/* ═══════ PRICE TICKER BAR ═══════ */}
        <div className="overflow-hidden border-b border-border bg-card">
          <div className="animate-ticker flex w-max gap-8 px-4 py-2">
            {[...tickerData, ...tickerData].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm whitespace-nowrap">
                <span className="font-medium">{item.symbol}</span>
                <span className="tabular-nums">{item.price}</span>
                <span
                  className={`flex items-center gap-0.5 tabular-nums ${
                    item.up ? "text-success" : "text-danger"
                  }`}
                >
                  {item.up ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {item.change}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════ HERO SECTION ═══════ */}
        <section className="relative overflow-hidden">
          {/* Animated background dots */}
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-[10%] top-[20%] h-2 w-2 rounded-full bg-primary/20 animate-float" />
            <div className="absolute right-[15%] top-[30%] h-3 w-3 rounded-full bg-primary/15 animate-float delay-200" />
            <div className="absolute left-[30%] top-[60%] h-2 w-2 rounded-full bg-primary/10 animate-float delay-400" />
            <div className="absolute right-[25%] top-[70%] h-1.5 w-1.5 rounded-full bg-primary/20 animate-float delay-600" />
            <div className="absolute left-[60%] top-[15%] h-2.5 w-2.5 rounded-full bg-primary/15 animate-float delay-300" />
          </div>

          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              {/* Badge */}
              <div className="animate-slide-down mb-6 inline-flex items-center gap-2 border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
                <Zap className="h-4 w-4" />
                Sàn giao dịch mô phỏng #1 Việt Nam
              </div>

              {/* Heading */}
              <h1 className="animate-slide-up text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                Học Giao Dịch{" "}
                <span className="relative inline-block">
                  <span className="bg-gradient-to-r from-primary to-yellow-400 bg-clip-text text-transparent">
                    Crypto
                  </span>
                  <span className="absolute -bottom-1 left-0 h-0.5 w-full bg-gradient-to-r from-primary to-yellow-400 animate-scale-in delay-500" />
                </span>{" "}
                <br className="hidden sm:block" />
                Không Rủi Ro
              </h1>

              {/* Subtitle */}
              <p className="animate-slide-up delay-200 mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                Trải nghiệm giao dịch BTC/USDT với giá thực từ Binance. Nhận ngay{" "}
                <span className="font-semibold text-primary">10,000 USDT ảo</span> khi đăng ký
                — hoàn toàn miễn phí, không cần tiền thật.
              </p>

              {/* CTA Buttons */}
              <div className="animate-slide-up delay-400 mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link href="/register">
                  <Button
                    size="lg"
                    className="cursor-pointer gap-2 bg-primary px-8 text-base font-semibold text-primary-foreground transition-all duration-200 hover:bg-primary/90 hover:translate-y-[-2px] hover:shadow-lg hover:shadow-primary/20"
                  >
                    Bắt đầu Giao dịch
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button
                    variant="outline"
                    size="lg"
                    className="cursor-pointer px-8 text-base transition-all duration-200 hover:translate-y-[-2px]"
                  >
                    Đăng nhập
                  </Button>
                </Link>
              </div>

              {/* Dynamic Mini Chart Preview linking to Markets */}
              <div className="animate-scale-in delay-600 mx-auto mt-16 max-w-xl">
                <Link href="/markets" className="block group cursor-pointer">
                  <div className="border border-border bg-card p-6 transition-all duration-300 group-hover:border-primary/50 group-hover:shadow-[0_0_20px_rgba(252,213,53,0.15)] relative overflow-hidden">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bitcoin className="h-5 w-5 text-primary" />
                        <span className="font-semibold group-hover:text-primary transition-colors">Bitcoin (BTC)</span>
                      </div>
                      <div className="flex items-center gap-1 text-success">
                        <ArrowUpRight className="h-4 w-4" />
                        <span className="text-sm font-medium">Thị trường ›</span>
                      </div>
                    </div>
                    
                    {/* Biểu đồ thực tế mini (30 phút) */}
                    <MiniChartPreview symbol="BTCUSDT" />
                    
                    <div className="mt-4 flex justify-between text-sm text-muted-foreground">
                      <span>Nhấp để xem tổng quan thị trường</span>
                    </div>
                  </div>
                </Link>
              </div>

              {/* Stats */}
              <div className="mt-16 grid grid-cols-3 gap-8 border-t border-border pt-8">
                <div className="animate-slide-up delay-300">
                  <p className="text-2xl font-bold text-primary sm:text-3xl tabular-nums">10K+</p>
                  <p className="mt-1 text-sm text-muted-foreground">USDT ảo miễn phí</p>
                </div>
                <div className="animate-slide-up delay-400">
                  <p className="text-2xl font-bold sm:text-3xl">BTC/USDT</p>
                  <p className="mt-1 text-sm text-muted-foreground">Cặp giao dịch</p>
                </div>
                <div className="animate-slide-up delay-500">
                  <p className="text-2xl font-bold sm:text-3xl tabular-nums">0.1%</p>
                  <p className="mt-1 text-sm text-muted-foreground">Phí giao dịch</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════ FEATURES SECTION ═══════ */}
        <section className="border-t border-border py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Tại sao chọn <span className="text-primary">MiniCrypto</span>?
              </h2>
              <p className="mt-4 text-muted-foreground">
                Mọi thứ bạn cần để bắt đầu hành trình giao dịch Crypto — không rủi ro, không phí ẩn.
              </p>
            </div>

            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, i) => (
                <Card
                  key={feature.title}
                  className="group border-border/50 transition-all duration-200 hover:border-primary/30 hover:translate-y-[-4px] hover:shadow-md"
                >
                  <CardContent className="p-6">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-semibold">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ HOW IT WORKS ═══════ */}
        <section className="border-t border-border bg-card py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
              Bắt đầu trong <span className="text-primary">3 bước</span>
            </h2>

            <div className="mt-16 grid gap-8 md:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Đăng ký tài khoản",
                  desc: "Chỉ cần email và mật khẩu. Không yêu cầu xác minh danh tính.",
                },
                {
                  step: "02",
                  title: "Nhận 10,000 USDT",
                  desc: "Hệ thống tự động nạp 10,000 USDT ảo vào ví của bạn ngay lập tức.",
                },
                {
                  step: "03",
                  title: "Bắt đầu giao dịch",
                  desc: "Mua bán BTC/USDT với giá thực từ Binance. Không rủi ro.",
                },
              ].map((item, i) => (
                <div key={i} className="relative pl-8 md:pl-0 md:text-center">
                  <span className="text-5xl font-black text-primary/15 md:text-6xl">
                    {item.step}
                  </span>
                  <h3 className="mt-2 text-xl font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ CTA SECTION ═══════ */}
        <section className="py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="border border-primary/20 bg-primary/5 px-8 py-16 text-center sm:px-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Sẵn sàng trở thành Trader?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                Đăng ký ngay hôm nay và nhận 10,000 USDT ảo để bắt đầu giao dịch. Không yêu cầu
                xác minh danh tính, không cần thẻ tín dụng.
              </p>
              <div className="mt-8">
                <Link href="/register">
                  <Button
                    size="lg"
                    className="cursor-pointer gap-2 bg-primary px-10 text-base font-semibold text-primary-foreground transition-all duration-200 hover:bg-primary/90 hover:translate-y-[-2px] hover:shadow-lg hover:shadow-primary/20"
                  >
                    Đăng ký miễn phí
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

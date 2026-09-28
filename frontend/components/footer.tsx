import Link from "next/link";
import { Bitcoin } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-8 sm:px-6 md:flex-row md:justify-between lg:px-8">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center bg-primary">
            <Bitcoin className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold">
            Mini<span className="text-primary">Crypto</span>
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} MiniCrypto Simulator. Đây là sàn giao dịch mô phỏng, không
          sử dụng tiền thật.
        </p>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <Link href="#" className="transition-colors hover:text-foreground">
            Điều khoản
          </Link>
          <Link href="#" className="transition-colors hover:text-foreground">
            Bảo mật
          </Link>
        </div>
      </div>
    </footer>
  );
}

import "../styles/globals.css";
import Link from "next/link";

export default function App({ Component, pageProps }) {
  return (
    <div>
      <nav className="border-b p-6">
        <p className="text-4xl font-bold">Sàn giao dịch tranh NFT</p>
        <div className="flex mt-4">
          <Link href="/">
            <p className="mr-4 text-pink-500">Trang chủ</p>
          </Link>
          <Link href="/create-nft">
            <p className="mr-4 text-pink-500">Đăng bán tranh</p>
          </Link>
          <Link href="/my-nfts">
            <p className="mr-4 text-pink-500">Tranh của tôi</p>
          </Link>
          <Link href="/dashboard">
            <p className="mr-4 text-pink-500">Thống kê</p>
          </Link>
          <Link href="/auction">
            <p className="mr-4 text-pink-500">Đấu giá</p>
          </Link>
        </div>
      </nav>

      <Component {...pageProps} />
    </div>
  );
}

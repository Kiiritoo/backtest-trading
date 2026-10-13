import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ForexSim — Professional Forex Backtesting Platform",
  description: "Latih skill trading forex kamu dengan simulasi real market. Backtest strategi, manage portfolio, dan dapatkan reward setiap trade.",
  keywords: "forex, backtesting, trading simulator, xauusd, eurusd, gbpjpy, paper trading",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}

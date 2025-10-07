import "./globals.css";

export const metadata = {
  title: "BOMator",
  description: "Generate BOMs from natural-language specs",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-white">{children}</body>
    </html>
  );
}

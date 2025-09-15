import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata = { title: "PlantWatch", description: "PLC Monitor" };


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        <div className="mx-auto max-w-6xl p-6 space-y-6">
          <header className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">PlantWatch</h1>
            <nav className="text-sm text-gray-600">Local API: {process.env.NEXT_PUBLIC_API}</nav>
          </header>
          {children}
        </div>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
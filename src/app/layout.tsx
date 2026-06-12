import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { NavBar } from "@/components/ui/nav-bar";
import { ClerkProvider } from "@clerk/nextjs";
import { AudioUnlockPrompt } from "@/components/audio/AudioUnlockPrompt";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JeFocus — Focus Timer with Ambient Sounds",
  description: "A Pomodoro timer with multi-channel ambient audio mixer",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        options: {
          // Hide Clerk's "Development mode" badge while on dev (pk_test_) keys.
          unsafe_disableDevelopmentModeWarnings: true,
        },
      }}
    >
      <html lang="en" className={`${geist.variable} h-full antialiased`}>
        <body className="min-h-full flex flex-col bg-[#F8F9FA] text-foreground transition-colors duration-500">
          <Providers>
            <NavBar />
            {children}
            <AudioUnlockPrompt />
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}

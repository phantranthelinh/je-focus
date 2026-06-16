import type { Metadata } from "next";
import { Geist, Inconsolata } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { NavBar } from "@/components/ui/nav-bar";
import { ClerkProvider } from "@clerk/nextjs";
import { clerkEnabled } from "@/lib/clerk-config";
import { AudioUnlockPrompt } from "@/components/audio/AudioUnlockPrompt";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const inconsolata = Inconsolata({
  variable: "--font-inconsolata",
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
  const tree = (
    <html lang="en" className={`${geist.variable} ${inconsolata.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#fafafa] text-foreground transition-colors duration-500">
        <Providers>
          <NavBar />
          {children}
          <AudioUnlockPrompt />
        </Providers>
      </body>
    </html>
  );

  // Skip ClerkProvider when Clerk is disabled (e.g. preview sandbox) so clerk-js
  // never loads and never redirects the tab to the accounts.dev dev handshake.
  if (!clerkEnabled) return tree;

  return (
    <ClerkProvider
      appearance={{
        options: {
          // Hide Clerk's "Development mode" badge while on dev (pk_test_) keys.
          unsafe_disableDevelopmentModeWarnings: true,
        },
        elements: {
          // Hide the "Secured by Clerk" branding badge in the footer.
          // Keeps the sibling "Don't have an account? Sign up" action visible.
          footerItem: { display: 'none' },
        },
      }}
    >
      {tree}
    </ClerkProvider>
  );
}

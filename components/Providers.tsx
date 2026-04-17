"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { fontSize: "13px", maxWidth: "360px" },
        }}
      />
      {children}
    </SessionProvider>
  );
}

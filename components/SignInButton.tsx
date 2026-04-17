"use client";

import { signIn } from "next-auth/react";

export default function SignInButton() {
  return (
    <button
      onClick={() => signIn("google", { callbackUrl: "/inbox" })}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        background: "#FFFFFF",
        color: "#3C4043",
        border: "1px solid #DADCE0",
        borderRadius: "8px",
        padding: "12px 24px",
        fontSize: "15px",
        fontWeight: 500,
        cursor: "pointer",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        fontFamily: "inherit",
        transition: "box-shadow 0.15s ease, background 0.15s ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
        (e.currentTarget as HTMLButtonElement).style.background = "#F8F9FA";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.08)";
        (e.currentTarget as HTMLButtonElement).style.background = "#FFFFFF";
      }}
    >
      <GoogleIcon />
      Sign in with Google
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

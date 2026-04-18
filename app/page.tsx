import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Image from "next/image";
import SignInButton from "@/components/SignInButton";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/inbox");

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center" style={{ gap: 24 }}>
      <Image
        src="/logo.svg"
        alt="MaiLLY"
        width={320}
        height={80}
        priority
        style={{ position: "relative", left: "-5px" }}
      />
      <p style={{ color: "#6B7280", fontSize: "15px", margin: "-8px 0 0" }}>
        Smart replies, before you even think.
      </p>
      <SignInButton />
      <a
        href="https://tally.so/r/Y5zQ95"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 font-semibold text-[#534AB7] hover:text-[#3d3690] transition-colors"
        style={{ textDecoration: "none", fontSize: "14px" }}
      >
        Join the Waitlist
        <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ transform: "translateY(-1px)" }}>
          <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
        </svg>
      </a>
    </main>
  );
}
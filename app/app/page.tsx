import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#faf7f2]">
      <div className="max-w-md text-center">
        <Link href="/signup" className="underline">
          Sign up
        </Link>

        <br></br>

        <Link href="/login" className="underline">
          Login
        </Link>
      </div>
    </main>
  );
}

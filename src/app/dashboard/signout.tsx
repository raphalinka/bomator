"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <Link href="/logout" prefetch={false}>
      <Button variant="ghost" className="px-2 py-1 text-sm">Sign out</Button>
    </Link>
  );
}

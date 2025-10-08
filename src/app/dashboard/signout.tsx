"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <Link href="/logout" prefetch={false}>
      <Button variant="ghost" size="sm">Sign out</Button>
    </Link>
  );
}

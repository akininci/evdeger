"use client";

import { SignIn } from "@clerk/nextjs";
import { ClerkWrapper } from "@/components/ClerkWrapper";

export default function SignInPage() {
  return (
    <ClerkWrapper>
      <div className="min-h-screen flex items-center justify-center bg-background">
        <SignIn />
      </div>
    </ClerkWrapper>
  );
}

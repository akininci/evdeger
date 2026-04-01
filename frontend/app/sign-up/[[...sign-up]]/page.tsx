"use client";

import { SignUp } from "@clerk/nextjs";
import { ClerkWrapper } from "@/components/ClerkWrapper";

export default function SignUpPage() {
  return (
    <ClerkWrapper>
      <div className="min-h-screen flex items-center justify-center bg-background">
        <SignUp />
      </div>
    </ClerkWrapper>
  );
}

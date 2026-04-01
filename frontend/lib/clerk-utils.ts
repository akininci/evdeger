// Check if Clerk is properly configured (not placeholder keys)
export function isClerkEnabled(): boolean {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return !!(key && !key.includes("REPLACE"));
}

import type { ReactNode } from 'react';

/**
 * Inside the church platform, only a signed-in church admin can open the quiz
 * at all (app/tools/quiz/[[...path]]/route.ts checks that before the page is
 * sent), which is a real sign-in, unlike the shared 4-digit PIN this used to
 * ask for. Kept as a wrapper so the pages that use it don't change.
 */
export function RequireHostAuth({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

// =============================
// utils/withAuth.tsx
// =============================

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";

export default function withAuth(Component: React.ComponentType) {
  return function ProtectedComponent(props: any) {
    const router = useRouter();

    useEffect(() => {
      const auth = getAuth();
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (!user) {
          router.push("/auth/login");
        }
      });

      return () => unsubscribe();
    }, [router]);

    return <Component {...props} />;
  };
}

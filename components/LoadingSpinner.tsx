// =============================
// components/LoadingSpinner.tsx
// =============================

"use client";

export default function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center py-12">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#FB8500] border-t-transparent"></div>
    </div>
  );
}

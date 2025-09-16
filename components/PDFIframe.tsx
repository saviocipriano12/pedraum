// components/PDFIframe.tsx
"use client";
type Props = { src: string; height?: number };
export default function PDFIframe({ src, height = 720 }: Props) {
  return (
    <div className="w-full rounded-2xl overflow-hidden border">
      <iframe src={src} style={{ width: "100%", height }} />
    </div>
  );
}

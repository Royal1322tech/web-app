import { Reveal } from "@/components/motion/reveal";
import "./hotel-illustration.css";

export function HotelIllustration() {
  return <Reveal className="hotel-miniature" aria-hidden="true">
    <svg viewBox="0 0 200 130" fill="none">
      <ellipse cx="100" cy="117" rx="76" ry="9" fill="#062747" opacity=".08" />
      <g className="hotel-miniature-building">
        <path d="m29 95 70-37 71 37-71 30Z" fill="#d4e8e5" />
        <path d="M53 42 101 17v90L53 83Z" fill="#164768" />
        <path d="m101 17 48 25v41l-48 24Z" fill="#062747" />
        <path d="m49 42 52-28 52 28-52 27Z" fill="#789b9f" />
        <path d="m49 39 52-28 52 28-52 27Z" fill="#c8dcd8" />
        <path d="M67 79 101 97l34-18v19l-34 18-34-18Z" fill="#087c83" />
        <path d="m88 90 13 7 13-7v17l-13 7-13-7Z" fill="#e4b86a" />
        <g className="hotel-miniature-windows" stroke="#f7d38e" strokeWidth="5">
          <path d="m65 53 0 10m14-3v10m14-3v10m20-10v10m14-17v10m14-17v10" />
          <path d="m65 70 0 10m14-3v10m14-3v10m20-10v10m14-17v10m14-17v10" />
        </g>
        <path d="M38 87v17m122-17v17" stroke="#8a6c39" strokeWidth="3" />
        <path d="m38 81-10 8h20Zm122 0-10 8h20Z" fill="#07878a" />
      </g>
    </svg>
  </Reveal>;
}

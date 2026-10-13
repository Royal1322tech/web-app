import type { SVGProps } from "react";

const paths = {
  arrowUpRight: "M6 18 18 6M6 6h12v12",
  arrowRight: "M4 12h16m-6-6 6 6-6 6",
  calendar: "M4 5h16v16H4ZM8 3v4m8-4v4M4 10h16",
  heart:
    "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z",
  pool: "M3 18q3-3 6 0t6 0t6 0M3 22q3-3 6 0t6 0t6 0M7 15V4a2 2 0 0 1 4 0m4 13V4a2 2 0 0 1 4 0M7 7h8m-8 5h8",
  gym: "m3 8 5-5m8 18 5-5M2 11l9-9m2 20 9-9M7 7l10 10",
  food: "M4 3v6a3 3 0 0 0 6 0V3M7 3v18M20 3c-5 2-5 9 0 9m0-9v18",
  spa: "M12 21C1 19 2 10 2 10s6 0 10 7m0 4c11-2 10-11 10-11s-6 0-10 7m0 4C4 13 12 3 12 3s8 10 0 18",
  nonSmoking: "M3 14h14v4H3Zm17 0v4m3-4v4M3 3l18 18M15 3c-3 3 4 3 1 7",
  size: "M3 8V3h5m8 0h5v5M3 16v5h5m8 0h5v-5M3 3l6 6m6 6 6 6M21 3l-6 6M9 15l-6 6",
  search: "m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  car: "m3 10 2-6h14l2 6M3 10h18v8H3Zm2 8v3m14-3v3M6 14h2m8 0h2",
  bed: "M3 5v16m0-4h18v4M3 9h7v8m0-6h8a3 3 0 0 1 3 3v3M6 7h1",
  bell: "M6 8a6 6 0 0 1 12 0v6l3 3H3l3-3Zm4 13h4",
  cart: "M2 3h3l3 13h11l3-9H6m3 13h.01M18 20h.01",
  menu: "M3 6h18M3 12h18M3 18h18",
  close: "m6 6 12 12M18 6 6 18",
  star: "m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z",
  shield: "m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Zm-5 9 4 4 6-6",
  buildingFilled:
    "M4 21V7h5V3h11v18h-6v-5h-3v5Zm7-16v2h2V5Zm4 0v2h2V5Zm-4 4v2h2V9Zm4 0v2h2V9ZM6 9v2h1V9Zm0 4v2h1v-2Zm0 4v2h1v-2Z",
  personFilled:
    "M12 2c-4 0-5 3-5 6 0 3 1 5 3 6v2c-5 1-8 3-8 5v1h20v-1c0-2-3-4-8-5v-2c2-1 3-3 3-6 0-3-1-6-5-6Z",
  upload:
    "M7 17H6a4 4 0 0 1-1-8 7 7 0 0 1 14-1 5 5 0 0 1-1 9h-1m-5 4V10m-4 4 4-4 4 4",
  document: "M14 3H5v18h14V8Zm0 0v5h5M8 12h8m-8 4h6",
  building:
    "M4 21V7h7v14M11 3h8v18M2 21h20M7 10v1m0 3v1m0 3v1m8-12v1m0 3v1m0 3v1m0 3v1",
  user: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8m10-5v6m-3-3h6",
  globe:
    "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18",
  pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  people:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8m8-7a4 4 0 0 1 0 8m5 9v-2a4 4 0 0 0-3-4",
  id: "M3 5h18v14H3ZM7 9h3v3H7Zm-1 7h5m3-7h4m-4 4h4",
  mail: "M3 5h18v14H3Zm0 1 9 7 9-7",
  phone:
    "M5 3h4l2 5-3 2a15 15 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A18 18 0 0 1 3 5a2 2 0 0 1 2-2Z",
  eye: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  eyeOff:
    "m3 3 18 18M10 5h2c7 0 10 7 10 7a18 18 0 0 1-3 4M6 6a18 18 0 0 0-4 6s3 7 10 7c2 0 4-1 5-2M10 10a3 3 0 0 0 4 4",
  back: "m14 6-6 6 6 6",
  chevron: "m6 9 6 6 6-6",
  info: "M12 16v-4m0-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  check: "m5 12 4 4L19 6",
} as const;

export type IconName = keyof typeof paths;

export function Icon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill={name.endsWith("Filled") ? "currentColor" : "none"}
      fillRule="evenodd"
      stroke={name.endsWith("Filled") ? "none" : "currentColor"}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}

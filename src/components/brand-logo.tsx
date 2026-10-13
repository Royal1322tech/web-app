import { useEffect, useId, useState } from "react";

/** Hand-drawn, layered interpretation; the original raster is preserved separately. */
export function BrandEmblem() {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
      className="brand-emblem"
    >
      <defs>
        <linearGradient
          id={`${id}-sea`}
          x1="20"
          y1="45"
          x2="90"
          y2="115"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#00B4D8" />
          <stop offset="1" stopColor="#0B2545" />
        </linearGradient>
        <linearGradient
          id={`${id}-sun`}
          x1="45"
          y1="20"
          x2="80"
          y2="75"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FFD59E" />
          <stop offset="1" stopColor="#F4A261" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <circle cx="60" cy="63" r="43" />
        </clipPath>
      </defs>
      <g className="brand-globe" clipPath={`url(#${id}-clip)`}>
        <circle cx="60" cy="63" r="43" fill={`url(#${id}-sea)`} />
        <circle
          className="brand-sun"
          cx="70"
          cy="49"
          r="31"
          fill={`url(#${id}-sun)`}
        />
        <path d="m25 70 17-25 18 25 12-14 22 23Z" fill="#0B2545" />
        <path
          d="M85 77q5-19 0-34m0 4q-12-10-16 0 10-3 16 0m0 0q5-13 15-6-8 0-15 6m0-2q-6-15-13-9 9 1 13 9m0 0q10-10 17-1-10-3-17 1"
          stroke="#0B2545"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <g className="brand-waves">
          <path d="M9 74Q34 55 61 76T112 76V115H9Z" fill={`url(#${id}-sea)`} />
          <path
            d="M9 74Q34 55 61 76T112 76M15 94Q35 76 65 95T115 92"
            stroke="white"
            strokeWidth="4"
          />
        </g>
      </g>
      <path
        className="brand-arc"
        d="M65 111C-3 104-2 33 49 12"
        stroke="#F4A261"
        strokeWidth="3"
        strokeLinecap="round"
        pathLength="1"
      />
      <path
        d="M13 85Q35 40 100 24"
        stroke="#FFD59E"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        className="brand-plane"
        d="m85 28-14-9 5-3 17 6 13-9q6-3 6 1l-13 13-1 17-5 3-3-16-9 5-5-3Z"
        fill="#0B2545"
        stroke="#fff"
        strokeWidth="1.5"
      />
    </svg>
  );
}
export function BrandLogo({
  withName = false,
  animated = false,
  homepageIntro = false,
}: {
  withName?: boolean;
  animated?: boolean;
  homepageIntro?: boolean;
}) {
  return (
    <div
      className={`brand-logo ${withName ? "brand-logo--with-name" : "brand-logo--full"} ${animated ? "brand-logo--animated" : ""} ${homepageIntro ? "brand-logo--homepage-intro" : ""}`}
      role="img"
      aria-label="Royal Vacation"
    >
      <BrandEmblem />
      <span className="brand-wordmark" aria-hidden="true">
        <strong>
          ROY<span>A</span>L
        </strong>
        <small>VACATION</small>
      </span>
    </div>
  );
}
export function AnimatedBrandLogo() {
  return <BrandLogo withName animated />;
}

// One introduction per document, including when client navigation returns home.
let homepageIntroPlayed = false;
export function HomepageBrandLogo() {
  const [playIntro] = useState(() => !homepageIntroPlayed);
  useEffect(() => {
    homepageIntroPlayed = true;
  }, []);
  return <BrandLogo withName homepageIntro={playIntro} />;
}

/** Decorative travel motif; it conveys no product service or interactive action. */
export function TravelTrail() {
  return (
    <svg
      className="travel-trail"
      viewBox="0 0 460 90"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        className="travel-trail-line"
        d="M10 70C80 90 95 5 185 34S315 90 438 16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="4 7"
      />
      <circle
        className="travel-trail-accent"
        cx="185"
        cy="34"
        r="5"
        fill="var(--gold)"
      />
      <circle cx="10" cy="70" r="3" fill="currentColor" />
      <g className="travel-trail-plane">
        <path
          d="m-4 0-14-9 4-2 16 7 9-5q6-2 5 2L5 3 0 17l-4 1 1-14-8 3-4-2Z"
          fill="var(--royal)"
        />
      </g>
    </svg>
  );
}

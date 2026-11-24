/** Small stepped cup (pixel look, no emoji); colour follows `currentColor`. */
export function Trophy({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      shapeRendering="crispEdges"
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: '-2px' }}
    >
      <path
        fill="currentColor"
        d="M2 1h8v1h2v3h-1v1h-1v1H9v1H7v1h1v1h1v2H3v-2h1V9h1V8H3V7H2V6H1V5H0V2h2zM1 3v1h1V3zm9 0v1h1V3z"
      />
    </svg>
  );
}

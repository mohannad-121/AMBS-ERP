const paths: Record<string, string> = {
  dashboard: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  people:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3a4 4 0 0 1 0 8",
  building:
    "M4 21V3h12v18 M16 9h4v12 M2 21h20 M8 7h4 M8 11h4 M8 15h4 M8 21v-2h4v2",
  document:
    "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h5",
  box: "m12 3 9 5v9l-9 5-9-5V8z M3 8l9 5 9-5 M12 13v9 M7.5 5.5l9 5",
  truck:
    "M1 4h14v13H1z M15 9h4l3 4v4h-7 M5.5 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5 M18.5 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5",
  production: "M3 21V9l6 4V7l6 4V3h5v18z M7 17h1 M12 17h1 M17 17h1",
  shield: "m12 3 9 4v5c0 5-9 10-9 10S3 17 3 12V7z m-4 9 3 3 5-6",
  pulse: "M2 12h5l3-9 4 18 3-9h5",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  chevron: "m14 6-6 6 6 6",
  menu: "M4 6h16 M4 12h16 M4 18h16",
  close: "m6 6 12 12 M6 18 18 6",
};
export function Icon({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  return (
    <svg
      className={`icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] ?? paths.document} />
    </svg>
  );
}

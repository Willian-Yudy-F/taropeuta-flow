/** Signature element: a tarot-card border with fine corner stars. */
export default function TarotFrame({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  const Corner = ({ pos }: { pos: string }) => (
    <svg viewBox="0 0 24 24" className={`tarot-corner ${pos}`} fill="currentColor" aria-hidden>
      <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" />
    </svg>
  );
  return (
    <div className={`tarot-frame ${className}`}>
      <Corner pos="left-2 top-2" />
      <Corner pos="right-2 top-2" />
      <Corner pos="left-2 bottom-2" />
      <Corner pos="right-2 bottom-2" />
      {children}
    </div>
  );
}

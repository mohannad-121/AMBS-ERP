"use client";
import { useEffect, useRef, useState } from "react";

// Decimal strings never pass through Number: database quantities can exceed 2^53.
export function formatQuantity(value: string, precision = 0): string {
  const [integer, fraction = ""] = value.split(".");
  return (
    new Intl.NumberFormat("en-AE").format(BigInt(integer)) +
    (precision ? "." + fraction.padEnd(precision, "0").slice(0, precision) : "")
  );
}
export function CountUp({
  value,
  precision = 0,
}: {
  value: string;
  precision?: number;
}) {
  const element = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState<string>(() =>
    formatQuantity("0", precision),
  );
  useEffect(() => {
    const node = element.current;
    if (!node) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0,
      started = false;
    const final = formatQuantity(value, precision);
    const [integer, fraction = ""] = value.split(".");
    const target = BigInt(
      integer + fraction.padEnd(precision, "0").slice(0, precision),
    );
    const stop = () => {
      cancelAnimationFrame(frame);
      setDisplay(final);
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || started) return;
      started = true;
      observer.disconnect();
      if (media.matches || target === BigInt(0)) {
        stop();
        return;
      }
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / 1400);
        const scaled =
          (target *
            BigInt(Math.round((1 - Math.pow(1 - progress, 3)) * 1000000))) /
          BigInt(1000000);
        const digits = scaled.toString().padStart(precision + 1, "0");
        const raw = precision
          ? digits.slice(0, -precision) + "." + digits.slice(-precision)
          : digits;
        setDisplay(progress === 1 ? final : formatQuantity(raw, precision));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });
    const onMotion = () => {
      if (media.matches) stop();
    };
    media.addEventListener("change", onMotion);
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      media.removeEventListener("change", onMotion);
    };
  }, [value, precision]);
  const final = formatQuantity(value, precision);
  return (
    <span ref={element} className="count-up" data-final-value={final}>
      <span className="sr-only">{final}</span>
      <span aria-hidden="true">{display ?? final}</span>
    </span>
  );
}

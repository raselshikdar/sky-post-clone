interface DoyelLogoProps {
  className?: string;
}

export default function DoyelLogo({ className = "h-8 w-8" }: DoyelLogoProps) {
  return (
    <img
      src="/doyel-logo.png"
      alt="Doyel"
      className={`${className} drop-shadow-[0_0_1px_hsl(var(--foreground)/0.3)]`}
      draggable={false}
    />
  );
}

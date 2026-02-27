interface AwajLogoProps {
  className?: string;
}

export default function AwajLogo({ className = "h-8 w-8" }: AwajLogoProps) {
  return (
    <img
      src="/awaj-logo.png"
      alt="Awaj"
      className={`${className} drop-shadow-[0_0_1px_hsl(var(--foreground)/0.3)]`}
      draggable={false}
    />
  );
}

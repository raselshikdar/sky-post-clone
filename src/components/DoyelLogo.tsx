interface DoyelLogoProps {
  className?: string;
}

export default function DoyelLogo({ className = "h-8 w-8" }: DoyelLogoProps) {
  return (
    <img
      src="/doyel-logo.png"
      alt="Doyel"
      className={className}
      draggable={false}
    />
  );
}

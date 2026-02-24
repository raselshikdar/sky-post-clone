interface DoyelLogoProps {
  className?: string;
}

export default function DoyelLogo({ className = "h-8 w-8" }: DoyelLogoProps) {
  return (
    <img
      src="/doyel-logo.png"
      alt="Doyel"
      className={`${className} dark:brightness-150 dark:contrast-125`}
      draggable={false}
    />
  );
}

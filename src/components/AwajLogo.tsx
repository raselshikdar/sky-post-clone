import { Radio } from "lucide-react";

interface AwajLogoProps {
  className?: string;
}

export default function AwajLogo({ className = "h-8 w-8" }: AwajLogoProps) {
  return (
    <Radio 
      className={`text-primary ${className}`}
      strokeWidth={2}
    />
  );
}

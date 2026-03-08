import { Radio } from "lucide-react";

interface AwajLogoProps {
  className?: string;
  size?: number;
}

export default function AwajLogo({ className = "", size = 32 }: AwajLogoProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Radio 
        size={size} 
        className="text-primary" 
        strokeWidth={2}
      />
    </div>
  );
}

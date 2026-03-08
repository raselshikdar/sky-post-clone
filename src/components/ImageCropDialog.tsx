import { useRef, useState, useCallback, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface ImageCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  /** "avatar" = circle 1:1, "banner" = 3:1 rectangle */
  cropShape: "avatar" | "banner";
  onCropComplete: (croppedFile: File) => void;
}

export default function ImageCropDialog({
  open,
  onOpenChange,
  imageSrc,
  cropShape,
  onCropComplete,
}: ImageCropDialogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });
  const [saving, setSaving] = useState(false);

  // Reset state when image changes
  useEffect(() => {
    if (open) {
      setZoom(1);
      setPos({ x: 0, y: 0 });
    }
  }, [open, imageSrc]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImgNatural({ w: img.naturalWidth, h: img.naturalHeight });
    imgRef.current = img;
  };

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setDragging(true);
      setDragStart({ x: e.clientX - pos.x, y: e.clientY - pos.y });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [pos]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      setPos({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    },
    [dragging, dragStart]
  );

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      setZoom((z) => Math.min(3, Math.max(0.5, z + delta)));
    },
    []
  );

  const handleReset = () => {
    setZoom(1);
    setPos({ x: 0, y: 0 });
  };

  const handleCrop = async () => {
    if (!containerRef.current || !imgRef.current) return;
    setSaving(true);

    try {
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();

      // The visible viewport dimensions
      const viewW = rect.width;
      const viewH = rect.height;

      // The displayed image dimensions (scaled by CSS)
      // The image fills the container width, then zoom is applied
      const imgDisplayW = viewW * zoom;
      const imgDisplayH = (imgNatural.h / imgNatural.w) * viewW * zoom;

      // Scale factor from display to natural
      const scaleX = imgNatural.w / imgDisplayW;
      const scaleY = imgNatural.h / imgDisplayH;

      // Top-left of the crop in display coords
      // Image center is at (viewW/2 + pos.x, viewH/2 + pos.y) due to translate(-50%,-50%) + our offset
      const imgLeft = (viewW - imgDisplayW) / 2 + pos.x;
      const imgTop = (viewH - imgDisplayH) / 2 + pos.y;

      // Crop rect in natural image coords
      const cropX = Math.max(0, -imgLeft * scaleX);
      const cropY = Math.max(0, -imgTop * scaleY);
      const cropW = Math.min(imgNatural.w - cropX, viewW * scaleX);
      const cropH = Math.min(imgNatural.h - cropY, viewH * scaleY);

      // Output canvas
      const outputW = cropShape === "avatar" ? 400 : 900;
      const outputH = cropShape === "avatar" ? 400 : 300;

      const canvas = document.createElement("canvas");
      canvas.width = outputW;
      canvas.height = outputH;
      const ctx = canvas.getContext("2d")!;

      if (cropShape === "avatar") {
        ctx.beginPath();
        ctx.arc(outputW / 2, outputH / 2, outputW / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
      }

      ctx.drawImage(
        imgRef.current,
        cropX,
        cropY,
        cropW,
        cropH,
        0,
        0,
        outputW,
        outputH
      );

      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), "image/png", 0.95)
      );

      const file = new File([blob], `cropped-${cropShape}.png`, { type: "image/png" });
      onCropComplete(file);
      onOpenChange(false);
    } catch (err) {
      console.error("Crop failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const aspectClass =
    cropShape === "avatar"
      ? "aspect-square w-[280px] rounded-full"
      : "aspect-[3/1] w-full max-w-[420px] rounded-xl";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <button
            onClick={() => onOpenChange(false)}
            className="text-sm font-semibold text-primary"
          >
            Cancel
          </button>
          <h2 className="text-base font-bold">
            {cropShape === "avatar" ? "Adjust Photo" : "Adjust Cover"}
          </h2>
          <button
            onClick={handleCrop}
            disabled={saving}
            className="text-sm font-semibold text-primary"
          >
            {saving ? "Saving..." : "Apply"}
          </button>
        </div>

        {/* Crop area */}
        <div className="flex items-center justify-center bg-black/90 p-6 min-h-[280px]">
          <div
            ref={containerRef}
            className={`relative overflow-hidden border-2 border-white/30 ${aspectClass}`}
            style={{ touchAction: "none", cursor: dragging ? "grabbing" : "grab" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onWheel={handleWheel}
          >
            <img
              src={imageSrc}
              alt=""
              onLoad={handleImageLoad}
              className="absolute w-full select-none pointer-events-none"
              draggable={false}
              style={{
                left: "50%",
                top: "50%",
                transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px) scale(${zoom})`,
                minWidth: "100%",
                minHeight: "100%",
                objectFit: "cover",
              }}
            />
          </div>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-border bg-background">
          <ZoomOut className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Slider
            value={[zoom]}
            min={0.5}
            max={3}
            step={0.01}
            onValueChange={([v]) => setZoom(v)}
            className="flex-1"
          />
          <ZoomIn className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <button
            onClick={handleReset}
            className="ml-1 p-1.5 rounded-full hover:bg-accent text-muted-foreground"
            title="Reset"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 pb-4 text-center">
          <p className="text-xs text-muted-foreground">
            Drag to reposition · Scroll or use slider to zoom
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

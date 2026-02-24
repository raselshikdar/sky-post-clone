import { useState } from "react";
import ImageLightbox from "@/components/ImageLightbox";

interface ImageGridProps {
  images: string[];
}

export default function ImageGrid({ images }: ImageGridProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  if (!images || images.length === 0) return null;

  const openLightbox = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const count = Math.min(images.length, 4);

  return (
    <>
      <div className="mt-2 overflow-hidden rounded-xl border border-border aspect-[16/9]">
        {count === 1 && (
          <img
            src={images[0]}
            alt=""
            onClick={(e) => openLightbox(0, e)}
            className="h-full w-full object-cover cursor-pointer"
          />
        )}

        {count === 2 && (
          <div className="grid grid-cols-2 gap-0.5 h-full">
            {images.slice(0, 2).map((img, i) => (
              <img
                key={i}
                src={img}
                alt=""
                onClick={(e) => openLightbox(i, e)}
                className="h-full w-full object-cover cursor-pointer"
              />
            ))}
          </div>
        )}

        {count === 3 && (
          <div className="grid grid-cols-2 gap-0.5 h-full">
            <img
              src={images[0]}
              alt=""
              onClick={(e) => openLightbox(0, e)}
              className="h-full w-full object-cover cursor-pointer row-span-2"
            />
            <div className="grid grid-rows-2 gap-0.5 h-full">
              <img
                src={images[1]}
                alt=""
                onClick={(e) => openLightbox(1, e)}
                className="h-full w-full object-cover cursor-pointer"
              />
              <img
                src={images[2]}
                alt=""
                onClick={(e) => openLightbox(2, e)}
                className="h-full w-full object-cover cursor-pointer"
              />
            </div>
          </div>
        )}

        {count === 4 && (
          <div className="grid grid-cols-2 grid-rows-2 gap-0.5 h-full">
            {images.slice(0, 4).map((img, i) => (
              <img
                key={i}
                src={img}
                alt=""
                onClick={(e) => openLightbox(i, e)}
                className="h-full w-full object-cover cursor-pointer"
              />
            ))}
          </div>
        )}
      </div>

      <ImageLightbox
        images={images.slice(0, 4)}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
      />
    </>
  );
}

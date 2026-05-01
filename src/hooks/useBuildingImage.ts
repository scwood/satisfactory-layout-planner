import { useEffect, useState } from "react";

const imageCache = new Map<string, HTMLImageElement>();

export function useBuildingImage(src: string | undefined) {
  const [prevSrc, setPrevSrc] = useState(src);
  const [image, setImage] = useState<HTMLImageElement | undefined>(() =>
    src ? imageCache.get(src) : undefined,
  );

  if (src !== prevSrc) {
    setPrevSrc(src);
    setImage(src ? imageCache.get(src) : undefined);
  }

  useEffect(() => {
    if (!src || imageCache.has(src)) return;
    let cancelled = false;
    const img = new Image();
    img.src = src;
    img.onload = () => {
      imageCache.set(src, img);
      if (!cancelled) setImage(img);
    };
    return () => {
      cancelled = true;
    };
  }, [src]);

  return image;
}

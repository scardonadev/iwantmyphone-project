import { PhoneImage } from "@components/ui/PhoneImage";

interface GaleriaProps {
  images: string[];
  alt: string;
}

export function Galeria({ images, alt }: GaleriaProps) {
  const totalImages = images.length;

  return (
    <section
      aria-label="Galería de imágenes"
      className="border-b border-line bg-surface py-10"
    >
      <div
        tabIndex={0}
        role="group"
        className={`flex flex-wrap sm:flex-nowrap justify-center items-center gap-y-5 mx-auto max-w-7xl`}
      >
        {images.slice(0, 4).map((src, i) => (
          <figure
            key={`${src}-${i}`}
            className={`flex aspect-4/6 shrink-0 snap-center items-center justify-center p-4 sm:p-8 ${totalImages > 1 ? "w-1/2 sm:w-1/4" : "w-1/2 sm:w-1/4"}`}
          >
            <PhoneImage src={src || undefined} alt={alt} priority={i === 0} />
          </figure>
        ))}
      </div>
    </section>
  );
}

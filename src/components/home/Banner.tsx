import Image from "next/image";

export function Banner() {
  return (
    <section aria-label="Hero" className="bg-[#f6f6f8]">
      <div className="mx-auto max-w-7xl">
        {/** set imagen for desktop and mobile */}
        <Image
          src="/assets/hero-desktop.png"
          alt="Banner"
          width={1920}
          height={500}
          className="w-full h-auto hidden sm:block"
        />
        <Image
          src="/assets/hero-mobile.png"
          alt="Banner"
          width={768}
          height={500}
          className="w-full h-auto sm:hidden"
        />
      </div>
    </section>
  );
}

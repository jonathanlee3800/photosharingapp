/**
 * Shows a whole photo inside a fixed-shape frame, with a blurred copy filling any gaps,
 * so nothing is cut off. Place it inside a positioned parent (relative or absolute).
 */
export default function PhotoFrame({ src, alt = '' }: { src: string; alt?: string }) {
  return (
    <span className="absolute inset-0 overflow-hidden bg-[#1C2820]/10">
      <img
        src={src}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-70"
      />
      <img src={src} alt={alt} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-contain" />
    </span>
  );
}

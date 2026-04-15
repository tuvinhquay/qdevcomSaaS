type AppVideoBackgroundProps = {
  src?: string;
};

export default function AppVideoBackground({
  src = "/assets/videos/bieutuong1.mp4",
}: AppVideoBackgroundProps) {
  return (
    <>
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        className="pointer-events-none fixed inset-0 h-full w-full object-cover"
        src={src}
      />
      <div className="pointer-events-none fixed inset-0 bg-slate-950/62" />
    </>
  );
}

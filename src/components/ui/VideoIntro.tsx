type VideoIntroProps = {
  src: string
}

export default function VideoIntro({ src }: VideoIntroProps) {
  return (
    <video
      className="w-full rounded-xl shadow-lg ring-1 ring-slate-800"
      src={src}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      controls={false}
    />
  )
}

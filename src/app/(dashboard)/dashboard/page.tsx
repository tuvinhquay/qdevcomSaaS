import VideoIntro from '@/components/ui/VideoIntro'

export default function DashboardPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard Overview</h1>
        <p className="mt-1 text-sm text-slate-400">
          Welcome back. Here is what&apos;s happening today.
        </p>
      </div>

      <VideoIntro src="/assets/videos/bieutuong2.mp4" />
    </div>
  )
}

import IntroSection from "@/components/IntroSection";
import { introContent } from "@/assets/introContent/content";

export default function IntroPage() {
  return (
    <div className="-m-4 sm:-m-6 lg:-m-8">
      <IntroSection content={introContent} />
    </div>
  );
}

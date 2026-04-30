import GuideSection from "@/components/GuideSection";
import { guideSteps } from "@/assets/introContent/content";

export default function GuidePage() {
  return (
    <div className="-m-4 sm:-m-6 lg:-m-8">
      <GuideSection steps={guideSteps} />
    </div>
  );
}

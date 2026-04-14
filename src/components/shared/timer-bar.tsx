import { Progress } from "@/components/ui/progress";

export function TimerBar({ value }: { value: number }) {
  return <Progress value={value} />;
}

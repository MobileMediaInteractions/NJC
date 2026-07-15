import { Playground } from "./playground";
import { defaultSource } from "@/lib/default-source";

export default function Page() {
  return <Playground initialSource={defaultSource} />;
}

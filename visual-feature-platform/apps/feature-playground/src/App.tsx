import { useState } from "react";
import { LiveDemo } from "./LiveDemo";
import { PurchaseDemo } from "./PurchaseDemo";

export function App() {
  const [demo, setDemo] = useState<"purchase" | "live">("purchase");
  return <main><header><div><p className="eyebrow">VISUAL FEATURE PLATFORM</p><h1>Standalone feature playground</h1></div><nav aria-label="Demonstrations"><button className={demo === "purchase" ? "active" : ""} onClick={() => setDemo("purchase")}>Purchase confirmation</button><button className={demo === "live" ? "active" : ""} onClick={() => setDemo("live")}>Live information</button></nav></header>{demo === "purchase" ? <PurchaseDemo /> : <LiveDemo />}</main>;
}

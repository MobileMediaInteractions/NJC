"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Download, Share, WifiOff } from "lucide-react";
import { NativeAppHandoff } from "@/components/pwa/native-app-handoff";
import { Button } from "@/components/ui/button";
import type { SiteConfiguration } from "@/lib/site-settings";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type InstallPromptEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type PwaContextValue = {
  canInstall: boolean;
  installed: boolean;
  requestInstall(): Promise<void>;
};

const PwaContext = createContext<PwaContextValue>({
  canInstall: false,
  installed: false,
  requestInstall: async () => undefined,
});

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isPublicHost() {
  const hostname = window.location.hostname.toLowerCase();
  return ![
    "studio.",
    "api.",
    "plus.",
    "distribution.",
    "int.",
  ].some((prefix) => hostname.startsWith(prefix));
}

export function PublicPwaShell({
  children,
  nativeApps,
}: {
  children: React.ReactNode;
  nativeApps: SiteConfiguration["nativeApps"];
}) {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (!isPublicHost()) return;

    if (process.env.NODE_ENV !== "production") {
      if ("serviceWorker" in window.navigator) {
        void window.navigator.serviceWorker
          .getRegistrations()
          .then((registrations) =>
            Promise.all(registrations.map((registration) => registration.unregister())),
          );
      }
      if ("caches" in window) {
        void window.caches
          .keys()
          .then((keys) =>
            Promise.all(
              keys
                .filter((key) => key.startsWith("njc-pwa-"))
                .map((key) => window.caches.delete(key)),
            ),
          );
      }
      return;
    }

    const displayMode = window.matchMedia("(display-mode: standalone)");
    const updateDisplayMode = () => setInstalled(isStandalone());
    const updateConnection = () => setOnline(window.navigator.onLine);
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const finishInstall = () => {
      setInstalled(true);
      setPromptEvent(null);
    };

    const initialStateTimer = window.setTimeout(() => {
      setIos(isIos());
      updateDisplayMode();
      updateConnection();
    }, 0);
    displayMode.addEventListener("change", updateDisplayMode);
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", finishInstall);

    if ("serviceWorker" in window.navigator) {
      void window.navigator.serviceWorker
        .register("/njc-push-sw.js", { scope: "/" })
        .then((registration) => registration.update())
        .catch((error) => {
          console.warn("Courier offline service could not start", error);
        });
    }

    return () => {
      window.clearTimeout(initialStateTimer);
      displayMode.removeEventListener("change", updateDisplayMode);
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", finishInstall);
    };
  }, []);

  const requestInstall = useCallback(async () => {
    if (promptEvent) {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setPromptEvent(null);
      return;
    }
    if (ios && !installed) setShowIosHelp(true);
  }, [installed, ios, promptEvent]);

  const value = useMemo(
    () => ({
      canInstall: !installed && (Boolean(promptEvent) || ios),
      installed,
      requestInstall,
    }),
    [installed, ios, promptEvent, requestInstall],
  );

  return (
    <PwaContext.Provider value={value}>
      <div className="public-site-shell flex min-h-svh flex-1 flex-col">
        {children}
      </div>

      {!online ? (
        <div
          className="pwa-connection-status fixed inset-x-3 z-[120] mx-auto flex max-w-sm items-center justify-center gap-2 rounded-full bg-brand-navy px-4 py-2 text-sm font-bold text-white shadow-xl"
          role="status"
        >
          <WifiOff className="size-4" /> Offline — showing saved coverage
        </div>
      ) : null}

      <NativeAppHandoff configuration={nativeApps} />

      <Dialog open={showIosHelp} onOpenChange={setShowIosHelp}>
        <DialogContent className="bottom-[max(1rem,env(safe-area-inset-bottom))] top-auto translate-y-0 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2">
          <DialogHeader>
            <DialogTitle>Install NJ Courier</DialogTitle>
            <DialogDescription>
              Add the Courier to your Home Screen for a full-screen app,
              faster return visits and saved coverage when your connection drops.
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary font-bold">1</span>
              <span className="pt-1">Tap the <strong>Share</strong> button in Safari.</span>
            </li>
            <li className="flex gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary font-bold">2</span>
              <span className="pt-1">Choose <strong>Add to Home Screen</strong>, then confirm.</span>
            </li>
          </ol>
          <div className="flex items-center gap-2 rounded-lg bg-secondary p-3 text-sm font-semibold">
            <Share className="size-5 text-brand-blue" /> Safari’s Share menu contains the install action.
          </div>
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </PwaContext.Provider>
  );
}

export function PwaInstallButton() {
  const { canInstall, requestInstall } = useContext(PwaContext);
  if (!canInstall) return null;

  return (
    <Button
      type="button"
      variant="outline"
      className="h-11 w-full justify-start gap-3 rounded-xl"
      onClick={() => void requestInstall()}
    >
      <Download className="size-4" /> Install NJ Courier
    </Button>
  );
}

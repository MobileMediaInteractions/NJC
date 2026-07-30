import webPush from "web-push";

const keys = webPush.generateVAPIDKeys();

process.stdout.write(
  [
    "Create these values in the web deployment's encrypted environment:",
    `NEXT_PUBLIC_WEB_PUSH_VAPID_KEY=${keys.publicKey}`,
    `WEB_PUSH_VAPID_PRIVATE_KEY=${keys.privateKey}`,
    "WEB_PUSH_CONTACT=mailto:REPLACE_WITH_MONITORED_ADDRESS",
    "",
    "Do not commit the private key. Replacing this pair requires readers to subscribe again.",
    "",
  ].join("\n"),
);

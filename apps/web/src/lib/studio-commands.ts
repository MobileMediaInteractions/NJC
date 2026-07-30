export const studioCommandGroups = [
  {
    title: "Navigation",
    description: "Move through Studio without hunting through menus.",
    commands: [
      {
        keys: ["⌘", "K"],
        windowsKeys: ["Ctrl", "K"],
        label: "Open the Studio command center",
        detail:
          "Search every workspace your account can access and launch common creation actions.",
      },
      {
        keys: ["Esc"],
        label: "Close the active command or dialog",
        detail: "Returns focus to the workspace without changing data.",
      },
      {
        keys: ["Enter"],
        label: "Open the selected command",
        detail: "Navigates to the highlighted destination or creation flow.",
      },
    ],
  },
  {
    title: "Editorial workflow",
    description: "What the primary story actions do.",
    commands: [
      {
        label: "Save draft",
        detail:
          "Stores private working copy. It cannot publish or activate a schedule.",
      },
      {
        label: "Submit for review",
        detail:
          "Moves a completed draft to the publisher queue. The owner cannot bypass publisher permissions.",
      },
      {
        label: "Schedule",
        detail:
          "A publisher approves a future release time. Draft and review timestamps never auto-publish.",
      },
      {
        label: "Publish as active",
        detail:
          "Publishes immediately and keeps the revision lane open. Later edits remain private until independently approved.",
      },
      {
        label: "Mark story final",
        detail:
          "Permanently closes editing while leaving the story public. Exact typed confirmation is required.",
      },
    ],
  },
  {
    title: "Verification language",
    description: "Why some actions require typed phrases.",
    commands: [
      {
        keys: ["APPROVE UPDATE"],
        label: "Approve a live-story revision",
        detail:
          "Applies the proposed comparison to the public story. The submitter cannot approve their own change.",
      },
      {
        keys: ["REJECT UPDATE"],
        label: "Reject a live-story revision",
        detail:
          "Keeps the live story unchanged and preserves the rejected proposal in edit history.",
      },
      {
        keys: ["CLOSE STORY"],
        label: "End active-story editing",
        detail:
          "Makes the published story final. This protects against an accidental one-click lock.",
      },
      {
        label: "Finance confirmations",
        detail:
          "Ledger posts, reversals, provider synchronization and period closes use distinct phrases because they create audit evidence.",
      },
    ],
  },
] as const;

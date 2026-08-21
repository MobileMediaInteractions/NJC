import type { Metadata } from "next";
import { SavedStoriesLibrary } from "@/components/saved-stories-library";

export const metadata: Metadata = {
  title: "Saved Stories",
  description: "Stories saved in this browser from The New Jersey Courier.",
  robots: { index: false, follow: true },
};

export default function SavedStoriesPage() {
  return (
    <section className="v2-saved-page container-news">
      <header><p>Your Courier</p><h1>Saved Stories</h1><span>Bookmarks stay private in this browser until account synchronization is introduced.</span></header>
      <SavedStoriesLibrary />
    </section>
  );
}

declare module "page-flip" {
  export class PageFlip {
    constructor(element: HTMLElement, settings: Record<string, unknown>);
    loadFromImages(images: string[]): void;
    loadFromHTML(items: NodeListOf<HTMLElement> | HTMLElement[]): void;
    turnToPrevPage(): void;
    turnToNextPage(): void;
    getCurrentPageIndex(): number;
    getPageCount(): number;
    on(event: string, callback: (event: { data?: number }) => void): this;
    destroy(): void;
  }
}

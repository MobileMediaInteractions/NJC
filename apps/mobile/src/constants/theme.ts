export const lightColors = {
  navy: "#072F4D",
  blue: "#0A4B78",
  sky: "#DDECF4",
  yellow: "#F5B335",
  red: "#D82C3B",
  ink: "#15212A",
  muted: "#5C6973",
  line: "#D8E0E5",
  surface: "#FFFFFF",
  background: "#F5F7F8",
  brandNavy: "#072F4D",
  onBrand: "#FFFFFF",
  onPrimary: "#FFFFFF",
} as const;

export type AppColors = { [Key in keyof typeof lightColors]: string };

export const darkColors: AppColors = {
  navy: "#E4EFF5",
  blue: "#76BDE6",
  sky: "#18384D",
  yellow: "#F5B335",
  red: "#FF7180",
  ink: "#F3F7F9",
  muted: "#AABBC6",
  line: "#355166",
  surface: "#122B3D",
  background: "#081B29",
  brandNavy: "#072F4D",
  onBrand: "#FFFFFF",
  onPrimary: "#061A28",
};

export const Colors = lightColors;
export const Spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

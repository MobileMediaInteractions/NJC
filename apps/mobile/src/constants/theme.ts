export const lightColors = {
  navy: "#173E32",
  blue: "#2F6654",
  sky: "#E8EEE9",
  yellow: "#C49545",
  red: "#A5382F",
  ink: "#171917",
  muted: "#646A65",
  line: "#D6D1C7",
  surface: "#FFFDF8",
  background: "#F8F5EE",
  brandNavy: "#173E32",
  onBrand: "#F6F1E7",
  onPrimary: "#FFFFFF",
} as const;

export type AppColors = { [Key in keyof typeof lightColors]: string };

export const darkColors: AppColors = {
  navy: "#F6F1E7",
  blue: "#9CC5AD",
  sky: "#26382D",
  yellow: "#D5AC65",
  red: "#E07C72",
  ink: "#F6F1E7",
  muted: "#B6BDB7",
  line: "#3B4B40",
  surface: "#172019",
  background: "#111713",
  brandNavy: "#173E32",
  onBrand: "#F6F1E7",
  onPrimary: "#111713",
};

export const Colors = lightColors;
export const Spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

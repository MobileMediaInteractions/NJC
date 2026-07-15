export const lightColors = {
  background: "#F8F5EE",
  surface: "#FFFDF8",
  ink: "#171917",
  muted: "#646A65",
  line: "#D6D1C7",
  brand: "#173E32",
  brandSoft: "#E8EEE9",
  accent: "#C49545",
  danger: "#A5382F",
  onBrand: "#F6F1E7",
};
export type AppColors = { [Key in keyof typeof lightColors]: string };
export const darkColors: AppColors = {
  background: "#111713",
  surface: "#172019",
  ink: "#F6F1E7",
  muted: "#B6BDB7",
  line: "#3B4B40",
  brand: "#173E32",
  brandSoft: "#26382D",
  accent: "#D5AC65",
  danger: "#E07C72",
  onBrand: "#F6F1E7",
};

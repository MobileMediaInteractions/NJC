import type { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const host = process.env.EXPO_PUBLIC_EMPLOYEE_LINK_HOST?.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return {
    ...config,
    name: "Employee App",
    slug: "new-jersey-courier-employee",
    version: "1.0.0",
    orientation: "portrait",
    scheme: "njcourier-employee",
    userInterfaceStyle: "automatic",
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.mobilemediainteractions.thenews.employee",
      ...(host ? { associatedDomains: [`applinks:${host}`] } : {}),
    },
    android: {
      package: "com.mobilemediainteractions.thenews.employee",
      adaptiveIcon: { backgroundColor: "#173E32" },
      ...(host
        ? {
            intentFilters: [{
              action: "VIEW",
              autoVerify: true,
              data: [{ scheme: "https", host, pathPrefix: "/employee-link" }],
              category: ["BROWSABLE", "DEFAULT"],
            }],
          }
        : {}),
    },
    plugins: [
      "expo-router",
      ["expo-splash-screen", { backgroundColor: "#173E32" }],
      ["expo-notifications", { color: "#C49545", defaultChannel: "employee-updates" }],
      "expo-secure-store",
      "expo-sqlite",
    ],
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_EMPLOYEE_API_URL ?? process.env.EXPO_PUBLIC_API_URL,
      employeeLinkHost: host ?? null,
      eas: { projectId: process.env.EXPO_PUBLIC_EMPLOYEE_EAS_PROJECT_ID ?? "REPLACE_WITH_EMPLOYEE_EAS_PROJECT_ID" },
    },
    experiments: { typedRoutes: true, reactCompiler: true },
  };
};

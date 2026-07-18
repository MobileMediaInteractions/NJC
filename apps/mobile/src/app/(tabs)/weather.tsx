import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { WeatherSnapshot } from "@harborline/contracts";
import { BrandHeader } from "@/components/brand-header";
import { EmptyState, LoadingState } from "@/components/states";
import { type AppColors } from "@/constants/theme";
import { useAppTheme } from "@/providers/theme-provider";
import { getWeather } from "@/lib/api";
export default function WeatherScreen() {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setWeather(await getWeather());
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "The local forecast could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  return (
    <View style={styles.screen}>
      <BrandHeader eyebrow="NJ COURIER WEATHER" />
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <LoadingState />
        ) : error && !weather ? (
          <EmptyState
            title="Forecast unavailable"
            body={error}
            action="Try again"
            onPress={() => void load()}
          />
        ) : !weather ? (
          <EmptyState
            title="No forecast available"
            body="The latest local weather report has not been published by the service."
            action="Refresh"
            onPress={() => void load()}
          />
        ) : (
          <>
            {error ? (
              <View style={styles.notice}>
                <Text style={styles.noticeText}>
                  Could not refresh. Showing the forecast saved on this device.
                </Text>
              </View>
            ) : null}
            <View style={styles.hero}>
              <Text style={styles.location}>
                {weather.location.toUpperCase()}
              </Text>
              <Text style={styles.temp}>{weather.temperature}°</Text>
              <Text style={styles.condition}>
                {weather.condition} · Feels like {weather.feelsLike}°
              </Text>
              <Text style={styles.range}>
                High {weather.high}° / Low {weather.low}°
              </Text>
            </View>
            {weather.alert ? (
              <View style={styles.alert}>
                <Text style={styles.alertTitle}>WEATHER ALERT</Text>
                <Text style={styles.alertBody}>{weather.alert}</Text>
              </View>
            ) : null}
            <Text style={styles.heading}>Hourly outlook</Text>
            {weather.hourly.map((hour) => (
              <View key={hour.time} style={styles.hour}>
                <Text style={styles.hourTime}>{hour.time}</Text>
                <Text style={styles.hourCondition}>{hour.condition}</Text>
                <Text style={styles.hourTemp}>{hour.temperature}°</Text>
              </View>
            ))}
            <View style={styles.details}>
              <Text style={styles.detail}>
                Wind{`\n`}
                <Text style={styles.detailValue}>{weather.wind}</Text>
              </Text>
              <Text style={styles.detail}>
                Humidity{`\n`}
                <Text style={styles.detailValue}>{weather.humidity}%</Text>
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { paddingBottom: 28 },
    notice: { backgroundColor: colors.sky, padding: 12 },
    noticeText: { color: colors.navy, textAlign: "center", fontWeight: "700" },
    hero: { backgroundColor: colors.brandNavy, padding: 24 },
    location: {
      color: colors.yellow,
      fontWeight: "900",
      letterSpacing: 1.5,
      fontSize: 11,
    },
    temp: { color: "#fff", fontSize: 76, lineHeight: 82, fontWeight: "300" },
    condition: { color: "#fff", fontSize: 18, fontWeight: "700" },
    range: { color: "#ffffffb3", marginTop: 8 },
    alert: {
      margin: 16,
      padding: 16,
      backgroundColor: "#fff3d6",
      borderLeftWidth: 5,
      borderLeftColor: colors.yellow,
    },
    alertTitle: {
      color: colors.brandNavy,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1.2,
    },
    alertBody: { color: colors.brandNavy, marginTop: 5, lineHeight: 20 },
    heading: {
      marginHorizontal: 16,
      marginTop: 8,
      marginBottom: 8,
      fontSize: 22,
      fontWeight: "900",
      color: colors.navy,
    },
    hour: {
      marginHorizontal: 16,
      paddingVertical: 14,
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
    },
    hourTime: { width: 60, color: colors.ink, fontWeight: "800" },
    hourCondition: { flex: 1, color: colors.muted },
    hourTemp: { color: colors.navy, fontSize: 19, fontWeight: "900" },
    details: { margin: 16, flexDirection: "row", gap: 12 },
    detail: {
      flex: 1,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      padding: 16,
      color: colors.muted,
      lineHeight: 24,
    },
    detailValue: { color: colors.ink, fontSize: 18, fontWeight: "800" },
  });

#include "platform_runtime.h"

#include <cmath>
#include <cstring>
#include <new>
#include <string>
#include <unordered_map>
#include <vector>

namespace {
constexpr uint8_t kMagic[8] = {0x50, 0x4c, 0x41, 0x54, 0x41, 0x4e, 0x49, 0x00};
constexpr size_t kHeaderSize = 48;
constexpr size_t kMaximumPackageBytes = 16u * 1024u * 1024u;
uint16_t little_u16(const uint8_t *bytes) { return static_cast<uint16_t>(bytes[0]) | static_cast<uint16_t>(bytes[1] << 8); }
uint32_t little_u32(const uint8_t *bytes) { return static_cast<uint32_t>(bytes[0]) | (static_cast<uint32_t>(bytes[1]) << 8) | (static_cast<uint32_t>(bytes[2]) << 16) | (static_cast<uint32_t>(bytes[3]) << 24); }
}

struct platform_runtime {
  platform_runtime_config_t config{};
  std::vector<uint8_t> package;
  std::string scene;
  std::string timeline;
  std::unordered_map<std::string, double> number_inputs;
  std::unordered_map<std::string, std::string> string_inputs;
  double time_ms = 0;
  double speed = 1;
  bool playing = false;
  bool suspended = false;
  bool reduced_motion = false;
  uint16_t container_version = 0;
};

uint32_t platform_runtime_abi_version(void) { return PLATFORM_RUNTIME_ABI_VERSION; }

platform_result_t platform_runtime_create(const platform_runtime_config_t *config, platform_runtime_t **out_runtime) {
  if (!config || !out_runtime || config->struct_size < sizeof(platform_runtime_config_t) || config->abi_version != PLATFORM_RUNTIME_ABI_VERSION) return PLATFORM_ERROR_INVALID_ARGUMENT;
  auto *runtime = new (std::nothrow) platform_runtime();
  if (!runtime) return PLATFORM_ERROR_INVALID_STATE;
  runtime->config = *config;
  *out_runtime = runtime;
  return PLATFORM_OK;
}

void platform_runtime_destroy(platform_runtime_t *runtime) { delete runtime; }

platform_result_t platform_runtime_load_package(platform_runtime_t *runtime, const uint8_t *bytes, size_t length) {
  if (!runtime || !bytes) return PLATFORM_ERROR_INVALID_ARGUMENT;
  if (length < kHeaderSize || length > kMaximumPackageBytes || std::memcmp(bytes, kMagic, sizeof(kMagic)) != 0) return PLATFORM_ERROR_INVALID_PACKAGE;
  const uint16_t version = little_u16(bytes + 8);
  if (version != 1) return PLATFORM_ERROR_UNSUPPORTED_VERSION;
  if (little_u32(bytes + 12) != length - kHeaderSize) return PLATFORM_ERROR_INVALID_PACKAGE;
  runtime->package.assign(bytes, bytes + length);
  runtime->container_version = version;
  runtime->scene.clear(); runtime->timeline.clear(); runtime->time_ms = 0; runtime->playing = false;
  return PLATFORM_OK;
}

platform_result_t platform_runtime_select_scene(platform_runtime_t *runtime, const char *scene_name) {
  if (!runtime || !scene_name || runtime->package.empty()) return PLATFORM_ERROR_INVALID_STATE;
  runtime->scene = scene_name; return PLATFORM_OK;
}
platform_result_t platform_runtime_play(platform_runtime_t *runtime, const char *timeline_name) {
  if (!runtime || !timeline_name || runtime->scene.empty() || runtime->suspended) return PLATFORM_ERROR_INVALID_STATE;
  runtime->timeline = timeline_name; runtime->playing = true; return PLATFORM_OK;
}
platform_result_t platform_runtime_pause(platform_runtime_t *runtime) { if (!runtime) return PLATFORM_ERROR_INVALID_ARGUMENT; runtime->playing = false; return PLATFORM_OK; }
platform_result_t platform_runtime_seek(platform_runtime_t *runtime, double time_ms) { if (!runtime || !std::isfinite(time_ms) || time_ms < 0 || runtime->timeline.empty()) return PLATFORM_ERROR_INVALID_ARGUMENT; runtime->time_ms = time_ms; return PLATFORM_OK; }
platform_result_t platform_runtime_set_speed(platform_runtime_t *runtime, double speed) { if (!runtime || !std::isfinite(speed) || speed <= 0 || speed > 16) return PLATFORM_ERROR_INVALID_ARGUMENT; runtime->speed = speed; return PLATFORM_OK; }
platform_result_t platform_runtime_set_reduced_motion(platform_runtime_t *runtime, uint8_t enabled) { if (!runtime) return PLATFORM_ERROR_INVALID_ARGUMENT; runtime->reduced_motion = enabled != 0; return PLATFORM_OK; }
platform_result_t platform_runtime_set_number_input(platform_runtime_t *runtime, const char *name, double value) { if (!runtime || !name || !std::isfinite(value)) return PLATFORM_ERROR_INVALID_ARGUMENT; runtime->number_inputs[name] = value; return PLATFORM_OK; }
platform_result_t platform_runtime_set_string_input(platform_runtime_t *runtime, const char *name, const char *value) { if (!runtime || !name || !value) return PLATFORM_ERROR_INVALID_ARGUMENT; runtime->string_inputs[name] = value; return PLATFORM_OK; }
platform_result_t platform_runtime_send_event(platform_runtime_t *runtime, const char *machine, const char *event_name) {
  if (!runtime || !machine || !event_name || runtime->scene.empty()) return PLATFORM_ERROR_INVALID_ARGUMENT;
  if (runtime->config.event_callback) runtime->config.event_callback(event_name, runtime->config.event_context);
  return PLATFORM_OK;
}
platform_result_t platform_runtime_forward_lifecycle(platform_runtime_t *runtime, uint8_t is_foreground) { if (!runtime) return PLATFORM_ERROR_INVALID_ARGUMENT; runtime->suspended = is_foreground == 0; if (runtime->suspended) runtime->playing = false; return PLATFORM_OK; }
platform_result_t platform_runtime_get_diagnostics(const platform_runtime_t *runtime, platform_diagnostics_t *out) {
  if (!runtime || !out || out->struct_size < sizeof(platform_diagnostics_t)) return PLATFORM_ERROR_INVALID_ARGUMENT;
  out->abi_version = PLATFORM_RUNTIME_ABI_VERSION; out->container_version = runtime->container_version; out->package_bytes = runtime->package.size(); out->playback_time_ms = runtime->time_ms; out->playback_speed = runtime->speed; out->is_playing = runtime->playing; out->is_suspended = runtime->suspended; out->reduced_motion = runtime->reduced_motion; return PLATFORM_OK;
}
const char *platform_result_message(platform_result_t result) {
  switch (result) { case PLATFORM_OK: return "ok"; case PLATFORM_ERROR_INVALID_ARGUMENT: return "invalid argument"; case PLATFORM_ERROR_INVALID_PACKAGE: return "invalid package"; case PLATFORM_ERROR_UNSUPPORTED_VERSION: return "unsupported version"; case PLATFORM_ERROR_INVALID_STATE: return "invalid state"; case PLATFORM_ERROR_BUFFER_TOO_SMALL: return "buffer too small"; }
  return "unknown error";
}

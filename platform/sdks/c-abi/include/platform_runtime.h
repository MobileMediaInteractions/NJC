#ifndef PLATFORM_RUNTIME_H
#define PLATFORM_RUNTIME_H

#include <stddef.h>
#include <stdint.h>

#if defined(_WIN32)
#define PLATFORM_API __declspec(dllexport)
#else
#define PLATFORM_API __attribute__((visibility("default")))
#endif

#ifdef __cplusplus
extern "C" {
#endif

#define PLATFORM_RUNTIME_ABI_VERSION 1u

typedef struct platform_runtime platform_runtime_t;
typedef enum platform_result {
  PLATFORM_OK = 0,
  PLATFORM_ERROR_INVALID_ARGUMENT = 1,
  PLATFORM_ERROR_INVALID_PACKAGE = 2,
  PLATFORM_ERROR_UNSUPPORTED_VERSION = 3,
  PLATFORM_ERROR_INVALID_STATE = 4,
  PLATFORM_ERROR_BUFFER_TOO_SMALL = 5
} platform_result_t;

typedef void (*platform_event_callback_t)(const char *event_name, void *context);

typedef struct platform_runtime_config {
  uint32_t struct_size;
  uint32_t abi_version;
  const char *license_endpoint;
  const char *application_id;
  const char *environment;
  platform_event_callback_t event_callback;
  void *event_context;
} platform_runtime_config_t;

typedef struct platform_diagnostics {
  uint32_t struct_size;
  uint32_t abi_version;
  uint32_t container_version;
  uint64_t package_bytes;
  double playback_time_ms;
  double playback_speed;
  uint8_t is_playing;
  uint8_t is_suspended;
  uint8_t reduced_motion;
} platform_diagnostics_t;

PLATFORM_API uint32_t platform_runtime_abi_version(void);
PLATFORM_API platform_result_t platform_runtime_create(const platform_runtime_config_t *config, platform_runtime_t **out_runtime);
PLATFORM_API void platform_runtime_destroy(platform_runtime_t *runtime);
PLATFORM_API platform_result_t platform_runtime_load_package(platform_runtime_t *runtime, const uint8_t *bytes, size_t length);
PLATFORM_API platform_result_t platform_runtime_select_scene(platform_runtime_t *runtime, const char *scene_name);
PLATFORM_API platform_result_t platform_runtime_play(platform_runtime_t *runtime, const char *timeline_name);
PLATFORM_API platform_result_t platform_runtime_pause(platform_runtime_t *runtime);
PLATFORM_API platform_result_t platform_runtime_seek(platform_runtime_t *runtime, double time_ms);
PLATFORM_API platform_result_t platform_runtime_set_speed(platform_runtime_t *runtime, double speed);
PLATFORM_API platform_result_t platform_runtime_set_reduced_motion(platform_runtime_t *runtime, uint8_t enabled);
PLATFORM_API platform_result_t platform_runtime_set_number_input(platform_runtime_t *runtime, const char *name, double value);
PLATFORM_API platform_result_t platform_runtime_set_string_input(platform_runtime_t *runtime, const char *name, const char *value);
PLATFORM_API platform_result_t platform_runtime_send_event(platform_runtime_t *runtime, const char *machine, const char *event_name);
PLATFORM_API platform_result_t platform_runtime_forward_lifecycle(platform_runtime_t *runtime, uint8_t is_foreground);
PLATFORM_API platform_result_t platform_runtime_get_diagnostics(const platform_runtime_t *runtime, platform_diagnostics_t *out_diagnostics);
PLATFORM_API const char *platform_result_message(platform_result_t result);

#ifdef __cplusplus
}
#endif
#endif

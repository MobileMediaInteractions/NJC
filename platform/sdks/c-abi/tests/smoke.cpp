#include "platform_runtime.h"
#include <cassert>
#include <cstring>

int main() {
  platform_runtime_config_t config{}; config.struct_size = sizeof(config); config.abi_version = PLATFORM_RUNTIME_ABI_VERSION;
  platform_runtime_t *runtime = nullptr; assert(platform_runtime_create(&config, &runtime) == PLATFORM_OK);
  uint8_t package[49] = {0x50, 0x4c, 0x41, 0x54, 0x41, 0x4e, 0x49, 0x00}; package[8] = 1; package[12] = 1;
  assert(platform_runtime_load_package(runtime, package, sizeof(package)) == PLATFORM_OK);
  assert(platform_runtime_select_scene(runtime, "Welcome") == PLATFORM_OK);
  assert(platform_runtime_play(runtime, "entrance") == PLATFORM_OK);
  assert(platform_runtime_seek(runtime, 120.0) == PLATFORM_OK);
  platform_diagnostics_t diagnostics{}; diagnostics.struct_size = sizeof(diagnostics);
  assert(platform_runtime_get_diagnostics(runtime, &diagnostics) == PLATFORM_OK); assert(diagnostics.package_bytes == sizeof(package));
  platform_runtime_destroy(runtime); return 0;
}

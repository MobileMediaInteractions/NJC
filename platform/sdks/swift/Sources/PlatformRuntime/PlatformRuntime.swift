import Foundation

public enum PlatformRuntimeError: Error { case native(Int32, String) }

public final class PlatformRuntime: @unchecked Sendable {
    private var handle: OpaquePointer?
    public init(applicationID: String, environment: String, licenseEndpoint: URL?) throws {
        var configuration = platform_runtime_config_t(struct_size: UInt32(MemoryLayout<platform_runtime_config_t>.size), abi_version: PLATFORM_RUNTIME_ABI_VERSION, license_endpoint: nil, application_id: nil, environment: nil, event_callback: nil, event_context: nil)
        let result = applicationID.withCString { app in environment.withCString { env in
            configuration.application_id = app; configuration.environment = env
            return platform_runtime_create(&configuration, &handle)
        }}
        try Self.check(result)
    }
    deinit { platform_runtime_destroy(handle) }
    public func load(package: Data) throws { try package.withUnsafeBytes { try Self.check(platform_runtime_load_package(handle, $0.bindMemory(to: UInt8.self).baseAddress, $0.count)) } }
    public func select(scene: String) throws { try scene.withCString { try Self.check(platform_runtime_select_scene(handle, $0)) } }
    public func play(timeline: String) throws { try timeline.withCString { try Self.check(platform_runtime_play(handle, $0)) } }
    public func pause() throws { try Self.check(platform_runtime_pause(handle)) }
    public func seek(milliseconds: Double) throws { try Self.check(platform_runtime_seek(handle, milliseconds)) }
    public func set(speed: Double) throws { try Self.check(platform_runtime_set_speed(handle, speed)) }
    public func setReducedMotion(_ enabled: Bool) throws { try Self.check(platform_runtime_set_reduced_motion(handle, enabled ? 1 : 0)) }
    public func forward(isForeground: Bool) throws { try Self.check(platform_runtime_forward_lifecycle(handle, isForeground ? 1 : 0)) }
    private static func check(_ result: platform_result_t) throws { if result != PLATFORM_OK { throw PlatformRuntimeError.native(result.rawValue, String(cString: platform_result_message(result))) } }
}

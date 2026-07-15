package news.njcourier.platform

/** Idiomatic ownership wrapper for the stable C ABI. JNI functions are implemented by the host build. */
class PlatformRuntime private constructor(private var handle: Long) : AutoCloseable {
    companion object {
        init { System.loadLibrary("platform_runtime_jni") }
        fun create(applicationId: String, environment: String, licenseEndpoint: String?): PlatformRuntime =
            PlatformRuntime(nativeCreate(applicationId, environment, licenseEndpoint))
        @JvmStatic private external fun nativeCreate(applicationId: String, environment: String, licenseEndpoint: String?): Long
    }
    fun loadPackage(bytes: ByteArray) = check(nativeLoadPackage(handle, bytes))
    fun selectScene(name: String) = check(nativeSelectScene(handle, name))
    fun play(timeline: String) = check(nativePlay(handle, timeline))
    fun pause() = check(nativePause(handle))
    fun seek(milliseconds: Double) = check(nativeSeek(handle, milliseconds))
    fun setSpeed(speed: Double) = check(nativeSetSpeed(handle, speed))
    fun setReducedMotion(enabled: Boolean) = check(nativeSetReducedMotion(handle, enabled))
    fun send(machine: String, event: String) = check(nativeSendEvent(handle, machine, event))
    fun forwardLifecycle(foreground: Boolean) = check(nativeForwardLifecycle(handle, foreground))
    fun diagnostics(): String = nativeDiagnostics(handle)
    override fun close() { if (handle != 0L) { nativeDestroy(handle); handle = 0 } }
    private fun check(code: Int) { if (code != 0) throw PlatformRuntimeException(code, nativeResultMessage(code)) }
    private external fun nativeLoadPackage(handle: Long, bytes: ByteArray): Int
    private external fun nativeSelectScene(handle: Long, name: String): Int
    private external fun nativePlay(handle: Long, timeline: String): Int
    private external fun nativePause(handle: Long): Int
    private external fun nativeSeek(handle: Long, milliseconds: Double): Int
    private external fun nativeSetSpeed(handle: Long, speed: Double): Int
    private external fun nativeSetReducedMotion(handle: Long, enabled: Boolean): Int
    private external fun nativeSendEvent(handle: Long, machine: String, event: String): Int
    private external fun nativeForwardLifecycle(handle: Long, foreground: Boolean): Int
    private external fun nativeDiagnostics(handle: Long): String
    private external fun nativeDestroy(handle: Long)
    private external fun nativeResultMessage(code: Int): String
}
class PlatformRuntimeException(val code: Int, message: String) : RuntimeException(message)

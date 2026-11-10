# kotlinx.serialization: conserva los serializadores generados de los DTO.
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.**
-keepclassmembers @kotlinx.serialization.Serializable class com.iwantmyphone.app.** {
    *** Companion;
    kotlinx.serialization.KSerializer serializer(...);
}
-keepclasseswithmembers class com.iwantmyphone.app.** {
    kotlinx.serialization.KSerializer serializer(...);
}

# Retrofit: las interfaces de servicio se crean por reflexión.
-keep,allowobfuscation interface com.iwantmyphone.app.data.api.ApiService
-keepattributes Signature, Exceptions

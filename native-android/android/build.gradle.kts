// Kotlin va integrado en AGP 9: no se aplica org.jetbrains.kotlin.android.
// La versión de Kotlin la fijan los plugins de Compose y serialización (libs.versions.toml).
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.plugin.compose) apply false
    alias(libs.plugins.kotlinx.serialization) apply false
}

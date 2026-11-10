package com.iwantmyphone.app.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import com.iwantmyphone.app.R

/**
 * Sistema visual del Next (app/globals.css): editorial monocromo, mucho aire,
 * un único acento azul, cero sombras, cero degradados, cero radios.
 */
object Iwmp {
    val Paper = Color(0xFFFFFFFF)
    val Ink = Color(0xFF111111)
    val InkSoft = Color(0xFF4A4A4A)
    val Muted = Color(0xFF8F8F8F)
    val Line = Color(0xFFE8E8E8)
    val Surface = Color(0xFFF3F3F3)
    val Surface2 = Color(0xFFE9E9E9)
    val Accent = Color(0xFF2F5BFF)
    /** Solo el corazón del logo. */
    val LogoRed = Color(0xFFA52B34)
}

/** Geist variable: un solo archivo, cada peso es un punto del eje `wght`. */
private fun geist(peso: Int) = Font(
    R.font.geist,
    weight = FontWeight(peso),
    variationSettings = FontVariation.Settings(FontVariation.weight(peso)),
)

val Geist = FontFamily(geist(300), geist(400))

private val base = TextStyle(fontFamily = Geist, fontWeight = FontWeight.Light, color = Iwmp.Ink, letterSpacing = 0.01.em)

/** `.u-label` del Next: 11 sp, versales, tracking .18em. Navegación, botones, metadatos. */
val EstiloLabel = base.copy(fontSize = 11.sp, fontWeight = FontWeight.Normal, letterSpacing = 0.18.em, lineHeight = 16.sp)

/** `.u-wordmark`: solo para la marca. */
val EstiloWordmark = base.copy(fontSize = 13.sp, fontWeight = FontWeight.Normal, letterSpacing = 0.42.em)

private val tipografia = Typography(
    displayLarge = base.copy(fontSize = 40.sp, lineHeight = 44.sp),
    displayMedium = base.copy(fontSize = 32.sp, lineHeight = 38.sp),
    headlineLarge = base.copy(fontSize = 28.sp, lineHeight = 34.sp),
    headlineMedium = base.copy(fontSize = 24.sp, lineHeight = 30.sp),
    headlineSmall = base.copy(fontSize = 20.sp, lineHeight = 26.sp),
    titleLarge = base.copy(fontSize = 18.sp, lineHeight = 24.sp),
    titleMedium = base.copy(fontSize = 16.sp, lineHeight = 22.sp),
    titleSmall = base.copy(fontSize = 14.sp, lineHeight = 20.sp),
    bodyLarge = base.copy(fontSize = 16.sp, lineHeight = 24.sp),
    bodyMedium = base.copy(fontSize = 14.sp, lineHeight = 21.sp, color = Iwmp.InkSoft),
    bodySmall = base.copy(fontSize = 12.sp, lineHeight = 18.sp, color = Iwmp.InkSoft),
    labelLarge = EstiloLabel,
    labelMedium = EstiloLabel,
    labelSmall = EstiloLabel.copy(fontSize = 10.sp),
)

private val colores = lightColorScheme(
    primary = Iwmp.Ink,
    onPrimary = Iwmp.Paper,
    secondary = Iwmp.Accent,
    onSecondary = Iwmp.Paper,
    tertiary = Iwmp.Accent,
    background = Iwmp.Paper,
    onBackground = Iwmp.Ink,
    surface = Iwmp.Paper,
    onSurface = Iwmp.Ink,
    surfaceVariant = Iwmp.Surface,
    onSurfaceVariant = Iwmp.InkSoft,
    surfaceContainer = Iwmp.Paper,
    surfaceContainerLow = Iwmp.Paper,
    surfaceContainerHigh = Iwmp.Paper,
    surfaceContainerHighest = Iwmp.Surface,
    surfaceContainerLowest = Iwmp.Paper,
    outline = Iwmp.Line,
    outlineVariant = Iwmp.Line,
    // Como en el Next: los errores van en el acento, no en rojo.
    error = Iwmp.Accent,
    onError = Iwmp.Paper,
    surfaceTint = Color.Transparent,
)

private val sinRadios = RoundedCornerShape(0)

@Composable
fun IwmpTheme(contenido: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = colores,
        typography = tipografia,
        shapes = Shapes(sinRadios, sinRadios, sinRadios, sinRadios, sinRadios),
        content = contenido,
    )
}

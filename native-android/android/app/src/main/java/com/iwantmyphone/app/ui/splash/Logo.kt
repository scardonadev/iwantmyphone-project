package com.iwantmyphone.app.ui.splash

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathMeasure
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import com.iwantmyphone.app.ui.theme.Iwmp

/**
 * El logo del Next (public/assets/logo.svg, viewBox 200 x 29.9) como trazados
 * de Compose. Las letras son los paths `.st1` del SVG, tal cual.
 */
internal object TrazosLogo {
    const val ANCHO = 200f
    const val ALTO = 29.9f

    /** Corazón ENTERO (sin mordisco), para poder dibujar el contorno y luego morderlo. */
    val corazon: Path = PathParser().parsePathString(
        "M15.6,5.9 C18.8,0.3 26.9,-0.5 30.2,4.7 C33.0,9.2 30.6,13.4 27.6,16.4 " +
            "C24.2,20.4 19.6,24.0 15.1,27.6 C11.0,24.6 6.6,21.3 3.4,17.3 " +
            "C0.2,13.4 -0.4,9.7 2.3,5.2 C4.9,0.8 10.9,-0.1 14.6,3.5 C15.0,4.1 15.3,5.0 15.6,5.9 Z",
    ).toPath()

    /** El mordisco: tres bocados en el lateral derecho, como el del logo. (x, y, radio) */
    val mordisco = listOf(Triple(30.4f, 6.9f, 2.4f), Triple(28.6f, 11.0f, 3.4f), Triple(29.6f, 15.1f, 2.2f))

    /** Centro horizontal del corazón (para centrarlo solo al principio del splash). */
    const val CENTRO_CORAZON = 15.6f

    private val letrasSvg = listOf(
        "M48.3,19.6l4-13c.8-.4,2-.4,2.4.6l3.5,12.6,3.1-12.6c.6-1.4,3.2-.8,2.7.9-1.7,4.4-2.2,10.3-3.9,14.6s-2.2,1.8-3.1.5l-3.5-11.9-.4-.3c0,.8-.2,1.6-.5,2.4-.7,2.4-1.7,7.5-2.7,9.5s-2.7,1.3-3.4-.4c-1.7-4.3-2.3-9.8-3.9-14.2-.7-1.9,1.9-2.6,2.6-1.2l3.1,12.5Z",
        "M102,23.2c-.2.8-2.1,1-2.3-.4.3-4.8-.5-10.2,0-15s2.1-1.9,3.3-.9l5.5,12.9,5.1-12.7c.5-1,2.8-1,3.2-.1v16.4c-.6.7-2.3.3-2.3-.2v-12.1c-.3,0-.3.4-.4.6-1.6,3.7-2.9,7.5-4.6,11.2-.3.7-1.5.8-2.1.4s-4.2-10-5-11.6-.2-.5-.5-.6v12.1Z",
        "M135.1,17.8v5.2c0,1-2.5,1.3-2.8-.2.3-4.8-.4-10.2,0-15s.5-1.4,1.7-1.5c1.7-.1,5-.1,6.6.3,5.2,1.3,5.4,8.9.7,10.7s-1.7.5-1.9.5h-4.4ZM135.1,15.5h4.2c.8,0,2.2-1.4,2.4-2.2.3-1.2.1-3-.9-3.8s-1.4-.7-1.5-.7h-4.2v6.7Z",
        "M149.5,12.9c1.8-2.9,6.9-2.9,8.2.4.7,1.7.7,7,.5,9,0,.9-.6,1.8-1.6,1.6s-1.1-.6-1.1-1.4c-.2-2.1.5-6.6-.6-8.3s-3-1.4-4.1-.4c-2,1.7-.9,6.4-1.2,8.9s-2,1.5-2.5.7,0-5.8,0-7c0-1.9,0-3.8,0-5.7s-.8-4.2,1.1-4.4,1.5.4,1.5.7v6Z",
        "M72.7,21.8l-1.3,1.3c-3.4,2.3-8.6-.4-6.7-4.6s2.9-2.1,4.4-2.3,4.4.8,3.3-2-3-1.7-4.3-.8-1,2.3-2.6,1.3.2-2.5,1-3.1c2.8-1.9,8.4-1.1,8.7,2.8s-.2,5.9,0,8.6c-1.2,1.6-2.9.4-2.5-1.4ZM72.5,18h-3.1c-.3,0-1.7.5-2,.8-1,1-.3,2.7,1,2.9,2.6.4,4.4-1.1,4-3.7Z",
        "M190,18c0,2.8,1.9,4.4,4.7,3.6s1.4-1.8,2.4-1.9c3-.3,1,2.8-.9,3.7-5,2.2-9.3-1.3-9.1-6.5.3-8.1,11-7.9,11.6-1.4,0,.4.1,2.5-.5,2.5h-8.4ZM196.3,16.2c.2-3-3.7-4.5-5.5-2.2s-1.1,2.2-.5,2.2h6Z",
        "M165.6,10.8c9-.6,8.9,14.6-.8,13.1-6.4-1-6.5-12.6.8-13.1ZM165.2,13.1c-3.4.7-3.3,9.3,1.5,8.6,3.8-.6,4-9.7-1.5-8.6Z",
        "M81.4,14c-.5.5-.8,1.5-.9,2.2-.2,1.8.4,5.5,0,7s-2.5,1-2.7-1.1-.2-7.3,0-9.7.9-2,2.2-1.4.2,1.3.5,1.9c3.4-3.9,8.2-2.4,8.6,2.8s.2,6.4-.2,7.3-1.6,1.2-2.3.5c-1-1.1.5-7.6-.9-9.5s-3.2-1.1-4.2,0Z",
        "M124.9,20.8l3-9.3c1.2-1.1,2.8-.5,2.3,1.3-1.9,3.9-2.8,9.3-4.8,13.1-.9,1.8-2.7,2.7-4.7,2.4s-1.2-1-.8-1.8,1-.3,1.5-.4c1.2-.3,1.7-1.2,1.9-2.4l-4-10.7c-.6-1.9.9-2.7,2.3-1.5,1.3,2.7,1.7,6.2,3,8.8s.1.5.4.5Z",
        "M184,12c.3.3.7.9.8,1.2.6,1.5.6,7.4.4,9.2s-2.1,1.9-2.7.7,0-5.7,0-7.2-.9-3-2.9-2.9c-4.1.2-2.6,6.7-2.8,9.4s-2.4,1.9-2.6.2c-.3-3.4.3-7.4,0-10.8.2-1.8,3.3-.9,2.6,1.1l1.5-1.5c1.7-.9,4.3-.8,5.7.6Z",
        "M94.9,10.9c3.5-.7,3.6,2.9,0,2.2.3,2.2-.4,5.5,0,7.6s2,.7,2.4,1.2.4,1.7-.1,1.9c-7.3,1.3-4.4-6.2-5-10.6-1.6.2-2.5-.3-1.7-1.9l1.7-.2c0-1.3-.4-3.9,1.8-3.3s.9,2.1,1,3.3Z",
        "M38.6,11c.9-.2,1.7,0,1.8,1-.4,3.3.5,7.6,0,10.8s-2.5,1.4-2.7-.4-.2-7.8,0-10c.2-1.3.9-1.4.9-1.4Z",
        "M37.9,8.7c-1.8-2.2,2.4-3.8,2.7-1.2s-1.8,2.2-2.7,1.2Z",
    )

    /** Letras ordenadas de izquierda a derecha: el fade-in entra en orden de lectura. */
    val letras: List<Path> = letrasSvg.map { PathParser().parsePathString(it).toPath() }.sortedBy { it.getBounds().left }
}

/**
 * Dibuja el logo en cualquier fase de la animación (todos los valores 0..1):
 *   contorno -> se traza el borde del corazón
 *   relleno  -> el corazón pasa a sólido rojo
 *   mordisco -> aparecen los bocados del lateral
 *   letras   -> fade-in escalonado de "iWantMyPhone"
 *   centrado -> 1 = corazón centrado solo; 0 = en su sitio junto a las letras
 */
internal fun DrawScope.dibujarLogo(
    contorno: Float,
    relleno: Float,
    mordisco: Float,
    letras: Float,
    centrado: Float,
    fondo: Color = Iwmp.Paper,
) {
    val escala = size.width / TrazosLogo.ANCHO
    val desplazamiento = centrado * (TrazosLogo.ANCHO / 2 - TrazosLogo.CENTRO_CORAZON) * escala
    withTransform({ translate(left = desplazamiento); scale(escala, escala, Offset.Zero) }) {
        val corazon = TrazosLogo.corazon
        if (contorno > 0f && relleno < 1f) {
            val medida = PathMeasure().apply { setPath(corazon, false) }
            val parcial = Path()
            medida.getSegment(0f, medida.length * contorno, parcial, true)
            drawPath(parcial, Iwmp.LogoRed, style = Stroke(width = 0.7f, cap = StrokeCap.Round, join = StrokeJoin.Round))
        }
        if (relleno > 0f) drawPath(corazon, Iwmp.LogoRed.copy(alpha = relleno))
        if (mordisco > 0f) {
            TrazosLogo.mordisco.forEach { (x, y, r) -> drawCircle(fondo, radius = r * mordisco, center = Offset(x, y)) }
        }
    }
    if (letras > 0f) {
        withTransform({ scale(escala, escala, Offset.Zero) }) {
            val n = TrazosLogo.letras.size
            TrazosLogo.letras.forEachIndexed { i, letra ->
                // Cada letra entra en su tramo, con solape: una ola de izquierda a derecha.
                val inicio = i / (n + 3f)
                val alfa = ((letras - inicio) / (4f / (n + 3f))).coerceIn(0f, 1f)
                if (alfa > 0f) drawPath(letra, Color(0xFF313131).copy(alpha = alfa))
            }
        }
    }
}

/** Logo estático completo (cabeceras, login). */
@Composable
fun Logo(modifier: Modifier = Modifier) {
    Canvas(modifier.aspectRatio(TrazosLogo.ANCHO / TrazosLogo.ALTO).semantics { contentDescription = "iWantMyPhone" }) {
        dibujarLogo(contorno = 1f, relleno = 1f, mordisco = 1f, letras = 1f, centrado = 0f)
    }
}

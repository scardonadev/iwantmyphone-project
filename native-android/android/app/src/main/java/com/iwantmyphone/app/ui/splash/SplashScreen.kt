package com.iwantmyphone.app.ui.splash

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearOutSlowInEasing
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import com.iwantmyphone.app.ui.theme.Iwmp
import kotlinx.coroutines.delay

/**
 * Splash (Excel, fila 3): fondo blanco; el corazón se dibuja desde el
 * contorno, se vuelve sólido rojo, aparece el mordisco en el lateral y
 * terminan de entrar las letras del logo con un fade-in.
 *
 * Unos 2,8 s en total. `onTerminado` se llama cuando acaba la animación Y
 * `listo` es true (la sesión guardada ya está leída).
 */
@Composable
fun SplashScreen(listo: Boolean, onTerminado: () -> Unit) {
    val contorno = remember { Animatable(0f) }
    val relleno = remember { Animatable(0f) }
    val mordisco = remember { Animatable(0f) }
    val letras = remember { Animatable(0f) }
    val centrado = remember { Animatable(1f) }
    val terminada = remember { Animatable(0f) }

    LaunchedEffect(Unit) {
        delay(150)
        contorno.animateTo(1f, tween(950, easing = CubicBezierEasing(0.45f, 0f, 0.2f, 1f)))
        relleno.animateTo(1f, tween(350, easing = LinearOutSlowInEasing))
        delay(120)
        mordisco.animateTo(1f, spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessMediumLow))
        delay(80)
        // Primero el corazón se va a su sitio; si las letras entraran a la vez,
        // pasarían por debajo de él mientras se desplaza.
        centrado.animateTo(0f, tween(550, easing = FastOutSlowInEasing))
        letras.animateTo(1f, tween(900, easing = LinearOutSlowInEasing))
        delay(350)
        terminada.snapTo(1f)
    }

    LaunchedEffect(listo, terminada.value) {
        if (listo && terminada.value == 1f) onTerminado()
    }

    Box(Modifier.fillMaxSize().background(Iwmp.Paper), contentAlignment = Alignment.Center) {
        Canvas(
            Modifier
                .fillMaxWidth(0.72f)
                .aspectRatio(TrazosLogo.ANCHO / TrazosLogo.ALTO)
                .semantics { contentDescription = "iWantMyPhone" },
        ) {
            dibujarLogo(contorno.value, relleno.value, mordisco.value, letras.value, centrado.value)
        }
    }
}

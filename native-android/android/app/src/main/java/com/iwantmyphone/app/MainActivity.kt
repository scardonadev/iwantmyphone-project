package com.iwantmyphone.app

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.fragment.app.FragmentActivity
import com.iwantmyphone.app.ui.IwmpRaiz
import com.iwantmyphone.app.ui.theme.IwmpTheme

/**
 * FragmentActivity (y no ComponentActivity) porque BiometricPrompt lo exige.
 * El splash del sistema es blanco y vacío: el logo lo anima Compose.
 */
class MainActivity : FragmentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val container = (application as IwmpApp).container
        setContent {
            IwmpTheme {
                IwmpRaiz(container)
            }
        }
    }
}

package com.iwantmyphone.app.ui.cuenta

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.iwantmyphone.app.AppContainer
import com.iwantmyphone.app.data.api.ConfirmarReq
import com.iwantmyphone.app.data.api.EmailReq
import com.iwantmyphone.app.data.api.llamar
import com.iwantmyphone.app.data.biometric.Huella
import com.iwantmyphone.app.ui.actividad
import com.iwantmyphone.app.ui.campos
import com.iwantmyphone.app.ui.components.Aviso
import com.iwantmyphone.app.ui.components.BarraSuperior
import com.iwantmyphone.app.ui.components.Boton
import com.iwantmyphone.app.ui.components.Campo
import com.iwantmyphone.app.ui.components.DialogoConfirmar
import com.iwantmyphone.app.ui.components.EnlaceTexto
import com.iwantmyphone.app.ui.components.EstiloBoton
import com.iwantmyphone.app.ui.components.Etiqueta
import com.iwantmyphone.app.ui.components.Filete
import com.iwantmyphone.app.ui.components.Gutter
import com.iwantmyphone.app.ui.mensaje
import com.iwantmyphone.app.ui.splash.Logo
import com.iwantmyphone.app.ui.theme.Iwmp
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

// ================================================================ Login

data class EstadoLogin(
    val email: String = "",
    val password: String = "",
    val enviando: Boolean = false,
    val error: String? = null,
    val campos: Map<String, String> = emptyMap(),
    /** Tras entrar con contraseña: ofrecer activar la huella en este teléfono. */
    val ofrecerHuella: Boolean = false,
    val listo: Boolean = false,
)

class LoginViewModel(private val c: AppContainer) : ViewModel() {
    private val _e = MutableStateFlow(EstadoLogin(email = c.sesionStore.huella.value?.email.orEmpty()))
    val estado = _e.asStateFlow()

    fun email(v: String) = _e.update { it.copy(email = v) }
    fun password(v: String) = _e.update { it.copy(password = v) }

    fun entrar() = viewModelScope.launch {
        val e = _e.value
        val campos = buildMap {
            if (e.email.isBlank()) put("email", "Correo: campo obligatorio.")
            if (e.password.isEmpty()) put("password", "Contraseña: campo obligatorio.")
        }
        if (campos.isNotEmpty()) return@launch _e.update { it.copy(campos = campos, error = null) }
        _e.update { it.copy(enviando = true, error = null, campos = emptyMap()) }
        runCatching { c.cuenta.login(e.email, e.password) }
            .onSuccess { resp ->
                // Si este teléfono no tiene la huella de este usuario, se ofrece activarla.
                val tieneHuella = c.sesionStore.huella.value?.email == resp.usuario.email && Huella.hayClaves()
                _e.update { it.copy(enviando = false, ofrecerHuella = !tieneHuella, listo = tieneHuella) }
            }
            .onFailure { err -> _e.update { it.copy(enviando = false, error = if (err.campos().isEmpty()) err.mensaje() else null, campos = err.campos()) } }
    }

    fun entrarConHuella(activity: FragmentActivity) = viewModelScope.launch {
        _e.update { it.copy(enviando = true, error = null) }
        c.cuenta.loginConHuella(activity)
            .onSuccess { _e.update { it.copy(enviando = false, listo = true) } }
            .onFailure { err -> _e.update { it.copy(enviando = false, error = err.message.takeIf { m -> m != "Cancelado" }) } }
    }

    fun activarHuella(activity: FragmentActivity) = viewModelScope.launch {
        _e.update { it.copy(ofrecerHuella = false) }
        c.cuenta.activarHuella(activity)
        _e.update { it.copy(listo = true) }
    }

    fun omitirHuella() = _e.update { it.copy(ofrecerHuella = false, listo = true) }
}

/** Login con contraseña o con huella, y enlace al registro (Excel, fila 4). */
@Composable
fun LoginScreen(container: AppContainer, onAtras: () -> Unit, onListo: () -> Unit, onRegistro: () -> Unit, onRecuperar: () -> Unit) {
    val vm: LoginViewModel = viewModel { LoginViewModel(container) }
    val e by vm.estado.collectAsState()
    val huella by container.sesionStore.huella.collectAsState()
    val activity = actividad()

    LaunchedEffect(e.listo) { if (e.listo) onListo() }

    Column(Modifier.fillMaxSize().background(Iwmp.Paper)) {
        BarraSuperior("Iniciar sesión", onAtras)
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).imePadding().padding(Gutter), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Box(Modifier.fillMaxWidth().padding(vertical = 24.dp), contentAlignment = Alignment.Center) { Logo(Modifier.width(220.dp)) }
            Campo(e.email, vm::email, "Correo", error = e.campos["email"], teclado = KeyboardType.Email)
            Campo(e.password, vm::password, "Contraseña", error = e.campos["password"], password = true)
            e.error?.let { Aviso(it) }
            Boton("Entrar", vm::entrar, Modifier.fillMaxWidth(), estilo = EstiloBoton.Solido, cargando = e.enviando)
            huella?.let { h ->
                Boton("Entrar con huella · ${h.nombre.substringBefore(' ')}", { vm.entrarConHuella(activity) }, Modifier.fillMaxWidth(), enabled = !e.enviando)
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                EnlaceTexto("¿Olvidaste tu contraseña?", onRecuperar, color = Iwmp.Muted)
                EnlaceTexto("Crear cuenta", onRegistro)
            }
            Filete()
            Text(
                "Al crear una cuenta registras también tu huella: es obligatoria para comprar con iWantMyPhone.",
                style = MaterialTheme.typography.bodySmall,
            )
        }
    }

    if (e.ofrecerHuella) {
        DialogoConfirmar(
            titulo = "Activa tu huella",
            texto = "Entra más rápido la próxima vez: registra tu huella en este teléfono.",
            confirmar = "Activar",
            onConfirmar = { vm.activarHuella(activity) },
            cancelar = "Ahora no",
            onCancelar = vm::omitirHuella,
        )
    }
}

// ================================================================ Registro

data class EstadoRegistro(
    val nombre: String = "",
    val email: String = "",
    val telefono: String = "",
    val password: String = "",
    val confirmacion: String = "",
    val publicKey: String? = null,
    val preparandoHuella: Boolean = false,
    val enviando: Boolean = false,
    val error: String? = null,
    val campos: Map<String, String> = emptyMap(),
    val listo: Boolean = false,
)

class RegistroViewModel(private val c: AppContainer) : ViewModel() {
    private val _e = MutableStateFlow(EstadoRegistro())
    val estado = _e.asStateFlow()

    fun cambiar(f: EstadoRegistro.() -> EstadoRegistro) = _e.update(f)

    fun registrarHuella(activity: FragmentActivity) = viewModelScope.launch {
        _e.update { it.copy(preparandoHuella = true, error = null) }
        c.cuenta.prepararHuella(activity)
            .onSuccess { pk -> _e.update { it.copy(preparandoHuella = false, publicKey = pk) } }
            .onFailure { err -> _e.update { it.copy(preparandoHuella = false, error = err.message) } }
    }

    fun crear() = viewModelScope.launch {
        val e = _e.value
        val campos = buildMap {
            if (e.nombre.isBlank()) put("nombre", "Nombre: campo obligatorio.")
            if (e.email.isBlank()) put("email", "Correo: campo obligatorio.")
            if (e.password.length < 8) put("password", "Contraseña: mínimo 8 caracteres.")
            if (e.password != e.confirmacion) put("confirmacion", "Las contraseñas no coinciden.")
        }
        if (campos.isNotEmpty()) return@launch _e.update { it.copy(campos = campos) }
        // Excel, fila 17: sin clave Y huella no se registra.
        val pk = e.publicKey ?: return@launch _e.update { it.copy(error = "Registra tu huella antes de crear la cuenta.") }
        _e.update { it.copy(enviando = true, error = null, campos = emptyMap()) }
        runCatching { c.cuenta.registrar(e.email, e.nombre, e.password, e.telefono, pk) }
            .onSuccess { _e.update { it.copy(enviando = false, listo = true) } }
            .onFailure { err ->
                val campos = err.campos().mapKeys { (k, _) -> if (k.startsWith("biometria")) "biometria" else k }
                _e.update { it.copy(enviando = false, campos = campos, error = if (campos.isEmpty() || "biometria" in campos) campos["biometria"] ?: err.mensaje() else null) }
            }
    }
}

/**
 * Registro (Excel, filas 4 y 17): crea un usuario "visitante" y exige
 * configurar la contraseña Y la huella; sin huella el botón no se habilita.
 */
@Composable
fun RegistroScreen(container: AppContainer, onAtras: () -> Unit, onListo: () -> Unit) {
    val vm: RegistroViewModel = viewModel { RegistroViewModel(container) }
    val e by vm.estado.collectAsState()
    val activity = actividad()
    val context = LocalContext.current
    val disponible = remember { Huella.disponibilidad(context) }

    LaunchedEffect(e.listo) { if (e.listo) onListo() }

    Column(Modifier.fillMaxSize().background(Iwmp.Paper)) {
        BarraSuperior("Crear cuenta", onAtras)
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).imePadding().padding(Gutter), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Etiqueta("1 · Tus datos", color = Iwmp.Ink)
            Campo(e.nombre, { v -> vm.cambiar { copy(nombre = v) } }, "Nombre", error = e.campos["nombre"])
            Campo(e.email, { v -> vm.cambiar { copy(email = v) } }, "Correo", error = e.campos["email"], teclado = KeyboardType.Email)
            Campo(e.telefono, { v -> vm.cambiar { copy(telefono = v) } }, "Teléfono (opcional)", error = e.campos["telefono"], teclado = KeyboardType.Phone)
            Campo(e.password, { v -> vm.cambiar { copy(password = v) } }, "Contraseña", error = e.campos["password"], password = true, placeholder = "Mínimo 8 caracteres")
            Campo(e.confirmacion, { v -> vm.cambiar { copy(confirmacion = v) } }, "Repite la contraseña", error = e.campos["confirmacion"], password = true)

            Spacer(Modifier.height(8.dp))
            Etiqueta("2 · Tu huella (obligatoria)", color = Iwmp.Ink)
            when (disponible) {
                Huella.Disponibilidad.Lista -> {
                    if (e.publicKey != null) {
                        Row(Modifier.fillMaxWidth().border(1.dp, Iwmp.Ink).padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.Check, contentDescription = null, tint = Iwmp.Ink, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(10.dp))
                            Etiqueta("Huella registrada en este teléfono", color = Iwmp.Ink)
                        }
                    } else {
                        Text("Pon el dedo en el lector cuando te lo pida el teléfono. La huella no sale de tu teléfono.", style = MaterialTheme.typography.bodySmall)
                        Boton("Registrar huella", { vm.registrarHuella(activity) }, Modifier.fillMaxWidth(), estilo = EstiloBoton.Acento, cargando = e.preparandoHuella)
                    }
                }
                Huella.Disponibilidad.SinHuellas -> {
                    Aviso("Tu teléfono no tiene ninguna huella registrada. Añade una en Ajustes y vuelve aquí.")
                    Boton("Abrir ajustes", { context.startActivity(Huella.intentRegistrarEnAjustes()) }, Modifier.fillMaxWidth())
                }
                is Huella.Disponibilidad.NoDisponible -> Aviso("${disponible.motivo} Sin huella no es posible registrarse.")
            }
            e.campos["biometria"]?.let { Aviso(it) }
            e.error?.let { Aviso(it) }
            Spacer(Modifier.height(8.dp))
            Boton("Crear cuenta", vm::crear, Modifier.fillMaxWidth(), estilo = EstiloBoton.Solido, enabled = e.publicKey != null, cargando = e.enviando)
        }
    }
}

// ================================================================ Recuperación

/**
 * Recuperación de contraseña (Excel, fila 18): la API envía un código de 6
 * dígitos por correo; con él se fija la contraseña nueva.
 */
@Composable
fun RecuperarScreen(container: AppContainer, onAtras: () -> Unit, onListo: () -> Unit) {
    var email by remember { mutableStateOf(container.sesionStore.huella.value?.email.orEmpty()) }
    var codigo by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var enviado by remember { mutableStateOf(false) }
    var cargando by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var campos by remember { mutableStateOf(emptyMap<String, String>()) }
    var exito by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val c = container

    fun ejecutar(bloque: suspend () -> Unit) = scope.launch {
        cargando = true; error = null; campos = emptyMap()
        runCatching { bloque() }.onFailure { err -> campos = err.campos(); error = if (campos.isEmpty()) err.mensaje() else null }
        cargando = false
    }

    Column(Modifier.fillMaxSize().background(Iwmp.Paper)) {
        BarraSuperior("Recuperar contraseña", onAtras)
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).imePadding().padding(Gutter), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            if (exito != null) {
                Text(exito!!, style = MaterialTheme.typography.titleMedium)
                Boton("Iniciar sesión", onListo, Modifier.fillMaxWidth(), estilo = EstiloBoton.Solido)
                return@Column
            }
            Text(
                if (!enviado) "Escribe tu correo y te enviaremos un código de 6 dígitos para crear una contraseña nueva."
                else "Revisa tu correo: el código caduca en 15 minutos y solo sirve una vez.",
                style = MaterialTheme.typography.bodyMedium,
            )
            Campo(email, { email = it }, "Correo", error = campos["email"], teclado = KeyboardType.Email, soloLectura = enviado)
            if (!enviado) {
                Boton("Enviar código", {
                    ejecutar { llamar(c.json) { c.api.recuperar(EmailReq(email.trim())) }; enviado = true }
                }, Modifier.fillMaxWidth(), estilo = EstiloBoton.Solido, cargando = cargando)
            } else {
                Campo(codigo, { codigo = it.filter(Char::isDigit).take(6) }, "Código", error = campos["codigo"], teclado = KeyboardType.NumberPassword)
                Campo(password, { password = it }, "Contraseña nueva", error = campos["password"], password = true, placeholder = "Mínimo 8 caracteres")
                Boton("Cambiar contraseña", {
                    ejecutar { exito = llamar(c.json) { c.api.confirmarRecuperacion(ConfirmarReq(email.trim(), codigo, password)) }.mensaje }
                }, Modifier.fillMaxWidth(), estilo = EstiloBoton.Solido, cargando = cargando)
                EnlaceTexto("Enviar otro código", { enviado = false; codigo = "" }, color = Iwmp.Muted)
            }
            error?.let { Aviso(it) }
        }
    }
}

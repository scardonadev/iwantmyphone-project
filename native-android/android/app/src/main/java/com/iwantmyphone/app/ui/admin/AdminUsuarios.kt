package com.iwantmyphone.app.ui.admin

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.iwantmyphone.app.AppContainer
import com.iwantmyphone.app.data.api.RolInfo
import com.iwantmyphone.app.data.api.UsuarioGestion
import com.iwantmyphone.app.data.api.UsuarioReq
import com.iwantmyphone.app.data.api.llamar
import com.iwantmyphone.app.data.api.llamarPagina
import com.iwantmyphone.app.ui.campos
import com.iwantmyphone.app.ui.components.Aviso
import com.iwantmyphone.app.ui.components.Avatar
import com.iwantmyphone.app.ui.components.BarraSuperior
import com.iwantmyphone.app.ui.components.Boton
import com.iwantmyphone.app.ui.components.Campo
import com.iwantmyphone.app.ui.components.DialogoConfirmar
import com.iwantmyphone.app.ui.components.EnlaceTexto
import com.iwantmyphone.app.ui.components.EstadoCarga
import com.iwantmyphone.app.ui.components.EstadoError
import com.iwantmyphone.app.ui.components.EstadoMensaje
import com.iwantmyphone.app.ui.components.EstiloBoton
import com.iwantmyphone.app.ui.components.Etiqueta
import com.iwantmyphone.app.ui.components.Filete
import com.iwantmyphone.app.ui.components.Gutter
import com.iwantmyphone.app.ui.components.Selector
import com.iwantmyphone.app.ui.fechaCorta
import com.iwantmyphone.app.ui.iniciales
import com.iwantmyphone.app.ui.mensaje
import com.iwantmyphone.app.ui.theme.Iwmp
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

// ================================================================ Lista

class AdminUsuariosViewModel(private val c: AppContainer) : ViewModel() {
    private val _e = MutableStateFlow(EstadoLista<UsuarioGestion>())
    val estado = _e.asStateFlow()
    private var trabajo: Job? = null
    val miId = c.sesionStore.actual?.usuario?.id

    fun buscar(q: String) { _e.update { it.copy(q = q) }; recargar(350) }

    fun recargar(espera: Long = 0) {
        trabajo?.cancel()
        trabajo = viewModelScope.launch {
            if (espera > 0) delay(espera)
            _e.update { it.copy(items = emptyList(), pagina = 0, hayMas = true, error = null) }
            pagina()
        }
    }

    fun mas() {
        if (_e.value.cargando || !_e.value.hayMas) return
        trabajo = viewModelScope.launch { pagina() }
    }

    private suspend fun pagina() {
        val e = _e.value
        _e.update { it.copy(cargando = true) }
        runCatching { llamarPagina(c.json) { c.api.usuarios(e.q.ifBlank { null }, e.pagina + 1, 30) } }
            .onSuccess { p -> _e.update { it.copy(items = it.items + p.items, pagina = it.pagina + 1, hayMas = p.meta?.hasNextPage == true, cargando = false) } }
            .onFailure { err -> _e.update { it.copy(cargando = false, error = err.mensaje()) } }
    }

    fun eliminar(u: UsuarioGestion) = viewModelScope.launch {
        runCatching { llamar(c.json) { c.api.eliminarUsuario(u.id) } }
            .onSuccess { _e.update { it.copy(items = it.items.filterNot { x -> x.id == u.id }) } }
            .onFailure { err -> _e.update { it.copy(aviso = err.mensaje()) } }
    }

    fun cerrarAviso() = _e.update { it.copy(aviso = null) }
}

/** Gestor de usuarios (Excel, fila 16): nombre, rol y fecha de registro; eliminar y añadir. */
@Composable
fun AdminUsuariosScreen(container: AppContainer, onAtras: () -> Unit, onUsuario: (String?) -> Unit) {
    val vm: AdminUsuariosViewModel = viewModel { AdminUsuariosViewModel(container) }
    val e by vm.estado.collectAsState()
    var borrar by remember { mutableStateOf<UsuarioGestion?>(null) }
    LifecycleResumeEffect(Unit) { vm.recargar(); onPauseOrDispose { } }

    Column(Modifier.fillMaxSize().background(Iwmp.Paper)) {
        BarraSuperior("Usuarios y permisos", onAtras) {
            IconButton(onClick = { onUsuario(null) }) { Icon(Icons.Filled.Add, contentDescription = "Nuevo usuario", tint = Iwmp.Ink) }
        }
        Campo(e.q, vm::buscar, "Buscar", Modifier.padding(horizontal = Gutter, vertical = 12.dp), placeholder = "Nombre o correo")
        Filete()
        when {
            e.error != null && e.items.isEmpty() -> EstadoError(e.error!!, { vm.recargar() })
            !e.cargando && e.items.isEmpty() -> EstadoMensaje("Sin usuarios")
            else -> LazyColumn(Modifier.fillMaxSize()) {
                items(e.items, key = { it.id }) { u ->
                    Column(Modifier.fillMaxWidth().clickable { onUsuario(u.id) }) {
                        Row(Modifier.fillMaxWidth().padding(start = Gutter, end = 8.dp, top = 12.dp, bottom = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Avatar(iniciales(u.nombre), tam = 40.dp)
                            Spacer(Modifier.width(14.dp))
                            Column(Modifier.weight(1f)) {
                                Text(u.nombre, style = MaterialTheme.typography.titleSmall, color = if (u.isActive) Iwmp.Ink else Iwmp.Muted)
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Etiqueta(u.rolNombre, color = if (u.rol == "visitante") Iwmp.Muted else Iwmp.Accent)
                                    if (!u.isActive) Etiqueta("Desactivado")
                                }
                                Text("Registro ${fechaCorta(u.createdAt)}", style = MaterialTheme.typography.bodySmall)
                            }
                            if (u.id != vm.miId) {
                                IconButton(onClick = { borrar = u }) { Icon(Icons.Filled.Delete, contentDescription = "Eliminar ${u.nombre}", tint = Iwmp.Ink) }
                            }
                        }
                        Filete(Modifier.padding(horizontal = Gutter))
                    }
                }
                item {
                    if (e.cargando) EstadoCarga()
                    else if (e.hayMas) EnlaceTexto("Cargar más", vm::mas, Modifier.padding(Gutter))
                }
            }
        }
    }
    borrar?.let { u ->
        DialogoConfirmar("Eliminar usuario", "¿Eliminar a ${u.nombre}? Sus pedidos se conservan con los datos del cliente.", "Eliminar",
            onConfirmar = { vm.eliminar(u); borrar = null }, onCancelar = { borrar = null })
    }
    e.aviso?.let { DialogoConfirmar("No se pudo eliminar", it, "Entendido", vm::cerrarAviso, vm::cerrarAviso) }
}

// ================================================================ Detalle

data class FormUsuario(
    val nombre: String = "",
    val email: String = "",
    val rol: String = "visitante",
    val documento: String = "",
    val telefono: String = "",
    val activo: Boolean = true,
    val password: String = "",
)

private fun UsuarioGestion.aForm() = FormUsuario(nombre, email, rol, documento.orEmpty(), telefono.orEmpty(), isActive)

class AdminUsuarioViewModel(private val c: AppContainer, private val id: String?) : ViewModel() {
    data class E(
        val modo: Modo,
        val cargando: Boolean = true,
        val error: String? = null,
        val original: UsuarioGestion? = null,
        val roles: List<RolInfo> = emptyList(),
        val form: FormUsuario = FormUsuario(),
        val campos: Map<String, String> = emptyMap(),
        val guardando: Boolean = false,
        val aviso: String? = null,
        val creadoId: String? = null,
    )

    private val _e = MutableStateFlow(E(if (id == null) Modo.Nuevo else Modo.Ver))
    val estado = _e.asStateFlow()
    val esUnoMismo = id != null && id == c.sesionStore.actual?.usuario?.id

    init { cargar() }

    fun cargar() = viewModelScope.launch {
        _e.update { it.copy(cargando = true, error = null) }
        runCatching {
            val roles = llamar(c.json) { c.api.roles() }
            val u = id?.let { llamar(c.json) { c.api.usuario(it) } }
            roles to u
        }.onSuccess { (roles, u) -> _e.update { it.copy(cargando = false, roles = roles, original = u, form = u?.aForm() ?: FormUsuario()) } }
            .onFailure { err -> _e.update { it.copy(cargando = false, error = err.mensaje()) } }
    }

    fun editar() = _e.update { it.copy(modo = Modo.Editar) }
    fun cancelar() = _e.update { it.copy(modo = Modo.Ver, form = it.original?.aForm() ?: it.form, campos = emptyMap(), aviso = null) }
    fun cambiar(f: FormUsuario) = _e.update { it.copy(form = f) }

    fun guardar() = viewModelScope.launch {
        val f = _e.value.form
        val req = UsuarioReq(
            email = f.email.trim(),
            nombre = f.nombre.trim(),
            password = f.password.ifEmpty { null }, // en la edición, vacío = no cambiarla
            rol = f.rol,
            documento = f.documento.trim(),
            telefono = f.telefono.trim(),
            isActive = f.activo,
        )
        _e.update { it.copy(guardando = true, campos = emptyMap(), aviso = null) }
        runCatching { llamar(c.json) { if (id == null) c.api.crearUsuario(req) else c.api.editarUsuario(id, req) } }
            .onSuccess { u -> _e.update { it.copy(guardando = false, modo = Modo.Ver, original = u, form = u.aForm(), creadoId = if (id == null) u.id else null) } }
            .onFailure { err -> _e.update { it.copy(guardando = false, campos = err.campos(), aviso = err.mensaje()) } }
    }
}

@Composable
fun AdminUsuarioScreen(container: AppContainer, id: String?, onAtras: () -> Unit, onCreado: (String) -> Unit) {
    val vm: AdminUsuarioViewModel = viewModel(key = "usuario-${id ?: "nuevo"}") { AdminUsuarioViewModel(container, id) }
    val e by vm.estado.collectAsState()
    val f = e.form
    val lectura = e.modo == Modo.Ver
    LaunchedEffect(e.creadoId) { e.creadoId?.let(onCreado) }

    Column(Modifier.fillMaxSize().background(Iwmp.Paper)) {
        BarraSuperior(if (e.modo == Modo.Nuevo) "Nuevo usuario" else e.original?.nombre ?: "Usuario", onAtras)
        when {
            e.cargando -> EstadoCarga()
            e.error != null -> EstadoError(e.error!!, vm::cargar)
            else -> Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).imePadding().padding(Gutter), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                e.original?.let { u ->
                    Etiqueta("Registro ${fechaCorta(u.createdAt)} · ${u.totalPedidos ?: 0} pedidos · ${u.credencialesBiometricas ?: 0} huellas")
                }
                Campo(f.nombre, { vm.cambiar(f.copy(nombre = it)) }, "Nombre", soloLectura = lectura, error = e.campos["nombre"])
                Campo(f.email, { vm.cambiar(f.copy(email = it)) }, "Correo", soloLectura = lectura, error = e.campos["email"], teclado = KeyboardType.Email)
                Selector(
                    "Rol", e.roles, e.roles.find { it.rol == f.rol }, { it.nombre }, { vm.cambiar(f.copy(rol = it.rol)) },
                    // Nadie se quita a sí mismo el rol de administrador (la API también lo impide).
                    soloLectura = lectura || vm.esUnoMismo, error = e.campos["rol"],
                )
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Campo(f.documento, { vm.cambiar(f.copy(documento = it.filter(Char::isDigit))) }, "Documento", Modifier.weight(1f), soloLectura = lectura, error = e.campos["documento"], teclado = KeyboardType.Number)
                    Campo(f.telefono, { vm.cambiar(f.copy(telefono = it)) }, "Teléfono", Modifier.weight(1f), soloLectura = lectura, error = e.campos["telefono"], teclado = KeyboardType.Phone)
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Etiqueta("Cuenta activa", Modifier.weight(1f), color = Iwmp.Ink)
                    Switch(
                        f.activo, { vm.cambiar(f.copy(activo = it)) }, enabled = !lectura && !vm.esUnoMismo,
                        colors = SwitchDefaults.colors(checkedTrackColor = Iwmp.Ink, checkedThumbColor = Iwmp.Paper, uncheckedTrackColor = Iwmp.Surface, uncheckedBorderColor = Iwmp.Line, uncheckedThumbColor = Iwmp.Muted),
                    )
                }
                if (!lectura) {
                    Campo(
                        f.password, { vm.cambiar(f.copy(password = it)) },
                        if (e.modo == Modo.Nuevo) "Contraseña" else "Contraseña nueva (opcional)",
                        error = e.campos["password"], password = true, placeholder = "Mínimo 8 caracteres",
                    )
                }

                e.roles.find { it.rol == f.rol }?.let { rol ->
                    Spacer(Modifier.height(4.dp))
                    Column(Modifier.fillMaxWidth().background(Iwmp.Surface).padding(14.dp)) {
                        Etiqueta("Permisos de ${rol.nombre}", color = Iwmp.Ink)
                        Spacer(Modifier.height(8.dp))
                        if (rol.permisos.isEmpty()) Text("Comprar, favoritos, direcciones y sus propias compras.", style = MaterialTheme.typography.bodySmall)
                        rol.permisos.forEach { p -> Text("· ${p.descripcion}", style = MaterialTheme.typography.bodySmall) }
                    }
                }

                if (e.aviso != null && e.campos.isEmpty()) Aviso(e.aviso!!)
                Spacer(Modifier.height(8.dp))
                when (e.modo) {
                    Modo.Ver -> Boton("Editar", vm::editar, Modifier.fillMaxWidth(), estilo = EstiloBoton.Solido)
                    Modo.Editar -> Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Boton("Cancelar", vm::cancelar, Modifier.weight(1f))
                        Boton("Actualizar", vm::guardar, Modifier.weight(1f), estilo = EstiloBoton.Solido, cargando = e.guardando)
                    }
                    Modo.Nuevo -> Boton("Crear usuario", vm::guardar, Modifier.fillMaxWidth(), estilo = EstiloBoton.Solido, cargando = e.guardando)
                }
                if (e.modo == Modo.Nuevo) {
                    Text("La persona registrará su huella al iniciar sesión por primera vez en la app.", style = MaterialTheme.typography.bodySmall)
                }
                Spacer(Modifier.height(24.dp))
            }
        }
    }
}

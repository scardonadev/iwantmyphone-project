package com.iwantmyphone.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.Icon
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavDestination
import androidx.navigation.NavDestination.Companion.hasRoute
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.toRoute
import com.iwantmyphone.app.AppContainer
import com.iwantmyphone.app.ui.admin.AdminPedidoScreen
import com.iwantmyphone.app.ui.admin.AdminPedidosScreen
import com.iwantmyphone.app.ui.admin.AdminProductoScreen
import com.iwantmyphone.app.ui.admin.AdminProductosScreen
import com.iwantmyphone.app.ui.admin.AdminUsuarioScreen
import com.iwantmyphone.app.ui.admin.AdminUsuariosScreen
import com.iwantmyphone.app.ui.admin.ReporteScreen
import com.iwantmyphone.app.ui.carrito.CarritoScreen
import com.iwantmyphone.app.ui.carrito.CheckoutScreen
import com.iwantmyphone.app.ui.catalogo.DetalleScreen
import com.iwantmyphone.app.ui.catalogo.ProductosScreen
import com.iwantmyphone.app.ui.components.Filete
import com.iwantmyphone.app.ui.cuenta.LoginScreen
import com.iwantmyphone.app.ui.cuenta.RecuperarScreen
import com.iwantmyphone.app.ui.cuenta.RegistroScreen
import com.iwantmyphone.app.ui.home.HomeScreen
import com.iwantmyphone.app.ui.perfil.DestinoMas
import com.iwantmyphone.app.ui.perfil.DireccionesScreen
import com.iwantmyphone.app.ui.perfil.FavoritosScreen
import com.iwantmyphone.app.ui.perfil.MasScreen
import com.iwantmyphone.app.ui.perfil.MiPedidoScreen
import com.iwantmyphone.app.ui.perfil.MisPedidosScreen
import com.iwantmyphone.app.ui.splash.SplashScreen
import com.iwantmyphone.app.ui.theme.EstiloLabel
import com.iwantmyphone.app.ui.theme.Iwmp

/** Pantallas que muestran la barra inferior: todas menos el splash, la cuenta y la pasarela. */
private fun NavDestination?.conBarra(): Boolean = this != null && listOf(
    RSplash::class, RLogin::class, RRegistro::class, RRecuperar::class, RCheckout::class,
).none { hasRoute(it) }

@Composable
fun IwmpRaiz(container: AppContainer) {
    val nav = rememberNavController()
    val entrada by nav.currentBackStackEntryAsState()
    val destino = entrada?.destination
    val sesion by container.sesionStore.sesion.collectAsState()
    val cargada by container.sesionStore.cargada.collectAsState()
    val carrito by container.carrito.items.collectAsState(initial = emptyList())

    Scaffold(
        containerColor = Iwmp.Paper,
        contentWindowInsets = WindowInsets(0),
        bottomBar = {
            if (destino.conBarra()) {
                BarraInferior(
                    destino = destino,
                    unidadesCarrito = carrito.sumOf { it.cantidad },
                    conSesion = sesion != null,
                    onTab = { ruta -> nav.irATab(ruta) },
                    onPerfil = { if (sesion != null) nav.irATab(RMas) else nav.navigate(RLogin()) },
                )
            }
        },
    ) { padding ->
        NavHost(
            nav,
            startDestination = RSplash,
            modifier = Modifier.fillMaxSize().padding(padding).statusBarsPadding().let { if (destino.conBarra()) it else it.navigationBarsPadding() },
        ) {
            composable<RSplash> {
                SplashScreen(listo = cargada) {
                    nav.navigate(RHome) { popUpTo(RSplash) { inclusive = true } }
                }
            }
            composable<RHome> {
                HomeScreen(container, onProducto = { nav.navigate(RDetalle(it)) }, onCatalogo = { promo -> nav.navigate(RProductos(promo)) })
            }
            composable<RProductos> { e ->
                ProductosScreen(container, e.toRoute<RProductos>().promo, onProducto = { nav.navigate(RDetalle(it)) })
            }
            composable<RDetalle> { e ->
                DetalleScreen(
                    container, e.toRoute<RDetalle>().id, conSesion = sesion != null,
                    onAtras = { nav.popBackStack() },
                    onProducto = { nav.navigate(RDetalle(it)) },
                    onIrAlCarrito = { nav.irATab(RCarrito) },
                    onLogin = { nav.navigate(RLogin()) },
                )
            }
            composable<RCarrito> {
                CarritoScreen(
                    container,
                    onProducto = { nav.navigate(RDetalle(it)) },
                    // La pasarela exige sesión (Excel, fila 10): sin ella, login y vuelta a la pasarela.
                    onContinuar = { if (sesion != null) nav.navigate(RCheckout) else nav.navigate(RLogin(DESTINO_CHECKOUT)) },
                    onCatalogo = { nav.irATab(RProductos()) },
                )
            }
            composable<RCheckout> {
                CheckoutScreen(container, onAtras = { nav.popBackStack() }, onPedidoCreado = { id ->
                    nav.navigate(RMiPedido(id, nuevo = true)) { popUpTo(RCarrito) }
                })
            }
            composable<RLogin> { e ->
                val ruta = e.toRoute<RLogin>()
                LoginScreen(
                    container,
                    onAtras = { nav.popBackStack() },
                    onListo = { nav.trasSesion(ruta.destino) },
                    onRegistro = { nav.navigate(RRegistro(ruta.destino)) },
                    onRecuperar = { nav.navigate(RRecuperar) },
                )
            }
            composable<RRegistro> { e ->
                val ruta = e.toRoute<RRegistro>()
                RegistroScreen(container, onAtras = { nav.popBackStack() }, onListo = { nav.trasSesion(ruta.destino) })
            }
            composable<RRecuperar> {
                RecuperarScreen(container, onAtras = { nav.popBackStack() }, onListo = { nav.popBackStack() })
            }
            composable<RMas> {
                MasScreen(
                    container,
                    onDestino = { d ->
                        nav.navigate(
                            when (d) {
                                DestinoMas.MisCompras -> RMisPedidos
                                DestinoMas.Favoritos -> RFavoritos
                                DestinoMas.Direcciones -> RDirecciones
                                DestinoMas.GestionPedidos -> RAdminPedidos
                                DestinoMas.GestionProductos -> RAdminProductos
                                DestinoMas.Reporte -> RReporte
                                DestinoMas.Usuarios -> RAdminUsuarios
                            },
                        )
                    },
                    onSesionCerrada = { nav.navigate(RHome) { popUpTo(nav.graph.findStartDestination().id) { inclusive = true } } },
                )
            }
            composable<RMisPedidos> { MisPedidosScreen(container, { nav.popBackStack() }, { nav.navigate(RMiPedido(it)) }) }
            composable<RMiPedido> { e ->
                val r = e.toRoute<RMiPedido>()
                MiPedidoScreen(container, r.id, r.nuevo, onAtras = { nav.popBackStack() })
            }
            composable<RFavoritos> { FavoritosScreen(container, { nav.popBackStack() }, { nav.navigate(RDetalle(it)) }) }
            composable<RDirecciones> { DireccionesScreen(container) { nav.popBackStack() } }

            composable<RAdminProductos> { AdminProductosScreen(container, { nav.popBackStack() }, { nav.navigate(RAdminProducto(it)) }) }
            composable<RAdminProducto> { e ->
                AdminProductoScreen(container, e.toRoute<RAdminProducto>().id, onAtras = { nav.popBackStack() }, onCreado = { id ->
                    nav.navigate(RAdminProducto(id)) { popUpTo(RAdminProductos) }
                })
            }
            composable<RAdminPedidos> { AdminPedidosScreen(container, { nav.popBackStack() }, { nav.navigate(RAdminPedido(it)) }) }
            composable<RAdminPedido> { e -> AdminPedidoScreen(container, e.toRoute<RAdminPedido>().id) { nav.popBackStack() } }
            composable<RReporte> { ReporteScreen(container) { nav.popBackStack() } }
            composable<RAdminUsuarios> { AdminUsuariosScreen(container, { nav.popBackStack() }, { nav.navigate(RAdminUsuario(it)) }) }
            composable<RAdminUsuario> { e ->
                AdminUsuarioScreen(container, e.toRoute<RAdminUsuario>().id, onAtras = { nav.popBackStack() }, onCreado = { id ->
                    nav.navigate(RAdminUsuario(id)) { popUpTo(RAdminUsuarios) }
                })
            }
        }
    }
}

/** Navegación de pestaña: una sola copia de cada una y su estado se conserva. */
private fun NavHostController.irATab(ruta: Any) = navigate(ruta) {
    popUpTo(RHome) { saveState = true }
    launchSingleTop = true
    restoreState = true
}

/** Tras iniciar sesión o registrarse: a la pasarela si venía de ahí; si no, atrás. */
private fun NavHostController.trasSesion(destino: String?) {
    if (destino == DESTINO_CHECKOUT) {
        navigate(RCheckout) { popUpTo(RCarrito) }
    } else {
        popBackStack()
    }
}

/**
 * Barra inferior (Excel, fila 5): Home, Productos, Carrito con contador y
 * Perfil. Sin sesión el último icono es de perfil y abre el login; con
 * sesión es una hamburguesa que abre "Más".
 */
@Composable
private fun BarraInferior(
    destino: NavDestination?,
    unidadesCarrito: Int,
    conSesion: Boolean,
    onTab: (Any) -> Unit,
    onPerfil: () -> Unit,
) {
    Column(Modifier.fillMaxWidth().background(Iwmp.Paper).navigationBarsPadding()) {
        Filete()
        Row(Modifier.fillMaxWidth().height(64.dp)) {
            TabItem("Home", Icons.Filled.Home, destino?.hasRoute(RHome::class) == true) { onTab(RHome) }
            TabItem("Productos", Icons.AutoMirrored.Filled.List, destino?.hasRoute(RProductos::class) == true || destino?.hasRoute(RDetalle::class) == true) { onTab(RProductos()) }
            TabItem("Carrito", Icons.Filled.ShoppingCart, destino?.hasRoute(RCarrito::class) == true, insignia = unidadesCarrito) { onTab(RCarrito) }
            val enPerfil = listOf(RMas::class, RMisPedidos::class, RMiPedido::class, RFavoritos::class, RDirecciones::class, RAdminProductos::class,
                RAdminProducto::class, RAdminPedidos::class, RAdminPedido::class, RReporte::class, RAdminUsuarios::class, RAdminUsuario::class)
                .any { destino?.hasRoute(it) == true }
            TabItem(if (conSesion) "Más" else "Perfil", if (conSesion) Icons.Filled.Menu else Icons.Filled.Person, enPerfil, onClick = onPerfil)
        }
    }
}

@Composable
private fun androidx.compose.foundation.layout.RowScope.TabItem(
    titulo: String,
    icono: ImageVector,
    activo: Boolean,
    insignia: Int = 0,
    onClick: () -> Unit,
) {
    val color = if (activo) Iwmp.Ink else Iwmp.Muted
    Column(
        Modifier
            .weight(1f)
            .fillMaxSize()
            .clickable(role = Role.Tab, onClick = onClick)
            .semantics { contentDescription = if (insignia > 0) "$titulo, $insignia productos" else titulo },
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = androidx.compose.foundation.layout.Arrangement.Center,
    ) {
        Box {
            Icon(icono, contentDescription = null, tint = color, modifier = Modifier.size(22.dp))
            if (insignia > 0) {
                // Contador del carrito (Excel, fila 9): cuadrado en acento, sin radio.
                Text(
                    if (insignia > 99) "99+" else "$insignia",
                    style = EstiloLabel.copy(fontSize = 9.sp, letterSpacing = 0.sp),
                    color = Iwmp.Paper,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.align(Alignment.TopEnd).offset(x = 10.dp, y = (-6).dp).background(Iwmp.Accent).widthIn(min = 16.dp).padding(horizontal = 3.dp, vertical = 1.dp),
                )
            }
        }
        Spacer(Modifier.height(4.dp))
        Text(titulo.uppercase(), style = EstiloLabel.copy(fontSize = 9.sp), color = color)
    }
}

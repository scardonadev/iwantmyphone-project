package com.iwantmyphone.app.ui

import kotlinx.serialization.Serializable

/*
 * Rutas tipadas de Navigation Compose. `destino` en login y registro permite
 * volver a la pasarela tras iniciar sesión (Excel, fila 10).
 */

const val DESTINO_CHECKOUT = "checkout"

@Serializable data object RSplash
@Serializable data object RHome
@Serializable data class RProductos(val promo: Boolean = false)
@Serializable data class RDetalle(val id: String)
@Serializable data object RCarrito
@Serializable data object RCheckout
@Serializable data class RLogin(val destino: String? = null)
@Serializable data class RRegistro(val destino: String? = null)
@Serializable data object RRecuperar
@Serializable data object RMas
@Serializable data object RMisPedidos
@Serializable data class RMiPedido(val id: String, val nuevo: Boolean = false)
@Serializable data object RFavoritos
@Serializable data object RDirecciones
@Serializable data object RAdminProductos
@Serializable data class RAdminProducto(val id: String? = null)
@Serializable data object RAdminPedidos
@Serializable data class RAdminPedido(val id: String)
@Serializable data object RReporte
@Serializable data object RAdminUsuarios
@Serializable data class RAdminUsuario(val id: String? = null)

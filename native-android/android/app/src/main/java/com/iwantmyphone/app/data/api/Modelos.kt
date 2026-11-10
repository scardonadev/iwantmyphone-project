package com.iwantmyphone.app.data.api

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

/*
 * DTO de la API (native-android/api/AGENTS.md §6). El Json del cliente usa
 * `JsonNamingStrategy.SnakeCase`: `precioFinal` <-> `precio_final`. Solo se
 * anota @SerialName donde la conversión automática no coincide.
 *
 * Los campos que la API recorta según el rol (`costo`, `utilidad`…) son
 * opcionales: un vendedor simplemente no los recibe.
 */

// ---------------------------------------------------------------- Sobre

@Serializable
data class Envelope<T>(val success: Boolean, val data: T? = null, val meta: Meta? = null)

/**
 * `meta` va en camelCase en la API (mismo contrato que el Next). La estrategia
 * de nombres del cliente la deja tal cual (ver `NombresApi` en IwmpApp.kt):
 * un @SerialName no bastaría, porque la estrategia también lo transforma.
 */
@Serializable
data class Meta(val page: Int, val limit: Int, val total: Int, val totalPages: Int, val hasNextPage: Boolean)

@Serializable
data class ErrorBody(val success: Boolean = false, val error: ErrorDetalle? = null)

@Serializable
data class ErrorDetalle(val code: String, val message: String, val details: JsonElement? = null)

/** Una página de un listado: los datos y su `meta`. */
data class Pagina<T>(val items: List<T>, val meta: Meta?)

// ---------------------------------------------------------------- Catálogo

@Serializable
data class MarcaRef(val id: String, val nombre: String, val logo: String? = null)

@Serializable
data class KeyValue(val key: String, val value: String)

@Serializable
data class Celular(
    val id: String,
    val marca: MarcaRef,
    val modelo: String,
    val nombre: String,
    val imagesUrl: List<String> = emptyList(),
    val precio: Double,
    val descuentoPct: Int = 0,
    val precioFinal: Double,
    val costo: Double? = null,
    val fechaLanzamiento: String,
    val createdAt: String? = null,
    // Solo en el detalle:
    val descripcion: String? = null,
    val valoracion: Double? = null,
    val totalValoraciones: Int? = null,
    val esFavorito: Boolean = false,
    val especificaciones: List<KeyValue> = emptyList(),
    // Solo en "más vendidos" de la Home:
    val unidadesVendidas: Int? = null,
)

@Serializable
data class Home(
    val banners: List<Celular>,
    val promociones: List<Celular>,
    val ultimos: List<Celular>,
    val masVendidos: List<Celular>,
)

@Serializable
data class Marca(
    val id: String,
    val nombre: String,
    val logo: String? = null,
    val paisOrigen: String? = null,
    val totalCelulares: Int? = null,
)

@Serializable
data class Opcion(val key: String, val values: List<String>)

@Serializable
data class Opciones(val options: List<Opcion>)

@Serializable
data class Ventana(val unidades: Int, val ventas: Double, val utilidad: Double? = null)

@Serializable
data class ResumenVentas(
    val ultimoAnio: Ventana,
    val ultimoMes: Ventana,
    @SerialName("ultimos_7_dias") val ultimos7Dias: Ventana,
    val hoy: Ventana,
)

@Serializable
data class CelularReq(
    val marcaId: String? = null,
    val modelo: String? = null,
    val descripcion: String? = null,
    val imagesUrl: List<String>? = null,
    val precio: Double? = null,
    val costo: Double? = null,
    val descuentoPct: Int? = null,
    val fechaLanzamiento: String? = null,
    val especificaciones: Map<String, String>? = null,
)

// ---------------------------------------------------------------- Cuenta

@Serializable
data class Usuario(
    val id: String,
    val email: String,
    val nombre: String,
    val documento: String? = null,
    val telefono: String? = null,
    val rol: String,
    val rolNombre: String,
    val permisos: List<String> = emptyList(),
    val isActive: Boolean = true,
    val createdAt: String? = null,
)

@Serializable
data class SesionResp(
    val usuario: Usuario,
    val accessToken: String,
    val refreshToken: String,
    val expiresIn: Int,
    val credencialBiometricaId: String? = null,
)

@Serializable data class LoginReq(val email: String, val password: String)
@Serializable data class RefreshReq(val refreshToken: String)
@Serializable data class BiometriaReq(val dispositivo: String, val publicKey: String)

@Serializable
data class RegistroReq(
    val email: String,
    val nombre: String,
    val password: String,
    val telefono: String? = null,
    val biometria: BiometriaReq,
)

@Serializable data class Credencial(val id: String, val dispositivo: String)
@Serializable data class RetoReq(val credencialId: String)
@Serializable data class Reto(val reto: String, val expiresIn: Int)
@Serializable data class BioLoginReq(val credencialId: String, val reto: String, val firma: String)
@Serializable data class EmailReq(val email: String)
@Serializable data class ConfirmarReq(val email: String, val codigo: String, val password: String)
@Serializable data class Mensaje(val mensaje: String)

// ---------------------------------------------------------------- Comprador

@Serializable
data class Direccion(
    val id: String,
    val alias: String,
    val direccion: String,
    val ciudad: String,
    val departamento: String,
    val indicaciones: String? = null,
    val telefono: String,
)

@Serializable
data class DireccionReq(
    val alias: String,
    val direccion: String,
    val ciudad: String,
    val departamento: String,
    val indicaciones: String? = null,
    val telefono: String,
)

@Serializable
data class MetodoPago(
    val id: String,
    val codigo: String,
    val nombre: String,
    val descripcion: String? = null,
    val requierePasarela: Boolean = false,
)

@Serializable data class ItemPedidoReq(val celularId: String, val cantidad: Int)

@Serializable
data class PedidoReq(val items: List<ItemPedidoReq>, val direccionId: String, val metodoPagoId: String)

@Serializable
data class MetodoRef(val id: String? = null, val codigo: String, val nombre: String, val requierePasarela: Boolean = false)

@Serializable
data class Cliente(
    val usuarioId: String? = null,
    val nombre: String,
    val email: String,
    val documento: String? = null,
    val telefono: String,
)

@Serializable
data class Entrega(val direccion: String, val ciudad: String, val departamento: String, val indicaciones: String? = null)

@Serializable
data class PedidoItem(
    val id: String,
    val celularId: String? = null,
    val modelo: String,
    val imagenUrl: String? = null,
    val cantidad: Int,
    val precioUnitario: Double,
    val descuentoUnitario: Double,
    val total: Double,
    val costoUnitario: Double? = null,
    val utilidad: Double? = null,
)

@Serializable
data class Pago(
    val id: String,
    val referencia: String,
    val referenciaPasarela: String? = null,
    val estado: String,
    val monto: Double,
    val moneda: String,
    val medio: String? = null,
    val createdAt: String,
    val checkoutUrl: String? = null,
)

@Serializable
data class Pedido(
    val id: String,
    val numero: Int,
    val estado: String,
    val fecha: String,
    val pagadoAt: String? = null,
    val metodoPago: MetodoRef,
    val cliente: Cliente,
    val entrega: Entrega,
    val items: List<PedidoItem>,
    val numProductos: Int,
    val subtotal: Double,
    val descuento: Double,
    val total: Double,
    val moneda: String = "USD",
    val costoTotal: Double? = null,
    val utilidad: Double? = null,
    val pagos: List<Pago> = emptyList(),
)

@Serializable
data class MiPedido(
    val id: String,
    val numero: Int,
    val estado: String,
    val fecha: String,
    val total: Double,
    val pagadoAt: String? = null,
    val metodoNombre: String,
    val numProductos: Int,
    val imagenes: List<String> = emptyList(),
    val pagoEstado: String? = null,
)

// ---------------------------------------------------------------- Gestión

@Serializable
data class PedidoGestion(
    val id: String,
    val numero: Int,
    val fecha: String,
    val estado: String,
    val clienteNombre: String,
    val total: Double,
    val metodoPago: MetodoRef,
    val numProductos: Int,
    val utilidad: Double? = null,
)

@Serializable data class EstadoReq(val estado: String)

@Serializable
data class ResumenReporte(
    val pedidos: Int,
    val unidades: Int,
    val ventas: Double,
    val ticketPromedio: Double,
    val costo: Double? = null,
    val utilidad: Double? = null,
)

@Serializable
data class PuntoSerie(
    val inicio: String,
    val etiqueta: String,
    val pedidos: Int,
    val unidades: Int,
    val ventas: Double,
    val utilidad: Double? = null,
)

@Serializable
data class TopProducto(
    val celularId: String? = null,
    val modelo: String,
    val imagenUrl: String? = null,
    val unidades: Int,
    val ventas: Double,
    val utilidad: Double? = null,
)

@Serializable
data class Reporte(
    val periodo: String,
    val moneda: String,
    val resumen: ResumenReporte,
    val serie: List<PuntoSerie>,
    val topProductos: List<TopProducto>,
)

@Serializable
data class UsuarioGestion(
    val id: String,
    val email: String,
    val nombre: String,
    val documento: String? = null,
    val telefono: String? = null,
    val rol: String,
    val rolNombre: String,
    val isActive: Boolean,
    val createdAt: String,
    val totalPedidos: Int? = null,
    val credencialesBiometricas: Int? = null,
)

@Serializable
data class UsuarioReq(
    val email: String? = null,
    val nombre: String? = null,
    val password: String? = null,
    val rol: String? = null,
    val documento: String? = null,
    val telefono: String? = null,
    val isActive: Boolean? = null,
)

@Serializable data class PermisoInfo(val codigo: String, val descripcion: String)
@Serializable data class RolInfo(val rol: String, val nombre: String, val permisos: List<PermisoInfo>)

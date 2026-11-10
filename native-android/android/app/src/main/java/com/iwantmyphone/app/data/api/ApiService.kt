package com.iwantmyphone.app.data.api

import kotlinx.serialization.json.JsonElement
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

/** Un método por endpoint de la API (native-android/api/AGENTS.md §6). */
interface ApiService {

    // ------------------------------------------------------------ Cuenta
    @POST("api/auth/login") suspend fun login(@Body body: LoginReq): Envelope<SesionResp>
    @POST("api/auth/registro") suspend fun registro(@Body body: RegistroReq): Envelope<SesionResp>
    @GET("api/auth/yo") suspend fun yo(): Envelope<Usuario>
    @POST("api/auth/biometria/credenciales") suspend fun registrarCredencial(@Body body: BiometriaReq): Envelope<Credencial>
    @POST("api/auth/biometria/reto") suspend fun reto(@Body body: RetoReq): Envelope<Reto>
    @POST("api/auth/biometria/login") suspend fun loginBiometria(@Body body: BioLoginReq): Envelope<SesionResp>
    @POST("api/auth/recuperacion") suspend fun recuperar(@Body body: EmailReq): Envelope<Mensaje>
    @POST("api/auth/recuperacion/confirmar") suspend fun confirmarRecuperacion(@Body body: ConfirmarReq): Envelope<Mensaje>

    // ------------------------------------------------------------ Catálogo
    @GET("api/home") suspend fun home(): Envelope<Home>

    @GET("api/celulares")
    suspend fun celulares(
        @Query("q") q: String? = null,
        @Query("filter") filter: String? = null,
        @Query("promocion") promocion: String? = null,
        @Query("orden") orden: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
    ): Envelope<List<Celular>>

    @GET("api/celulares/{id}") suspend fun celular(@Path("id") id: String): Envelope<Celular>
    @GET("api/celulares/{id}/sugeridos") suspend fun sugeridos(@Path("id") id: String): Envelope<List<Celular>>
    @GET("api/celulares/{id}/resumen-ventas") suspend fun resumenVentas(@Path("id") id: String): Envelope<ResumenVentas>
    @POST("api/celulares") suspend fun crearCelular(@Body body: CelularReq): Envelope<Celular>
    @PATCH("api/celulares/{id}") suspend fun editarCelular(@Path("id") id: String, @Body body: CelularReq): Envelope<Celular>
    @DELETE("api/celulares/{id}") suspend fun eliminarCelular(@Path("id") id: String): Envelope<JsonElement>

    @GET("api/marcas") suspend fun marcas(): Envelope<List<Marca>>
    @GET("api/especificaciones/opciones") suspend fun opciones(): Envelope<Opciones>

    // ------------------------------------------------------------ Comprador
    @GET("api/favoritos") suspend fun favoritos(): Envelope<List<Celular>>
    @PUT("api/favoritos/{id}") suspend fun marcarFavorito(@Path("id") celularId: String): Envelope<JsonElement>
    @DELETE("api/favoritos/{id}") suspend fun quitarFavorito(@Path("id") celularId: String): Envelope<JsonElement>

    @GET("api/direcciones") suspend fun direcciones(): Envelope<List<Direccion>>
    @POST("api/direcciones") suspend fun crearDireccion(@Body body: DireccionReq): Envelope<Direccion>
    @DELETE("api/direcciones/{id}") suspend fun eliminarDireccion(@Path("id") id: String): Envelope<JsonElement>

    @GET("api/metodos-pago") suspend fun metodosPago(): Envelope<List<MetodoPago>>

    @POST("api/pedidos") suspend fun crearPedido(@Body body: PedidoReq): Envelope<Pedido>
    @GET("api/pedidos/mios") suspend fun misPedidos(@Query("page") page: Int, @Query("limit") limit: Int = 10): Envelope<List<MiPedido>>
    @GET("api/pedidos/mios/{id}") suspend fun miPedido(@Path("id") id: String): Envelope<Pedido>
    @POST("api/pedidos/mios/{id}/pagos") suspend fun reintentarPago(@Path("id") id: String): Envelope<Pedido>

    // ------------------------------------------------------------ Gestión
    @GET("api/pedidos")
    suspend fun pedidos(
        @Query("estado") estado: String? = null,
        @Query("q") q: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
    ): Envelope<List<PedidoGestion>>

    @GET("api/pedidos/{id}") suspend fun pedido(@Path("id") id: String): Envelope<Pedido>
    @PATCH("api/pedidos/{id}") suspend fun cambiarEstado(@Path("id") id: String, @Body body: EstadoReq): Envelope<Pedido>
    @DELETE("api/pedidos/{id}") suspend fun eliminarPedido(@Path("id") id: String): Envelope<JsonElement>

    @GET("api/reportes/ventas") suspend fun reporte(@Query("periodo") periodo: String): Envelope<Reporte>

    @GET("api/usuarios")
    suspend fun usuarios(@Query("q") q: String? = null, @Query("page") page: Int = 1, @Query("limit") limit: Int = 20): Envelope<List<UsuarioGestion>>

    @GET("api/usuarios/{id}") suspend fun usuario(@Path("id") id: String): Envelope<UsuarioGestion>
    @POST("api/usuarios") suspend fun crearUsuario(@Body body: UsuarioReq): Envelope<UsuarioGestion>
    @PATCH("api/usuarios/{id}") suspend fun editarUsuario(@Path("id") id: String, @Body body: UsuarioReq): Envelope<UsuarioGestion>
    @DELETE("api/usuarios/{id}") suspend fun eliminarUsuario(@Path("id") id: String): Envelope<JsonElement>
    @GET("api/roles") suspend fun roles(): Envelope<List<RolInfo>>
}

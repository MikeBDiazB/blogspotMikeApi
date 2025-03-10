const express = require("express");
const cors = require("cors");
const { connect } = require("mongoose");
require("dotenv").config();
const upload = require("express-fileupload");

const userRoutes = require("./routes/userRoutes");
const postRoutes = require("./routes/postRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();

// ✅ Configurar correctamente CORS
app.use(cors({
    origin: ["http://localhost:5173", "https://blogspot-app-mauve.vercel.app"], // Permite peticiones desde el frontend
    credentials: true, // Permitir cookies o autenticación
    methods: ["GET", "POST", "PUT", "DELETE"], // Métodos permitidos
    allowedHeaders: ["Content-Type", "Authorization"], // Encabezados permitidos
}));

// Middlewares
app.use(express.json({ extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use(upload());
app.use("/uploads", express.static(__dirname + "/uploads"));

// Rutas
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);

// Manejo de errores
app.use(notFound);
app.use(errorHandler);

// Definir puerto
const PORT = process.env.PORT || 5000;

// Conectar a MongoDB y luego iniciar el servidor
connect(process.env.MONGO_URI)
    .then(() => {
        app.listen(PORT, () => {
            console.log(`✅ Servidor corriendo en el puerto ${PORT}`);
        });
    })
    .catch(error => {
        console.error("❌ Error al conectar a MongoDB:", error);
        process.exit(1);
    });

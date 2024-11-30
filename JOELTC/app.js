
const express = require("express");
const path = require("path");
const db = require("./database"); // Importa la base de datos SQLite
const multer = require("multer");

const app = express();



app.get("/getTotalAssets", (req, res) => {
    const query = `
        SELECT 
            (SELECT SUM(Cars.purchasePrice) FROM Cars WHERE Cars.status = 'Disponible') AS totalPurchasePrice,
            COALESCE(SUM(Expenses.amount), 0) AS totalExpenses
        FROM Cars
        LEFT JOIN (
            SELECT carId, SUM(amount) AS amount FROM Expenses GROUP BY carId
        ) AS Expenses ON Cars.id = Expenses.carId
        WHERE Cars.status = 'Disponible'
    `;
    db.get(query, [], (err, row) => {
        if (err) {
            console.error("Error al calcular total de activos:", err);
            res.status(500).json({ error: "Error al calcular total de activos" });
        } else {
            const totalAssets = row.totalPurchasePrice + row.totalExpenses;
            res.json({ totalAssets });
        }
    });
});


 
// Configura multer para manejar el almacenamiento de archivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Carpeta donde se guardarán las imágenes
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Nombre único del archivo
    }
});
// Configura el límite de tamaño del archivo (50 MB = 50* 1024 * 1024 bytes)
const upload = multer({
    storage: storage,
    limits: { fileSize: 50* 1024 * 1024 } // 5 MB
});


// Configura el motor de vistas como EJS
app.set('view engine', 'ejs');

// Agrega esta línea para servir archivos estáticos desde la carpeta "uploads"
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configura el middleware para servir archivos estáticos desde la carpeta "public"
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas y lógica de la aplicación (ejemplos)
app.get("/TheCompasAutoImport", (req, res) => {
    res.render("index");
});
// Ruta GET para obtener todos los autos de la base de datos.
app.get("/getCars", (req, res) => {
    const query = "SELECT * FROM Cars";
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error("Error al obtener autos:", err);
            res.status(500).json({ error: "Error al obtener autos" });
        } else {
            res.json(rows);
        }
    });
});

// Ruta DELETE para eliminar un auto en la base de datos
app.delete("/deleteCar/:id", (req, res) => {
    const carId = req.params.id;
    const query = `DELETE FROM Cars WHERE id = ?`;
    db.run(query, [carId], function (err) {
        if (err) {
            console.error("Error al eliminar auto:", err);
            res.status(500).json({ error: "Error al eliminar auto" });
        } else {
            res.json({ message: "Auto eliminado exitosamente" });
        }
    });
});

// Ruta PUT para actualizar un auto en la base de datos
app.put("/updateCar/:id", upload.single('photo'), (req, res) => {
    const carId = req.params.id;
    const { brand, model, year, miles, purchasePrice, description, status } = req.body;
    const photo = req.file ? req.file.path : null; // Guardar la ruta del archivo, si se proporciona

    // Construir la consulta dinámica dependiendo de si la foto está presente o no
    let query = `
        UPDATE Cars
        SET brand = ?, model = ?, year = ?, miles = ?, purchasePrice = ?, description = ?, status = ?
    `;
    
    let params = [brand, model, year, miles, purchasePrice, description, status];

    // Solo agregar la foto a la consulta si se subió una nueva
    if (photo) {
        query += `, photo = ?`;
        params.push(photo);
    }

    query += ` WHERE id = ?`;
    params.push(carId);

    db.run(query, params, function (err) {
        if (err) {
            console.error("Error al actualizar auto:", err);
            res.status(500).json({ error: "Error al actualizar auto" });
        } else {
            res.json({ message: "Auto actualizado exitosamente" });
        }
    });
});
// Ruta POST para vender un auto
app.post("/sellCar", (req, res) => {
    const { carId, salePrice, saleDate } = req.body;
    const query = `
        INSERT INTO Sales (carId, salePrice, saleDate)
        VALUES (?, ?, ?)
    `;
    db.run(query, [carId, salePrice, saleDate], function (err) {
        if (err) {
            console.error("Error al registrar la venta:", err);
            res.status(500).json({ error: "Error al registrar la venta" });
        } else {
            // Actualizar el estado del auto
            const updateQuery = `UPDATE Cars SET status = 'Vendido' WHERE id = ?`;
            db.run(updateQuery, [carId], function (updateErr) {
                if (updateErr) {
                    console.error("Error al actualizar el estado del auto:", updateErr);
                    res.status(500).json({ error: "Error al actualizar el estado del auto" });
                } else {
                    res.json({ message: "Venta registrada exitosamente" });
                }
            });
        }
    });
});

// Ruta GET para obtener todos los autos vendidos
// Ruta GET para obtener todos los autos vendidos
app.get("/soldCars", (req, res) => {
    const query = `
        SELECT Sales.id AS saleId,
               Cars.id AS carId,
               Cars.brand,
               Cars.model,
               Cars.year,
               Cars.purchasePrice,
               Sales.salePrice,
               (Cars.purchasePrice + COALESCE((SELECT SUM(amount) FROM Expenses WHERE carId = Cars.id), 0)) AS totalCost,
               (Sales.salePrice - (Cars.purchasePrice + COALESCE((SELECT SUM(amount) FROM Expenses WHERE carId = Cars.id), 0))) AS profitOrLoss
        FROM Sales
        JOIN Cars ON Sales.carId = Cars.id
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error("Error al obtener autos vendidos:", err);
            res.status(500).json({ error: "Error al obtener autos vendidos" });
        } else {
            // Formatear los resultados para la salida
            const formattedRows = rows.map(row => ({
                saleId: row.saleId,
                brand: row.brand,
                model: row.model,
                year: row.year,
                purchasePrice: formatCurrency(row.purchasePrice),
                salePrice: formatCurrency(row.salePrice),
                totalCost: formatCurrency(row.totalCost),
                profitOrLoss: formatCurrency(row.profitOrLoss)
            }));
            res.json(formattedRows);
        }
    });
});


// Función para formatear la moneda en USD
function formatCurrency(value) {
    return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
}


// Ruta POST para agregar un nuevo auto a la base de datos.
app.post("/addCar", upload.single('photo'), (req, res) => {
    const { brand, model, year, miles, purchasePrice, description, status } = req.body;
    const photo = req.file ? req.file.path : ''; // Guardar la ruta del archivo
    const query = `
        INSERT INTO Cars (brand, model, year, miles, purchasePrice, description, photo, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.run(query, [brand, model, year, miles, purchasePrice, description, photo, status], function (err) {
        if (err) {
            console.error("Error al agregar auto:", err);
            res.status(500).json({ error: "Error al agregar auto" });
        } else {
            res.json({ message: "Auto agregado exitosamente", car: { brand, model, year, miles, purchasePrice, description, photo, status }, id: this.lastID });
        }
    });
});

// Ruta POST para agregar un gasto a un vehículo
app.post("/addExpense", (req, res) => {
    const { carId, description, amount } = req.body;
    const query = `
        INSERT INTO Expenses (carId, description, amount)
        VALUES (?, ?, ?)
    `;
    db.run(query, [carId, description, amount], function (err) {
        if (err) {
            console.error("Error al agregar gasto:", err);
            res.status(500).json({ error: "Error al agregar gasto" });
        } else {
            res.json({ message: "Gasto agregado exitosamente", id: this.lastID });
        }
    });
});
// Ruta GET para obtener los gastos de un auto específico
app.get("/getExpenses", (req, res) => {
    const { carId } = req.query;
    const query = `SELECT * FROM Expenses WHERE carId = ?`;
    db.all(query, [carId], (err, rows) => {
        if (err) {
            console.error("Error al obtener gastos:", err);
            res.status(500).json({ error: "Error al obtener gastos" });
        } else {
            res.json(rows);
        }
    });
});

app.listen(3000, () => {
    console.log("Corriendo en el puerto 3000");
});
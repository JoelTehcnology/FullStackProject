const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Crear una nueva base de datos en el archivo "cars.db"
const dbPath = path.resolve(__dirname, 'cars.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error al conectar con la base de datos:', err);
    } else {
        console.log('Conexión a la base de datos SQLite exitosa');
    }
});

// Crear las tablas si no existen
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS Cars (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            brand TEXT NOT NULL,
            model TEXT NOT NULL,
            year TEXT NOT NULL,
            miles INTEGER NOT NULL,
            purchasePrice INTEGER NOT NULL,
            description TEXT,
            photo TEXT,
            status TEXT DEFAULT 'Disponible'
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS Expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            carId INTEGER,
            description TEXT NOT NULL,
            amount INTEGER NOT NULL,
            FOREIGN KEY (carId) REFERENCES Cars(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS Sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            carId INTEGER,
            salePrice INTEGER NOT NULL,
            saleDate TEXT NOT NULL,
            FOREIGN KEY (carId) REFERENCES Cars(id)
        )
    `);
    
});

module.exports = db;


//xxxx
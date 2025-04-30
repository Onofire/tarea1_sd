const { MongoClient } = require("mongodb");
const fs = require("fs");
const path = require("path");

async function main() {
  const uri = "mongodb://localhost:27017"; 
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("✅ Conectado a MongoDB");

    const db = client.db("tarea1_sd"); // nombre de la base de datos
    const collection = db.collection("eventos"); // nombre de la colección

    // Leer el archivo JSON
    const eventos = JSON.parse(fs.readFileSync(path.join(__dirname, "eventos-waze.json")));

    console.log(`📄 Cargando ${eventos.length} eventos...`);

    // Insertar los eventos
    const result = await collection.insertMany(eventos);
    console.log(`🚀 Insertados ${result.insertedCount} eventos correctamente.`);

  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await client.close();
  }
}

main();

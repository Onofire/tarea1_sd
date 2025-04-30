const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

const MONGO_URI = process.env.MONGO_URL || 'mongodb://localhost:27017';
const DB_NAME = "app1db";
const COLLECTION_NAME = "eventos";
const FILE_PATH = path.join(__dirname, "eventos-waze.json");

let eventos = [];

async function insertarEnMongo(eventos) {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Insertar (si hay eventos)
    if (eventos.length > 0) {
      const result = await collection.insertMany(eventos, { ordered: false });
      console.log(`🚀 Insertados ${result.insertedCount} eventos en MongoDB.`);
    } else {
      console.log("⚠️ No hay eventos para insertar.");
    }
  } catch (err) {
    console.error("❌ Error al insertar en MongoDB:", err.message);
  } finally {
    await client.close();
  }
}

(async () => {
   const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  const page = await browser.newPage();

  await page.setRequestInterception(true);

  page.on("request", (request) => {
    if (
      request.resourceType() === "fetch" &&
      !request.url().includes("google-analytics")
    ) {
      console.log("📤 fetch request =>", request.method(), request.url());
    }
    request.continue();
  });

  page.on("response", async (response) => {
    const request = response.request();
    if (
      request.resourceType() === "fetch" &&
      !request.url().includes("google-analytics")
    ) {
      const url = response.url();
      const status = response.status();
      console.log(`📥 fetch response => [${status}] ${url}`);

      try {
        const contentType = response.headers()["content-type"] || "";

        if (contentType.includes("application/json")) {
          const data = await response.json();

          if (Array.isArray(data)) {
            eventos.push(...data);
          } else {
            eventos.push(data);
          }

          console.log(`✅ Eventos acumulados: ${eventos.length}`);

          // Guardado parcial en JSON
          fs.writeFileSync(FILE_PATH, JSON.stringify(eventos, null, 2));
          console.log("📝 Guardado parcial en eventos-waze.json");

          // Inserción automática si se llega a 10.000
          if (eventos.length >= 50) {
            console.log("📦 10.000 eventos alcanzados. Insertando en MongoDB...");
            await insertarEnMongo(eventos);
            eventos = []; // Reiniciar acumulador después de insertar
            fs.writeFileSync(FILE_PATH, "[]"); // Limpiar el archivo
            console.log("🧹 Eventos limpiados tras la inserción.");
          }
        }
      } catch (err) {
        console.log(`❌ Error leyendo o guardando ${url}:`, err.message);
      }
    }
  });

  await page.goto("https://www.waze.com/es-419/live-map");
  console.log("🌍 Mapa abierto. Escuchando eventos fetch...\n");

  process.on("SIGINT", async () => {
    console.log("\n🛑 Terminando scraper...");

    // Guardado final
    fs.writeFileSync(FILE_PATH, JSON.stringify(eventos, null, 2));
    console.log(`✅ Guardado final con ${eventos.length} eventos.`);

    // Inserción final (si hay eventos pendientes)
    if (eventos.length > 0) {
      console.log("📤 Insertando eventos restantes en MongoDB...");
      await insertarEnMongo(eventos);
    }

    process.exit();
  });
  setInterval(async () => {
    const x = Math.floor(Math.random() * 100) + 100;
    const y = Math.floor(Math.random() * 100) + 100;
    await page.mouse.move(x, y);
    console.log(` Mouse movido a (${x}, ${y})`);
  }, 10000); // cada 10 segundos

  await new Promise(() => {}); // Mantiene el script activo
})();
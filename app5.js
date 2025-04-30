const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  let eventos = [];

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

          if (eventos.length % 1000 === 0) {
            fs.writeFileSync(
              path.join(__dirname, "eventos-waze.json"),
              JSON.stringify(eventos, null, 2)
            );
            console.log("📝 Guardado parcial en eventos-waze.json");
          }
        }
      } catch (err) {
        console.log(`❌ Error leyendo o guardando ${url}:`, err.message);
      }
    }
  });

  await page.goto("https://www.waze.com/es-419/live-map");
  console.log("🌍 Mapa abierto. Escuchando eventos fetch...\n");

  // Captura Ctrl+C para guardar todo
  process.on('SIGINT', () => {
    console.log("\n🛑 Terminando scraper... Guardando eventos restantes.");

    fs.writeFileSync(
      path.join(__dirname, "eventos-waze.json"),
      JSON.stringify(eventos, null, 2)
    );

    console.log(`✅ Guardado final con ${eventos.length} eventos.`);
    process.exit();
  });

  await new Promise(() => {}); // Mantiene el script vivo
})();

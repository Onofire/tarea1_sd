const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  let eventCount = 1; // contador de archivos

  // Crear carpeta para guardar los archivos
  const folder = path.join(__dirname, "eventos");
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder);
  }

  await page.setRequestInterception(true);

  page.on("request", (request) => {//request piden archivos
    if (
      request.resourceType() === "fetch" && //escrapea archivos fetch que son los eventos
      !request.url().includes("google-analytics")
    ) {
      console.log("📤 fetch request =>", request.method(), request.url());
    }
    request.continue();
  });

  page.on("response", async (response) => {//request piden archivos
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
          const filename = `event-${eventCount++}.json`;
          const filepath = path.join(folder, filename);

          fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
          console.log(`✅ Guardado en: ${filename}`);
        }
      } catch (err) {
        console.log(`❌ Error leyendo o guardando ${url}:`, err.message);
      }
    }
  });

  await page.goto("https://www.waze.com/es-419/live-map");//waze del mapa
  console.log("🌍 Mapa abierto. Escuchando eventos fetch...\n");//

  await new Promise(() => {}); // Mantiene el script en ejecución

  await browser.close();
})();

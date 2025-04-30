const { MongoClient } = require('mongodb');
const Redis = require('ioredis');

async function obtenerDocumento(mongoClient, redis) {
  try {
    const db = mongoClient.db('scrapeo_sd');
    const collection = db.collection('eventos');

    // --- Buscar un documento aleatorio en MongoDB (solo para elegir insertId) ---
    const [randomDoc] = await collection.aggregate([{ $sample: { size: 1 } }]).toArray();

    if (!randomDoc) {
      console.log('⚠️ No se encontró ningún documento aleatorio');
      return;
    }

    const insertId = randomDoc.insertId;

    if (!insertId) {
      console.log('⚠️ El documento aleatorio no tiene insertId');
      return;
    }

    const cacheKey = `archivo:${insertId}`;

    // --- Medir tiempo de búsqueda en Redis ---
    const startRedis = Date.now();
    const cachedData = await redis.get(cacheKey);
    const endRedis = Date.now();
    const redisTimeMs = endRedis - startRedis;

    if (cachedData) {
      console.log(`📦 [Redis] Documento encontrado con insertId: ${insertId}`);
      console.log(`⏱️ Tiempo de búsqueda en Redis: ${redisTimeMs} ms`);
      console.log('Contenido:', JSON.parse(cachedData));
    } else {
      console.log(`📦 [Redis] Documento NO encontrado en Redis (tiempo: ${redisTimeMs} ms)`);

      // --- Medir tiempo de búsqueda en MongoDB ---
      const startMongo = Date.now();
      const docFromMongo = await collection.findOne({ insertId: insertId });
      const endMongo = Date.now();
      const mongoTimeMs = endMongo - startMongo;

      if (!docFromMongo) {
        console.log(`❌ No se encontró en MongoDB tampoco (insertId: ${insertId})`);
        return;
      }

      console.log(`📦 [MongoDB] Documento encontrado en MongoDB`);
      console.log(`⏱️ Tiempo de búsqueda en MongoDB: ${mongoTimeMs} ms`);

      // --- Medir tiempo de escritura en Redis ---
      const startWriteRedis = Date.now();
      await redis.set(cacheKey, JSON.stringify(docFromMongo));
      const endWriteRedis = Date.now();
      const writeRedisTimeMs = endWriteRedis - startWriteRedis;

      console.log(`✅ Documento cacheado en Redis con la clave: ${cacheKey}`);
      console.log(`⏱️ Tiempo de escritura en Redis: ${writeRedisTimeMs} ms`);
    }
  } catch (error) {
    console.error('❌ Error en obtenerDocumento:', error);
  }
}

async function iniciar() {
  const mongoUri = 'mongodb://localhost:27017';
  const mongoClient = new MongoClient(mongoUri);
  const redis = new Redis();

  try {
    await mongoClient.connect();
    console.log('✅ Conexiones establecidas. Iniciando iteraciones cada 0.9 segundos...');

    setInterval(async () => {
      await obtenerDocumento(mongoClient, redis);
    }, 900); // 900 ms

  } catch (error) {
    console.error('❌ Error al iniciar:', error);
  }
}

iniciar();

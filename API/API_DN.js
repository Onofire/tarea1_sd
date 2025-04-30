const { MongoClient } = require('mongodb');
const Redis = require('ioredis');



async function obtenerDocumento(mongoClient, redis) {
  try {
    const db = mongoClient.db('app1db');
    const collection = db.collection('eventos');

    // Obtener todos los insertId (o el campo que uses para identificar documentos)
    const docs = await collection.find({}, { projection: { insertId: 1 } }).toArray();

    if (docs.length === 0) {
      console.log('⚠️ No hay documentos en la colección:...', docs);
      return;
    }

    // Definir la media y desviación estándar (por ejemplo, mitad de la cantidad de docs)
    const mean = docs.length / 2;
    const stdDev = docs.length / 6; // (aproximadamente el 99% estará dentro de ±3σ)

    let index;
    do {
      index = Math.round(randomNormal(mean, stdDev));
    } while (index < 0 || index >= docs.length); // asegurarse de que el índice sea válido

    const selectedDocId = docs[index].insertId;
    const cacheKey = `archivo:${selectedDocId}`;

    // Primero intentar obtenerlo de Redis
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      console.log(`📦 [Redis] Documento encontrado con insertId: ${selectedDocId}`);
      // console.log('Contenido:', JSON.parse(cachedData));
    } else {
      console.log(`📦 [MongoDB] Documento NO encontrado en Redis. Se obtuvo de MongoDB con insertId: ${selectedDocId}`);

      // Obtener el documento completo
      const randomDoc = await collection.findOne({ insertId: selectedDocId });

      if (randomDoc) {
        await redis.set(cacheKey, JSON.stringify(randomDoc));
        console.log(`✅ Documento cacheado en Redis con la clave: ${cacheKey}`);
      } else {
        console.log('⚠️ No se encontró el documento seleccionado.');
      }
    }
  } catch (error) {
    console.error('❌ Error en obtenerDocumento:', error);
  }
}

async function iniciar() {
  const mongoUri = process.env.MONGO_URL || 'mongodb://localhost:27017';
  const mongoClient = new MongoClient(mongoUri);
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: 6379,
  });

  try {
    await mongoClient.connect();
    console.log('✅ Conexiones establecidas. Iniciando iteraciones cada 2 segundos...');

    setInterval(async () => {
      await obtenerDocumento(mongoClient, redis);
    }, 2000);

  } catch (error) {
    console.error('❌ Error al iniciar:', error);
  }
}

iniciar();

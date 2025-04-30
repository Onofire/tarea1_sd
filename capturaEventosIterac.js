const { MongoClient } = require('mongodb');

async function obtenerDocumento(mongoClient) {
  try {
    const db = mongoClient.db('scrapeo_sd'); // <-- tu base
    const collection = db.collection('eventos'); // <-- tu colección

    // Elegir un documento aleatorio de MongoDB
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

    console.log(`📦 [MongoDB] Documento obtenido con insertId: ${insertId}`);
    // Puedes imprimir el contenido completo si quieres:
    // console.log('Contenido:', randomDoc);
  } catch (error) {
    console.error('❌ Error en obtenerDocumento:', error);
  }
}

async function iniciar() {
  const mongoUri = 'mongodb://localhost:27017';
  const mongoClient = new MongoClient(mongoUri);

  try {
    await mongoClient.connect();
    console.log('✅ Conexión a MongoDB establecida. Iniciando iteraciones cada 2 segundos...');

    // Ejecuta obtenerDocumento cada 2 segundos
    setInterval(async () => {
      await obtenerDocumento(mongoClient);
    }, 2000);

  } catch (error) {
    console.error('❌ Error al iniciar:', error);
  }
}

iniciar();

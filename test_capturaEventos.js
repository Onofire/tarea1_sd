const { MongoClient } = require('mongodb');

async function obtenerDocumento() {
  const mongoUri = 'mongodb://localhost:27017';
  const mongoClient = new MongoClient(mongoUri);

  try {
    await mongoClient.connect();
    console.log('✅ Conectado a MongoDB');

    const db = mongoClient.db('scrapeo_sd'); // <-- Pon tu base
    const collection = db.collection('eventos'); // <-- Pon tu colección

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

    console.log(`📦 Documento obtenido de MongoDB con insertId: ${insertId}`);
    console.log('Contenido:', randomDoc);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoClient.close();
  }
}

obtenerDocumento();

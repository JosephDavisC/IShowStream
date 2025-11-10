#!/usr/bin/env node
/**
 * Clean Firestore database - Delete all documents from all collections
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin with application default credentials
admin.initializeApp({
  projectId: 'streamsense-476705',
});

const db = admin.firestore();

async function deleteCollection(collectionName, batchSize = 100) {
  console.log(`\n🗑️  Deleting collection: ${collectionName}`);
  
  const collectionRef = db.collection(collectionName);
  let deleted = 0;
  
  while (true) {
    const snapshot = await collectionRef.limit(batchSize).get();
    
    if (snapshot.empty) {
      break;
    }
    
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
      deleted++;
    });
    
    await batch.commit();
    process.stdout.write(`   Deleted ${deleted} documents...\r`);
  }
  
  console.log(`   ✅ Deleted ${deleted} documents from ${collectionName}`);
  return deleted;
}

async function main() {
  console.log('='.repeat(70));
  console.log('🧹 CLEANING FIRESTORE DATABASE');
  console.log('='.repeat(70));
  
  // Collections to clean
  const collections = [
    'messages',           // Chat messages
    'trends',            // Trend analysis
    'insights',          // AI insights
    'agent_activity',    // Agent activity logs
    'users',             // User profiles
  ];
  
  let totalDeleted = 0;
  
  for (const collection of collections) {
    try {
      const deleted = await deleteCollection(collection);
      totalDeleted += deleted;
    } catch (error) {
      console.log(`   ❌ Error deleting ${collection}: ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log(`✅ CLEANUP COMPLETE - Deleted ${totalDeleted} total documents`);
  console.log('='.repeat(70));
  
  // Keep config/twitch_channel but reset monitoring_enabled
  console.log('\n🔧 Resetting monitoring config...');
  try {
    const configRef = db.collection('config').doc('twitch_channel');
    await configRef.update({
      monitoring_enabled: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('   ✅ Reset monitoring_enabled to True');
  } catch (error) {
    console.log(`   ⚠️  Could not reset config: ${error.message}`);
  }
  
  console.log('\n🎉 Database is now clean! You can sign in with a new account.');
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});

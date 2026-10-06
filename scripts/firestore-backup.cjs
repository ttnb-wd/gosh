const fs = require("fs");
const path = require("path");

const {
  getApps,
  initializeApp,
  applicationDefault,
} = require("firebase-admin/app");

const {
  getFirestore,
  Timestamp,
  GeoPoint,
  DocumentReference,
} = require("firebase-admin/firestore");

if (getApps().length === 0) {
  initializeApp({
    credential: applicationDefault(),
    projectId: "goshperfume-94ae6",
  });
}

const db = getFirestore();

function serialize(value) {
  if (value === null || value === undefined) {
    return value ?? null;
  }

  if (value instanceof Timestamp) {
    return {
      __type: "timestamp",
      value: value.toDate().toISOString(),
    };
  }

  if (value instanceof GeoPoint) {
    return {
      __type: "geopoint",
      latitude: value.latitude,
      longitude: value.longitude,
    };
  }

  if (value instanceof DocumentReference) {
    return {
      __type: "document-reference",
      path: value.path,
    };
  }

  if (Buffer.isBuffer(value)) {
    return {
      __type: "bytes",
      value: value.toString("base64"),
    };
  }

  if (Array.isArray(value)) {
    return value.map(serialize);
  }

  if (typeof value === "object") {
    const result = {};

    for (const [key, child] of Object.entries(value)) {
      result[key] = serialize(child);
    }

    return result;
  }

  return value;
}

async function exportCollection(collectionRef) {
  const snapshot = await collectionRef.get();
  const documents = {};

  for (const doc of snapshot.docs) {
    const subcollections = await doc.ref.listCollections();
    const exportedSubcollections = {};

    for (const subcollection of subcollections) {
      exportedSubcollections[subcollection.id] =
        await exportCollection(subcollection);
    }

    documents[doc.id] = {
      data: serialize(doc.data()),
      subcollections: exportedSubcollections,
    };
  }

  return documents;
}

async function main() {
  console.log("Starting Firestore backup...");
  console.log("Project: goshperfume-94ae6");

  const collections = await db.listCollections();

  const backup = {
    metadata: {
      projectId: "goshperfume-94ae6",
      createdAt: new Date().toISOString(),
      formatVersion: 1,
    },
    collections: {},
  };

  for (const collection of collections) {
    console.log(`Backing up collection: ${collection.id}`);

    backup.collections[collection.id] =
      await exportCollection(collection);
  }

  const backupDir = path.join(process.cwd(), "backups");

  fs.mkdirSync(backupDir, {
    recursive: true,
  });

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-");

  const filePath = path.join(
    backupDir,
    `firestore-backup-${timestamp}.json`
  );

  fs.writeFileSync(
    filePath,
    JSON.stringify(backup, null, 2),
    "utf8"
  );

  console.log("");
  console.log("Backup completed successfully.");
  console.log(`File: ${filePath}`);
}

main().catch((error) => {
  console.error("");
  console.error("Backup failed.");
  console.error(error?.message || error);
  process.exit(1);
});
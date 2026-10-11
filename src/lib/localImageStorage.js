const DATABASE_NAME = 'jewelst-local-files';
const DATABASE_VERSION = 2;
const IMAGE_STORE = 'design-images';

function openImageDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(IMAGE_STORE)) {
        database.createObjectStore(IMAGE_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open local image storage.'));
  });
}

async function runImageTransaction(mode, action) {
  const database = await openImageDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(IMAGE_STORE, mode);
    const request = action(transaction.objectStore(IMAGE_STORE));
    let result;

    if (request) {
      request.onsuccess = () => {
        result = request.result;
      };
      request.onerror = () => reject(request.error || new Error('Could not access the saved image.'));
    }

    transaction.oncomplete = () => {
      database.close();
      resolve(result);
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error || new Error('Could not save the image locally.'));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error || new Error('Local image storage was interrupted.'));
    };
  });
}

export function saveLocalImage(id, file) {
  return runImageTransaction('readwrite', store => store.put(file, id));
}

export function getLocalImage(id) {
  return runImageTransaction('readonly', store => store.get(id));
}

export function deleteLocalImage(id) {
  return runImageTransaction('readwrite', store => store.delete(id));
}

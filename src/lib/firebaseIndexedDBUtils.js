// firebaseIndexedDBUtils.js
export const getFirebaseAuthData = () => {
    return new Promise((resolve, reject) => {
      // Open Firebase's IndexedDB
      const request = indexedDB.open('firebaseLocalStorageDb');
  
      request.onerror = (event) => {
        reject('Failed to open IndexedDB:', event.target.error);
      };
  
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['firebaseLocalStorage'], 'readonly');
        const store = transaction.objectStore('firebaseLocalStorage');
  
        const getAllRequest = store.getAll(); // Fetch all records
  
        getAllRequest.onsuccess = () => {
          if (getAllRequest.result.length > 0) {
            resolve(getAllRequest.result[0].value); // Resolve with the user session data
          } else {
            resolve(null); // No user session found
          }
        };
  
        getAllRequest.onerror = () => {
          reject('Error fetching Firebase Auth data from IndexedDB');
        };
      };
    });
  };
  
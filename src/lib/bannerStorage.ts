import { openDB } from 'idb';

const DB_NAME = 'cravings-db';
const STORE_NAME = 'files';

const getDB = async () => {
    return openDB(DB_NAME, 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        },
    });
};

export const saveBannerFile = async (file: File) => {
    const db = await getDB();
    await db.put(STORE_NAME, file, 'pending_banner');
};

export const getBannerFile = async (): Promise<File | undefined> => {
    const db = await getDB();
    return await db.get(STORE_NAME, 'pending_banner');
};

export const clearBannerFile = async () => {
    const db = await getDB();
    await db.delete(STORE_NAME, 'pending_banner');
};

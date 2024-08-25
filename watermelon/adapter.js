import { Database } from '@nozbe/watermelondb';
import { DbModels, DbSchema } from './schema';

let mowebDb = 'moweb';

import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
let adapter = new LokiJSAdapter({
    schema: DbSchema,
    dbName: mowebDb,    
    useWebWorker: false,
    useIncrementalIndexedDB: true,
})

// import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
// let adapter = new SQLiteAdapter({
//     dbName: mowebDb,
//     schema: DbSchema,
// });

const database = new Database({
    adapter,
    actionsEnabled: true,
    modelClasses: DbModels,
});

export { database }
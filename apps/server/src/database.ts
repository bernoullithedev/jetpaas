import sqlite3 from "sqlite3";

const db = new sqlite3.Database("./db.sqlite",(err)=>{
    if(err){
        console.error(err);
    }else{
        console.log("Connected to the database");
    }
});
// Initialize the database
db.run(`CREATE TABLE IF NOT EXISTS deployments (
    id TEXT PRIMARY KEY, 
    name TEXT, source TEXT, 
    status TEXT, 
    imageTag TEXT, 
    liveUrl TEXT, 
    createdAt TEXT
    )`);

export default db;
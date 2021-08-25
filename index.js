import sqlite3 from "sqlite3";
import { open } from "sqlite";
import fs from "fs";

const sql = `
CREATE TABLE IF NOT EXISTS entry(
    id INTEGER PRIMARY KEY,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS tag(
    tag TEXT,
    entry INTEGER,
    FOREIGN KEY (entry) REFERENCES entry(id)
);
`

class Journal {
    constructor(dbFile) {
        this.db = null
        this.dbFile = dbFile
    }

    async #connectDB() {
        if (this.db) return

        this.db = await open({
            filename: this.dbFile,
            driver: sqlite3.Database
        })

        //var sql = await fs.promises.readFile("./schema.sql", "utf8")
        await this.db.exec(sql)
    }

    async createEntry(entry) {
        await this.#connectDB()

        const result = await this.db.run("INSERT INTO entry(content, created_at) VALUES (?, ?)", entry, Date.now())
        await this.#createTags(result.lastID, entry)
    }

    async #createTags(entry_id, entry) {
        console.log(entry, entry_id)
        // Returns an array of tags
        var tags = entry.match(/#(\w+)/g)
        // IF there are any tags
        if (tags) {
            // Remove the hash
            tags = tags.map(tag => tag.slice(1))
        
            await tags.forEach(tag => this.db.run("INSERT INTO tag VALUES (?,?)", tag, entry_id))
        }
    }

    async findEntries(tags) {
        tags = tags.match(/#(\w+)/g).map(tag => tag.slice(1))

        var ids = []
        for (const tagID in tags) {
            ids = ids.concat(await this.db.all("SELECT entry FROM tag WHERE tag=?", tags[tagID]))
        }

        ids = ids.map(id => id.entry)

        console.log(ids)
    }

    async getEntry(entry_id) {
        return await this.db.get("SELECT * FROM entry WHERE id=?", entry_id)
    }
}

(async () => {
    var j = await new Journal("./db.sql")
    await j.createEntry("Test")
    await j.createEntry("Test2 #atest")
    await j.findEntries("#atest")
    console.log(await j.getEntry(5))
})()
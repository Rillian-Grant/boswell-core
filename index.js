import sqlite3 from "sqlite3";
import { open } from "sqlite";
import SQL from "sql-template-strings";
// import fs from "fs";

const sql = `
CREATE TABLE IF NOT EXISTS entry(
    id INTEGER PRIMARY KEY,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS tag(
    tag_text TEXT,
    tagged_entry INTEGER,
    FOREIGN KEY (tagged_entry) REFERENCES entry(id)
);
`

export default class Journal {
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

    /*
    Receives: The text of the new entry
    Returns: The entry object just created
    */
    async createEntry(content) {
        await this.#connectDB()

        var entry = {
            content,
            created_at: Date.now(),
            id: null
        }

        const result = await this.db.run("INSERT INTO entry(content, created_at) VALUES (?, ?)", entry.content, entry.created_at)
        entry.id = result.lastID
        await this.#createTags(entry.id, entry.content)

        return entry
    }

    async #createTags(entry_id, entry) {
        // Returns an array of tags
        var tags = entry.match(/#(\w+)/g)
        // IF there are any tags
        if (tags) {
            // Remove the hash
            tags = tags.map(tag => tag.slice(1))
        
            for (var i in tags) {
                await this.db.run("INSERT INTO tag VALUES (?,?)", tags[i], entry_id)
            }
        }
    }

    async findEntries(tags) {
        tags = tags.match(/#(\w+)/g).map(tag => tag.slice(1))

        var ids = await this.db.all(`
            SELECT entry.id FROM (
                SELECT tag.tagged_entry FROM tag
                WHERE tag.tag_text IN (${"?, ".repeat(tags.length-1)+"?"})
                GROUP BY tag.tagged_entry HAVING COUNT(DISTINCT tag.tag_text) = ?
            ) AS entriesContainingAllTags
            JOIN entry ON entry.id = entriesContainingAllTags.tagged_entry
        `,
        [...tags, tags.length]
        )
        
        ids = ids.map(tag => tag.id)

        return ids
    }

    async getEntry(entry_id) {
        return await this.db.get("SELECT * FROM entry WHERE id=?", entry_id)
    }

    async getTags(entry_id) {
        return await (await this.db.all("SELECT tag_text FROM tag WHERE entry=?", entry_id)).map(obj => (obj.tag))
    }
}
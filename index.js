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
    tag TEXT,
    entry INTEGER,
    FOREIGN KEY (entry) REFERENCES entry(id)
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

    async createEntry(entry) {
        await this.#connectDB()

        const result = await this.db.run("INSERT INTO entry(content, created_at) VALUES (?, ?)", entry, Date.now())
        await this.#createTags(result.lastID, entry)

        return result.lastID
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
                SELECT tag.entry FROM tag
                WHERE tag.tag IN (${"?, ".repeat(tags.length-1)+"?"})
                GROUP BY tag.entry HAVING COUNT(DISTINCT tag.tag) = ?
            ) AS entriesContainingAllTags
            JOIN entry ON entry.id = entriesContainingAllTags.entry
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
        return await (await this.db.all("SELECT tag FROM tag WHERE entry=?", entry_id)).map(obj => (obj.tag))
    }

    // Useless?
    async getIncomingLinks(entry_id) {
        return await this.findEntries("#" + entry_id)
    }

    async getOutgoingLinks(entry_id) {
        var tags = await this.getTags(entry_id)

        tags = tags.filter(tag => /\d+/.test(tag))

        return tags
    }
    // /Useless?
}

/*
(async () => {
    var j = await new Journal("./db.db")
    await j.createEntry("Test")
    await j.createEntry("Test2 #atest #blob #5 #3463")
    await j.findEntries("#atest #blob")
})()*/
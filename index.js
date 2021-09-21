import sqlite3 from "sqlite3";
import { open } from "sqlite";
// TODO import SQL from "sql-template-strings";
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

export default class Boswell {
    constructor(dbFile) {
        this.db = open({
            filename: dbFile,
            driver: sqlite3.Database
        })
    }

    async #setup() {
        this.db = await this.db

        //var sql = await fs.promises.readFile("./schema.sql", "utf8")
        await this.db.exec(sql)
    }

    extractTagsFromString(str) {
        var tags = str.match(/#(\w+)/g)

        // Unnecessary tags will always start with #
        if (tags) return tags.map(tag => {
            if (tag[0] === '#') {
                return tag.substring(1)
            } else return tag
        }) ////// ######## PROBLEM!!!!
    }

    /*
    Receives: The text of the new entry
    Returns: The entry object just created
    */
    async createEntry(content) {
        await this.#setup()

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

    async #createTags(entry_id, entry_content) {
        // Returns an array of tags
        var tags = this.extractTagsFromString(entry_content)
        // IF there are any tags
        if (tags) {
            for (var i in tags) {
                await this.db.run("INSERT INTO tag VALUES (?,?)", tags[i], entry_id)
            }
        }
    }

    async findEntriesByTags(tags) {
        await this.#setup()

        return await this.db.all(`
            SELECT * FROM (
                SELECT tag.tagged_entry FROM tag
                WHERE tag.tag_text IN (${"?, ".repeat(tags.length-1)+"?"})
                GROUP BY tag.tagged_entry HAVING COUNT(DISTINCT tag.tag_text) = ?
            ) AS entriesContainingAllTags
            JOIN entry ON entry.id = entriesContainingAllTags.tagged_entry
        `,
        [...tags, tags.length]
        )
    }

    async getEntry(entry_id) {
        await this.#setup()

        return await this.db.get("SELECT * FROM entry WHERE id=?", entry_id)
    }

    async getTags(entry_id) {
        await this.#setup()

        const baseTags = this.extractTagsFromString((await this.getEntry(entry_id)).content)

        var tags = await this.db.all("SELECT * FROM tag WHERE tagged_entry=?", entry_id)

        return tags.map(tag => ({
            ...tag,
            baseTag: (baseTags.includes(tag.tag_text))
        }))
    }

    async checkEntryExists(entry_id) {
        await this.#setup()

        return await this.db.get("EXISTS (SELECT id FROM entry WHERE id=?)", entry_id)
    }

    async addTag(entry_id, tags) {
        await this.#setup()

        if (!this.checkEntryExists(entry_id)) throw "No such entry"

        const currentTags = await this.getTags(entry_id)

        for (var i in tags) {
            if (!currentTags.map(tag => tag.tag_text).includes(tags[i])) await this.db.run("INSERT INTO tag VALUES (?,?)", tags[i], entry_id)
            else throw `Entry ${entry_id} already has tag ${tags[i]}`
        }
    }

    async removeTag(entry_id, tagsToDelete) {
        await this.#setup()

        // Get tags that can be deleted
        const tags = await this.getTags(entry_id)
        if (tags.length > 0) {
            var currentTagsThatCanBeDeleted = tags.filter(tag => !tag.baseTag)
        } else {
            var currentTagsThatCanBeDeleted = []
        }

        var currentTagNamesThatCanBeDeleted = currentTagsThatCanBeDeleted.map(tag => tag.tag_text)

        if (!tagsToDelete.every(tag => currentTagNamesThatCanBeDeleted.includes(tag))) throw "Some tags can not be deleted"

        for (var i in tags) {
            await this.db.run("DELETE FROM tag WHERE tag_text=? AND tagged_entry=?", tagsToDelete[i], entry_id)
        }
    }
}
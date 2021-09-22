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
    /**
     * @constructor
     * @param {string} dbFile - The path to the sqlite database
     */
    constructor(dbFile) {
        this.db = open({
            filename: dbFile,
            driver: sqlite3.Database
        })
    }

    /**
     * @private
     * @function
     * @description Waits for the database connection to finish loading and runs any needed setup. Run at the start of any function that uses the database.
     * @example await this.#setup()
     * @todo Move the schema into a separate file
     */
    async #setup() {
        this.db = await this.db

        await this.db.exec(sql)
    }

    /**
     * 
     * @param {string} str - The string with the tags to be extracted
     * @returns {Array} - An array containing the extracted tags or null if no tags were found
     * @example
     * extractTagsFromString("A message #a_tag #two") = ["a_tag", "two"]
     * extractTagsFromString("") = null
     */
    extractTagsFromString(str) {
        // null if no matches
        var tags = str.match(/#(\w+)/g)

        if (!tags) return null

        // Remove leading # if present
        // !!!! Why would this ever not be the case?
        return tags.map(tag => {
            if (tag[0] === '#') {
                return tag.substring(1)
            } else return tag
        })
    }

   /**
    * @param {string} content - The content of the entry being created
    * @returns The full object of the entry that was just created
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

    /**
     * @private
     * @param {number} entry_id - The id of the entry for which tags are being added
     * @param {string} entry_content - The text content of the entry. Passed to avoid unnecessary db calls.
     */
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

    /**
     * 
     * @param {string[]} tags
     * @returns {Object[]} - Array of entries
     */
    async findEntriesByTags(tags) {
        await this.#setup()

        // Magic, don't touch
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

    /**
     * @description Get entry by id
     * @param {number} entry_id 
     * @returns {{ id: number, content: string, created_at: number }}
     */
    async getEntry(entry_id) {
        await this.#setup()

        return await this.db.get("SELECT * FROM entry WHERE id=?", entry_id)
    }

    /**
     * @todo Remove tagged_entry from the returned object. It's redundant.
     * @todo Return null if no tags are found.
     * @param {number} entry_id
     * @returns {Object[]} - Array of tag objects with an extra property baseTag that is true if the tag appears in the entry text and therefore cannot be deleted.
     */
    async getTags(entry_id) {
        await this.#setup()

        var baseTags = this.extractTagsFromString((await this.getEntry(entry_id)).content)

        if (!baseTags) baseTags = []

        var tags = await this.db.all("SELECT * FROM tag WHERE tagged_entry=?", entry_id)

        return tags.map(tag => ({
            ...tag,
            baseTag: (baseTags.includes(tag.tag_text))
        }))
    }

    /**
     * @param {number} entry_id
     * @returns {boolean}
     */
    async checkEntryExists(entry_id) {
        await this.#setup()

        return await this.db.get("EXISTS (SELECT id FROM entry WHERE id=?)", entry_id)
    }

    /**
     * @todo Allow single strings to be passed in.
     * @param {number} entry_id
     * @param {string[]} tags - Array of tags to add.
     */
    async addTag(entry_id, tags) {
        await this.#setup()

        if (!this.checkEntryExists(entry_id)) throw "No such entry"

        const currentTags = await this.getTags(entry_id)

        for (var i in tags) {
            // Make sure this entry doesn't already have this tag
            if (!currentTags.map(tag => tag.tag_text).includes(tags[i])) await this.db.run("INSERT INTO tag VALUES (?,?)", tags[i], entry_id)
            else throw `Entry ${entry_id} already has tag ${tags[i]}`
        }
    }

    /**
     * @description Removes tags from entries. Throws an error if any tags are base tags
     * @param {number} entry_id
     * @param {string[]} tagsToDelete
     */
    async removeTag(entry_id, tagsToDelete) {
        await this.#setup()

        // Get tags that can be deleted. aka tags with baseTag = false
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
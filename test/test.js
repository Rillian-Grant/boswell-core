import assert, { doesNotThrow } from 'assert';
import Journal from "../index.js";
import fs from "fs";

if (fs.existsSync("test/test.db")) fs.unlinkSync("test/test.db")

var journal = new Journal("test/test.db")

describe("Test helper functions", function() {
    it("Extract Tags From Text", function() {
        assert.equal(
            JSON.stringify(journal.extractTagsFromString("Entry #with #lots #of custom tags")),
            JSON.stringify(["with", "lots", "of"])
        )
    })
})

describe("Create entries", function() {
    it("Text only", async function() {
         return journal.createEntry("A test text only entry")
    })

    it("Empty", async function() {
        return journal.createEntry("")
    })

    it("With Tags", async function() {
        return journal.createEntry("A entry that links to another entry (#1) and is in two catagories: #tests #has-links")
    })
})

describe("Retrieve entries", function() {
    it("by ID", async function() {
        var testEntry = await journal.createEntry("A entry that links to another entry (#1) and is in two catagories: #tests #has-links")
        const retrievedEntry = await journal.getEntry(testEntry.id)

        assert.equal(retrievedEntry.content, "A entry that links to another entry (#1) and is in two catagories: #tests #has-links", testEntry.entry)
        assert.equal(retrievedEntry.id, testEntry.id)
        assert(retrievedEntry.created_at <= Date.now())
    })
})

describe("Find entries", function() {
    it("by Tags", async function() {
        var testEntry = await journal.createEntry("Entry #with #lots #of custom tags")

        var searchResult = await journal.findEntriesByTags(["with", "lots", "of"])

        assert.equal(searchResult.length, 1)
        assert.equal(searchResult[0].id, testEntry.id)
    })
})

describe("Add/Remove tags", function() {
    var testEntry

    before(async function() {
        testEntry = await journal.createEntry("Entry #with #lots #of custom tags")
    })

    it("Attempt and fail to delete base tags", async function() {
        // Should just be one line. Figure out how assert.throws works
        try {
            await journal.removeTag(testEntry.id, ["with", "lots", "of"])
            throw "No error"
        } catch (err) {
            if (err != "Some tags can not be deleted") {
                throw "Wrong error: " + err
            }
        }
    })

    it("Create new tags", async function() {
        const testTags = ["Some", "additional", "tags"]

        await journal.addTag(testEntry.id, testTags)

        const tags = await journal.getTags(testEntry.id)

        tags.forEach(tag => { if (!tag.baseTag) assert(testTags.includes(tag.tag_text))})
    })

    it("Remove added tags", async function() {
        const testTags = ["Some", "additional", "tags"]

        await journal.removeTag(testEntry.id, testTags)

        const tags = await journal.getTags(testEntry.id)
    })
})
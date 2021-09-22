import assert, { doesNotThrow } from 'assert';
import Boswell from "../index.js";
import fs from "fs";
import lodash from "lodash";
import { describe } from 'mocha';

if (fs.existsSync("test/test.db")) fs.unlinkSync("test/test.db")

var journal = new Boswell("test/test.db")

describe("Test helper functions", function() {
    describe("extractTagsFromString", function() {
        it("Extract Tags From Text", function() {
            assert(lodash.isEqual(
                journal.extractTagsFromString("Entry #with #lots #of custom tags"),
                ["with", "lots", "of"]
            ))
        })
        it("Empty String", function() {
            assert.equal(journal.extractTagsFromString(""), null)
        })
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
    describe("by Time of Entry", function() {
        var testEntries = [
            "Testing getting by time of entry 1 #lorem #ipsum",
            "Testing getting by time of entry 2 #lorem #ipsum",
            "Testing getting by time of entry 3 #lorem #ipsum",
            "Testing getting by time of entry 4 #lorem #ipsum",
            "Testing getting by time of entry 5 #lorem #ipsum",
            "Testing getting by time of entry 6 #lorem #ipsum",            
        ]
        before(async function() {
            for (var entry in testEntries) {
                testEntries[entry] = await journal.createEntry(testEntries[entry])
            }
        })
        it("the 5 results before a specified time", async function() {
            const searchResults = await journal.findEntries(testEntries[4].created_at, 5) // "desc" mode is default
            var expectedSearchResults = [...testEntries]
            expectedSearchResults.pop()
            expectedSearchResults.reverse()
    
            assert(lodash.isEqual(searchResults, expectedSearchResults))
        })
        it("the 2 results before a specified time", async function() {
            const searchResults = await journal.findEntries(testEntries[4].created_at, 2) // "desc" mode is default
            var expectedSearchResults = [...testEntries]
            expectedSearchResults = expectedSearchResults.slice(3, 5) // aka items with index 3 and 4
            expectedSearchResults.reverse()
    
            assert(lodash.isEqual(searchResults, expectedSearchResults))
        })
        it ("the 5 results after a specified time", async function() {
            const searchResults = await journal.findEntries(testEntries[0].created_at, 5, true)
            
            var expectedSearchResults = [...testEntries]
            expectedSearchResults.pop()
            expectedSearchResults.reverse()

            assert(lodash.isEqual(searchResults, expectedSearchResults))
        })
        it ("the 2 results after a specified time", async function() {
            const searchResults = await journal.findEntries(testEntries[0].created_at, 2, true)
            
            var expectedSearchResults = [...testEntries]
            expectedSearchResults = expectedSearchResults.slice(0, 2) // aka
            expectedSearchResults.reverse()

            assert(lodash.isEqual(searchResults, expectedSearchResults))
        })
        it("the 5 results before a specified time but in ascending order", async function() {
            const searchResults = await journal.findEntries(testEntries[4].created_at, 5, false, true) // "desc" mode is default
            var expectedSearchResults = [...testEntries]
            expectedSearchResults.pop()
    
            assert(lodash.isEqual(searchResults, expectedSearchResults))
        })
        it ("the 5 results after a specified time but in ascending order", async function() {
            const searchResults = await journal.findEntries(testEntries[0].created_at, 5, true, true)
            
            var expectedSearchResults = [...testEntries]
            expectedSearchResults.pop()

            assert(lodash.isEqual(searchResults, expectedSearchResults))
        })
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
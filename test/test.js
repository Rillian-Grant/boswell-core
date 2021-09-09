import assert, { doesNotThrow } from 'assert';
import Journal from "../index.js";

var journal = new Journal(":memory:")

// Return promise in test just waits for error
before(async function() {
    await journal
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
        var testEntryID = await journal.createEntry("A entry that links to another entry (#1) and is in two catagories: #tests #has-links")
        const entry = await journal.getEntry(testEntryID)

        assert.equal(entry.content, "A entry that links to another entry (#1) and is in two catagories: #tests #has-links")
        assert.equal(entry.id, testEntryID)
        assert(entry.created_at <= Date.now())
    })
})

describe("Find entries", function() {
    it("by Tags", async function() {
        var testEntryID = await journal.createEntry("Entry #with #lots #of custom tags")

        var searchResult = await journal.findEntries("#with #lots #of")

        assert.equal(searchResult.length, 1)
        assert.equal(searchResult[0], testEntryID)
    })
})

after(function(done) {
    // Close connection
    setTimeout(() => done(), 1000)
})
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

after(function(done) {
    // Close connection
    setTimeout(() => done(), 1000)
})
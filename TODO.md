# TODO

## Functions required

- [x] Create entry. Return the entry
- [x] Get an entry by id. Return the entry
- [x] Find entries by an array of tags. Return the entries
- [x] Extract tags from a string. Return array of tags.
- [skip] Find entries by a string. First use above to extract the tags and find all that match the tags. Then filter by words. Return the entries
- [x] Attach and remove a new tag from/to an entry
- [x] Get tags associated with an entry
- [x] Check obscure js
- [x] Get entries based on created_at. Allow specification of wether to get entries with higher or lower values and how many to get
- [ ] Refactor findEntriesByTags to use the above sorting for it's results

## Other

- Use SQL js string templates w/backticks
- Can I eliminate #setup with Proxy or similar
- Change all "SELECT * ..."
- Documentation (JSDoc)
- Try to replace for loops on arrays with something like forEach but that works with async (? for loops may be better for performance ?)
- Figure out assert.throws
- Create proper error objects
- Create classes for entry objects etc

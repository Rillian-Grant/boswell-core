# Design

## An Entry

```
{
    id,
    content,
    created_at
}
```

## Tags

An entry has both base tags and ones added after the fact, base tags cannot be changed but the entry can be hidden by adding a system tag later

## Methods

### createEntry

Create a new entry with the given text

### findEntries

Find entries with all the given tags. NEEDS FIXING: currently finds any entry with any of the given tags.

### getEntry

Get an entry

## Tags (/#(\w+)/g)

### Categorical (/#([a-zA-Z]+)/g)

Tags used to group entries together

### Link (/#(\d+)/g)

Tags used to reference another entry

### System (/#(\_\w+\_)/g)

Tags used to indicate that something should be hidden, for example.

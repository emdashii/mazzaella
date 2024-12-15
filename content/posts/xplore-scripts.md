+++
title = "xplore scripts"
author = ["Elliott Claus"]
date = 2022-05-30
tags = ["code", "javascript", "reference"]
categories = ["notes"]
draft = false
+++

## basic script {#basic-script}

```javascript
var count = 0;
var gr = new GlideRecord('incident');
gr.query();
while (gr.next()) {
    count++;
    gr.update();
}
gs.log('count: ' + count);
gr
```


## Useful Commands {#useful-commands}

```javascript
gr.deleteRecord();
gr.addQuery('active',false);
gr.addNotNullQuery('short_description');
```


## Create a New Record {#create-a-new-record}

```javascript
gr.initialize();
gr.insert();
```


## Count Records in a Query {#count-records-in-a-query}

```javascript
var gr = new GlideRecord('elements');
gr.addQuery('hierarchy', 'sys_id');
gr.query();
gs.log('Incident count: ' + gr.getRowCount());
gr
```


## Useful Links {#useful-links}

-   [GlideRecord Cheat Sheet](https://servicenowguru.com/scripting/gliderecord-query-cheat-sheet/)
-   [Dependency View](https://therockethq.gitbooks.io/servicenow1/content/index/index/fundamentals/fundamentals-concepts/cmdb/dependency-view.html)

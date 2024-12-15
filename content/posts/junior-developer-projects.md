+++
title = "projects overview"
author = ["Elliott Claus"]
date = 2022-07-08
tags = ["reference", "c sharp", "code", "python", "javascript"]
categories = ["projects"]
draft = false
+++

## projects overview {#projects-overview}


### coding projects {#coding-projects}


#### Junior Developer at [AppVizo](https:appvizo.com/) {#junior-developer-at-appvizo--https-appvizo-dot-com}


#### Started February 2022 | Projects I've worked on: {#started-february-2022-projects-i-ve-worked-on}

Note from future me: My junior role ended when I took a fulltime position at BenefitFirst September 2022.


### Movement Measures. {#movement-measures-dot}

This project was written using C# and WPF.

wrote a program in C# using WPF


#### Project Intro: {#project-intro}

This client asked for a desktop app that could overlay any zoom or
other type of conference call. Physical therapists are doing more
of their work online, and as part of that, they need to measure
angles to see if a client is improving in flexibility. This is
especially difficult over zoom. Physical therapists had been using
protractors on the computer screen to get angles.


#### What I did: {#what-i-did}

What I did: I built a wpf app that lets you place and drag three
points, and displays the angle between the points. This was my
first project during my internship at AppVizo. The client was
happy with this, and has asked for more work, so he can get a
patent. I am currently adding features that will make the app
patentable.

**tl;dr** I wrote a WPF app for a physical therapy client.


#### Skills demonstrated: {#skills-demonstrated}

-   Working with clients
-   App design sessions
-   Code reviews
-   Building a WPF app, using C# and XAML


### Kraken ServiceNow {#kraken-servicenow}

This project was written in JavaScript, inside ServiceNow.

wrote javascript scripts to edit servicenow records


#### Project Overview: {#project-overview}

ServiceNow is a behemoth platform. They provide templates to
create enterprise apps, mostly for detailing organizations.
AppVizo was contracted to build a networking app. This app tracks
and details people, events, equipment, and connections between
everything. It provides a detailed picture of the organization, so
if something goes wrong, a user can find the problem and fix it
easily. It tracks the status of networking equipment, and the
connections between different pieces of equipment.

As part of building this application on the ServiceNow platform,
we put in dummy data, so that the client can see what it would
look like if they were using the application. This dummy data
included multiple sites, each of which consisted of buildings,
which contain rooms (specifically server rooms), which contain
racks, which contain networking equipment. Every server and router
communicates with at least one piece of the network. Each is
powered redundantly. All this is modeled in the ServiceNow app.


#### What I did: {#what-i-did}

A lot of what I did involved entering data. ServiceNow provides a
couple of ways to enter data. One is to format an excel document
to be precisely the way they will recognize it, and then upload
it. This way, unfortunately, does not allow for any connections
between different pieces of data. So instead, ServiceNow has an
Xplore page, where you can write JavaScript (in ES5) that can
access and update tables in their database. With this method, you
can call up two different tables, and find specific items in each
to reference in a third table.

For example, say you have a router and a server that are linked.
You could search the router table, the server table, and then link
them in the CMDB, which is a specific third table. In the linking,
you can specify which port and IP address each uses. That way, if
something goes wrong with the server, you can easily look up where
it gets its data, and find fixes easier.

With Javascript, I have probably made over five thousand
records/changes to records in AppVizo's ServiceNow developer
instance. Some of these were creating records from scratch and
generating random data. Some of these, the data was already
generated, and I had to enter it in a way where every record
connected to the correct thing.

**tl;dr** I wrote lots of JavaScript to update ServiceNow's
database.


#### Skills demonstrated: {#skills-demonstrated}

-   Detailed data entry
-   Understanding a complex network
-   ServiceNow server calls using GlideRecords
-   Referencing different types of elements using JavaScript
-   Code base: JavaScript ES5

{{< figure src="/junior-developer-projects/xplore.png" >}}


### P1Moto {#p1moto}

This project involved code refactoring in Python.
refactored a client's python codebase


#### Project Overview: {#project-overview}

AppVizo had previously written a webscraper for this client. It
scraped a website, edited the returned data, and then outputted a
csv file. This ran daily on a server. The client added
functionality, scraping multiple other websites. This added
complexity, until it was difficult to tell what part of the
program did what. There were multiple files hundreds of lines of
code long. Some of them were redundant, but it was unclear what
was actually used and important.

The client came back to AppVizo and asked for additional
functionality, scraping another website, as well as combining all
the different scrapes into a single file. (Each one was outputting
a separate csv file.)


#### What I did: {#what-i-did}

I read through all the current code and figured out what each
piece did, and which pieces were copies of functions from other
files. I added a

`def main()`

and

`if __name__ == "__main__":
    main()`

to each file, and then called the relevant ones from a main.py
file. This added clarity to what ran when.

One of the other programmers added SQLite to the program. After
that was done, I added that functionality to all the other files,
so that everything outputted to a SQLite file, which at the end
put out a single csv file. This helped the code to run faster, and
made it easier to debug if any of the web scrapes failed. It also
helped to format each scrape into a similar data format, which the
client needed.

**tl;dr** Refactored a client's python code and added
additional functionality using pandas and SQLite.


#### Skills demonstrated: {#skills-demonstrated}

-   Managing complexity as projects get bigger and expand in scope
-   Refactoring an existing codebase
-   Python pandas and SQLite integration
-   Working with a client when what they ask for requires more work than they realize
-   Working with other programmers, integrating other people's code
-   Git: merging, branches, and pull/push
-   Code base: Python

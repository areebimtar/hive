# Hive Database Schema

The html directory has a browsable documentation of the hive database including a DB
diagram and information about constraints, keys, etc.

It's generated against a running instance of the database.

## How to see the data model- EASY

* Check out this repo and simply open html/index.html
* you don't need to run a webserver, it should work just fine from the file system


## How to regenerate the html- UGLY (but easy)

Setting up to run this is a bit of a pain in the ass. This doc has a walkthrough:
http://harrymoreno.com/2016/05/24/running-schemaspy-for-postgres.html

I (boon) didn't follow it, though. I did the following on my OS X Sierra MacBook:

1. [Install graphviz](http://www.graphviz.org/) so that the executable called "dot" in your path.
I did this via  `brew install graphviz`
2. For OS X Sierra it was necessary to install the JDK 6, downloadable from here: https://support.apple.com/kb/DL1572
3. run `java -jar schemaSpy_5.0.0.jar -t pgsql -host localhost -db <dbName> -u <dbuser> -p <password> -o html -s public -norows  -dp postgresql-9.4.1212.jre6.jar`


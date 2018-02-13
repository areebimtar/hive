# Deploying channels
During each setup deployment (for each new DB), rabbit queues and exchanges needs to be created. Web server will be publishing new messages only into exchanges. These exchanges then route message to appropriete queue which are prefixed by db name.

## Exchanges
These exchanges are common for all setups. And need to be created only once. Provided schema (`initial-schema.json`) creates these exchanges as well. For creating additional setup, either remove them from schema or use force flag (`--force` or `-f`). **These exchanges needs to be created without prexix!**
### manager-tasks - Etsy
This exchange is used for scheduling new sync shop. Usually right after user authenticates new shop
### apply-operations - Etsy
This exchange is used for scheduling worker to apply bulk edit operations
### commands - Shopify
This exchange is used as main entry point to shopify handlers. Both sync shop and apply operations tasks are pushed into this exchange.

## Queues
Each setup has its own set of queues. These queues are prfixed by db name. Schema is provided in `etsy-schema.json`

## Deploy
All schema are created via [bunny-migrate](https://github.com/salsita/bunny-migrate) tool. Bellow is expamle for deploying **db1** setup
### Bunny-migrate initialization (run only once)
`bunny-migrate init --uri <bunny_uri> --bunny-x <admin_queue>`
### Deploying initial schema
`bunny-migrate add --uri <bunny_uri> --bunny-x <admin_queue> --prefix "" --schema initial-schema.json`
### Deploying new Etsy setup
`bunny-migrate add --uri <bunny_uri> --bunny-x <admin_queue> --prefix db1 --schema etsy-schema.json`
### Adding routing rules
```
bunny-migrate add-rule --uri <bunny_uri> --bunny-x <admin_queue> --prefix 12345 source unique-prefix-router --destination channel-router --key db1-stable
```
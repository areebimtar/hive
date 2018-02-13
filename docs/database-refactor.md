Concept
---
Any fields defined in RELATIONAL_FIELDS in the ETSY constants.js file will be stored in `product_properties` instead
of `products`. Everything else should look the same.

Current State
---

Supported
===
 - Downloading product from Etsy
 - Deleting such a product
 - Deleting such a shop

Not supported
===
 - Retrieving such a field for our `web` interface
 - Uploading to Etsy
 - Updating such a field from our interface

Future
---
Once all of the above is supported, move `id` generation from `products` to `product_properties` and rename
`product_properties` to `products` and `products` to `product_properties`.
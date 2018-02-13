#!/bin/bash

for conf in `ls config.{etsy,shopify}.db*` ; do
  ./health-check.sh $conf
done


# Shopify channel - rabbitmq schema
## Overview
Shopify channel is implemented on top of messaging system (rabbitmq). Whole processing is divided into separate handlers. Each handler does just one thing (eg downloads/uploads product). All handlers are kept stateless (if possible). Stateless handlers can have multiple instances and they can be created/removed dynamically without the need of reconfiguring rabbit or changing code (just spawn/kill another (handler) process). Statefull handlers are either one of its kind or they have common shared state (eg in DB or redis)

![diagram](channels_rabbitmq_schema.svg)

## Message
each message has three parts, headers, body and stack
### headers
* **messageId** - UUID of the message
* **type** - used for routing in system (eg shopify.shopSync, shopify.downloadProduct)
* **shopId** - shop Id
* [total] - total amount of child tasks in curent task (operation)
### body
operation specific payload
### stack
Array holding relation between child task and its parrent (array of meassage headers)

## Flow
1. push message into **command queue** - this queue serves as buffer for scheduled tasks. Shop sync command or apply operations command are pushed directly into this queue.
2. assign **unique prefix** and **UUID** - this prefix determine routing on top most level. This feature is used during migrating to new rabbit schema and for A/B testing. Unique prefix also determine in which DB are stored used data. All messages are also enriched with UUID. This identificator is passed between all handlers. It is used for matching API responses to their requests and also durring aggregation of child tasks results
4. **unique prefix router** - route message to selected setup (eg beta testing setup on DB 2) routing is done based on unique prefix
5. **channel router** - wihin each setup, message is router to specific channel. Each channel then routes messages to appropriate operation handlers
5. **operation handler** - each operation handler can emit one or more messages either at once or after previous one finished. Operation handlers emit thre kinds of messages: API call message, aggregating message and command message. *API call message* contain information about upcoming API call including method, query params, payload , etc. It can be scheduled imediately or delayed in case of retry attempt. *Aggregating message* is used for gathering information about child tasks. When all child tasks are finished, parent handler receives message with child tasks results. _Command message_ schedules new top level operation (eg download/upload)
6. translate meassage to **API call** - enrich message with channel tokens and user credentials
7. message is processed by **rate limit** handler - in this handler, rate limit is applied to stream of messages. Rules for channel rate limit are applied to each message. If message is ready to be executed, it is passed through into buffer. If not, message is pushed into dead letter exchange queue with TTL set to most probable time when message can be processed (eg. it schedules message TTL in interval which will not break rate limit rules) and with higher priority. Dead letter message will be pushed back to rate limit handler. Since dead lettered message will have higher priority, it will be processed before new messages in queue. This will loosely keep order of messages (loose FIFO queue). Higher priority is not necessary as the aim is to keep _to API call_ queue always empty
8. **make an API call** - make actual API call and push result into _result queue_ with same headers as they came in. Results will also be pushed into _API response times_ queue. Rate limit handler will pull these messages and use them for calculating both TTL and whether another message can pass through or not.
9. **aggregate** message - responses from API calls are passed back to originating handler (via router from step 5). Handler then sends message with status to aggregor and is stored in shared state (DB). If message is part of task tree, aggregator check if all child tasks are completed. If so, aggregator will push new message to notify parent task. Recipient is chosen from message stack (pops value from stack). Aggregator is also responsible for clearing shared state.

## Adding new operation
adding new operation is simply adding new operation handler and its buffer and bind them to router exchange. Emitted messages go directly into appropriate queues

## Adding new channel
1. add new channel routing (with its operation handlers)
2. add rate limit and quota handlers

# Rabbitmq schema update
1. deploy new environment
2. create new schema with unique prefix and bind it to _unique prefix_ exchange
3. start assigning new prefix to messages so they will be routed to new schema
4. when all messages in old schema are processed, unbind old schema from _unique prefix_ exchange then remove old schema and kill old handler boxes

# A/B testing
A/B testing is similar to deploy new rabbit schema, but multiple schemas coexist with each other. Unique prefix assigned to message reflects user's group.


##### diagram was created by using [draw.io](https://draw.io)
##### diagram source [source](channels_rabbitmq_schema)
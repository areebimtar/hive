exports.up = function(pgm) {
  pgm.createIndex('task_queue', 'created_at', { name: 'task_queue_created_at', method: 'btree' });
  pgm.createIndex('task_queue', 'operation', { name: 'task_queue_operation', method: 'btree' });
  pgm.createIndex('task_queue', 'parent_id', { name: 'task_queue_parent_id', method: 'btree' });
  pgm.createIndex('task_queue', 'state', { name: 'task_queue_state', method: 'btree' });
};

exports.down = function(pgm) {
  pgm.dropIndex('task_queue', 'created_at', { name: 'task_queue_created_at' });
  pgm.dropIndex('task_queue', 'operation', { name: 'task_queue_operation' });
  pgm.dropIndex('task_queue', 'parent_id', { name: 'task_queue_parent_id' });
  pgm.dropIndex('task_queue', 'state', { name: 'task_queue_state' });
};

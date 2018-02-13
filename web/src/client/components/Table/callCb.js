import _ from 'lodash';


export default function(ctx, props, methodName, ...params) {
  // get config
  const config = props && props.config;
  // get callback method
  const method = config && config[methodName];

  // call callback in current context with config, context, and row data args
  if (_.isFunction(method)) {
    const { context, data } = props;
    return method.apply(ctx, [config, context, data].concat(params));
  }
  return undefined;
}

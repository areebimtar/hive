const React = require('react');
const ReactDOM = require('react-dom');
import createReactClass from 'create-react-class';

export default (WrappedComponent) => {
  const componentName = WrappedComponent.displayName || WrappedComponent.name;

  return createReactClass({
    displayName: `Wrapped${componentName}`,

    componentDidMount() {
      this.__wrappedComponent = this.refs.wrappedComponent;
      document.addEventListener('click', this.handleClickOutside, true);
    },

    componentWillUnmount() {
      document.removeEventListener('click', this.handleClickOutside, true);
    },

    render() {
      return <WrappedComponent {...this.props} ref="wrappedComponent" />;
    },

    handleClickOutside(e) {
      const domNode = ReactDOM.findDOMNode(this);
      if ((!domNode || !domNode.contains(e.target)) &&
        typeof this.refs.wrappedComponent.handleClickOutside === 'function') {
        this.refs.wrappedComponent.handleClickOutside(e);
      }
    }
  });
};

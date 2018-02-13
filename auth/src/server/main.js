import sr from './staticResources'; // eslint-disable-line no-unused-vars

import redirectServer from './redirectServer';
import authServer from './authServer';

function main() {
  redirectServer.start();
  authServer.start();
}

main();

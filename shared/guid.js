import uuidv4 from 'uuid/v4';

let GUID = 1;

export default function get() {
  return GUID++;
}

export function getNewMessageId() {
  return uuidv4();
}

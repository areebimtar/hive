// Immediately responds with 200 without any actual body
export default () => (req, res) => {
  res.status(200).end();
};

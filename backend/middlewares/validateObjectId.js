// middlewares/validateObjectId.js
const mongoose = require('mongoose');

module.exports = (req, res, next) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ message: 'Missing id parameter' });
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid id parameter' });
  }
  return next();
};

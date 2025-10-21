// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/userController');

// create user
router.post('/', controller.createUser);

// list with optional search & pagination
router.get('/', controller.listUsers);

// get by id
router.get('/:id', controller.getUserById);

// update
router.put('/:id', controller.updateUser);

// delete
router.delete('/:id', controller.deleteUser);

module.exports = router;

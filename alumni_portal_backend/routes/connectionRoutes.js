const express = require('express');
const { connectUser, listMyConnections, updateConnection, deleteConnection } = require('../controllers/connectionController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/:userId', authMiddleware, connectUser);
router.get('/', authMiddleware, listMyConnections);
router.put('/:id', authMiddleware, updateConnection);
router.delete('/:id', authMiddleware, deleteConnection);

module.exports = router;







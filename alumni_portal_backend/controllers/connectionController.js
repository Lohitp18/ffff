const Connection = require("../models/Connection");

// Send or accept a connection request (idempotent)
exports.connectUser = async (req, res) => {
  try {
    const requesterId = req.user._id;
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ message: 'userId is required' });
    if (requesterId.toString() === userId) return res.status(400).json({ message: 'Cannot connect to yourself' });

    let conn = await Connection.findOne({ requester: requesterId, recipient: userId });
    if (!conn) {
      conn = await Connection.create({ requester: requesterId, recipient: userId, status: 'pending' });
    }
    return res.status(201).json(conn);
  } catch (err) {
    console.error('connectUser error', err);
    return res.status(500).json({ message: 'Failed to create connection' });
  }
};

// List my connections (accepted or my pending outgoing/incoming)
exports.listMyConnections = async (req, res) => {
  try {
    const me = req.user._id;
    const connections = await Connection.find({
      $or: [{ requester: me }, { recipient: me }],
    })
      .populate('requester', 'name email')
      .populate('recipient', 'name email')
      .sort({ createdAt: -1 });
    return res.json(connections);
  } catch (err) {
    console.error('listMyConnections error', err);
    return res.status(500).json({ message: 'Failed to fetch connections' });
  }
};

// Accept or reject a connection
exports.updateConnection = async (req, res) => {
  try {
    const me = req.user._id;
    const { id } = req.params;
    const { status } = req.body;
    if (!['accepted', 'rejected'].includes(status)) return res.status(400).json({ message: 'Invalid status' });

    const conn = await Connection.findOneAndUpdate(
      { _id: id, recipient: me },
      { status },
      { new: true }
    );
    if (!conn) return res.status(404).json({ message: 'Connection not found' });
    return res.json(conn);
  } catch (err) {
    console.error('updateConnection error', err);
    return res.status(500).json({ message: 'Failed to update connection' });
  }
};

// Delete/Remove a connection (for disconnect or withdraw)
exports.deleteConnection = async (req, res) => {
  try {
    const me = req.user._id;
    const { id } = req.params;

    const conn = await Connection.findOne({
      _id: id,
      $or: [{ requester: me }, { recipient: me }]
    });

    if (!conn) {
      return res.status(404).json({ message: 'Connection not found' });
    }

    // Only allow delete if user is requester or recipient
    await Connection.findByIdAndDelete(id);
    return res.json({ message: 'Connection removed successfully' });
  } catch (err) {
    console.error('deleteConnection error', err);
    return res.status(500).json({ message: 'Failed to delete connection' });
  }
};






